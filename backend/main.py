import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import os
from typing import Dict, Optional, List
from io import BytesIO
import zipfile
import requests
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from auth import router as auth_router


# Load environment variables from .env file
load_dotenv()

from database import db
from models import image_generator

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://ai-image-generate-teenagupta.vercel.app",
]


app.include_router(auth_router, prefix="/auth", tags=["auth"])
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db.init_database()

# Define request models
class PromptRequest(BaseModel):
    prompt: str

class ImagePrompt(BaseModel):
    prompt: str
    aspect_ratio: str = "9:16"
    num_images: int = 1 
    image_format: str = 'jpg'
    user_email: Optional[str] = None
    reference_image: Optional[str] = None
    model_type: str = 'stable-diffusion'  # Default model type

# Hugging Face configuration
API_URL = "https://api-inference.huggingface.co/models/Gustavosta/MagicPrompt-Stable-Diffusion"
hugging_face_api_key = os.getenv("HUGGING_FACE_API_KEY")
headers = {
    "Authorization": f"Bearer {hugging_face_api_key}",
    "Content-Type": "application/json"
}
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

@app.get("/api-token")
async def get_api_token() -> Dict[str, str]:
    try:
        api_token = os.environ.get('REPLICATE_API_TOKEN')
        if not api_token or not api_token.strip():
            raise HTTPException(status_code=500, detail="API token not configured")
        return {"apiToken": api_token}
    except Exception as e:
        logger.error(f"Error getting API token: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting API token")

@app.post("/magic-prompt")
async def generate_magic_prompt(request: PromptRequest):
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": request.prompt})
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid response from Hugging Face API")
        
        output = response.json()
        if output and 'generated_text' in output[0]:
            return {"magicPrompt": output[0]['generated_text']}
        raise HTTPException(status_code=400, detail="Invalid response format")
    except Exception as e:
        logger.error(f"Hugging Face API call failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/generate-image")
async def generate_image(image_prompt: ImagePrompt):
    try:
        new_images = []
        for i in range(image_prompt.num_images):
            try:
                logger.info(f"Generating image with model: {image_prompt.model_type}")
                logger.info(f"Model parameters: prompt={image_prompt.prompt}, aspect_ratio={image_prompt.aspect_ratio}")
                
                # Generate image using the appropriate model
                cloudinary_url = image_generator.generate_image(
                    prompt=image_prompt.prompt,
                    model_type=image_prompt.model_type,
                    aspect_ratio=image_prompt.aspect_ratio,
                    image_format=image_prompt.image_format,
                    headers=headers,
                    reference_image=image_prompt.reference_image
                )
                
                logger.info(f"Image generated successfully with model {image_prompt.model_type}")
                
                # Store image details in database
                db.store_image(
                    url=cloudinary_url,
                    prompt=image_prompt.prompt,
                    user_email=image_prompt.user_email,
                    model_type=image_prompt.model_type
                )
                
                new_images.append(cloudinary_url)
            except Exception as e:
                logger.error(f"Error generating image {i + 1} with model {image_prompt.model_type}: {str(e)}")
                logger.error(f"Full error details: {repr(e)}")
                raise HTTPException(status_code=500, detail=f"Error generating image with {image_prompt.model_type} model: {str(e)}")
            
        return {"image": new_images}
    except Exception as e:
        logger.error(f"Error in generate_image endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/images/{image_id}")
async def delete_image(image_id: int, request: Request):
    try:
        user_email = request.headers.get('X-User-Email')
        db.delete_image(image_id, user_email)
        return {"message": "Image deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting image: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting image")

@app.post("/images/batch-download")
async def batch_download_images(image_ids: List[int]):
    connection = None
    cursor = None
    try:
        connection = db.get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get image URLs
        format_strings = ','.join(['%s'] * len(image_ids))
        cursor.execute(
            f"SELECT url FROM images WHERE id IN ({format_strings})",
            tuple(image_ids)
        )
        images = cursor.fetchall()
        
        # Create zip file
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for idx, image in enumerate(images):
                response = requests.get(image['url'])
                if response.status_code == 200:
                    extension = image['url'].split('.')[-1]
                    zip_file.writestr(f'image_{idx + 1}.{extension}', response.content)
        
        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=selected_images.zip"}
        )
    except Exception as e:
        logger.error(f"Error downloading images: {str(e)}")
        raise HTTPException(status_code=500, detail="Error downloading images")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.get("/images/details")
async def get_images_details(request: Request):
    try:
        user_email = request.headers.get('X-User-Email')
        images = db.get_images(user_email)
        return {"images": images}
    except Exception as e:
        logger.error(f"Error fetching images: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching images")

@app.get("/predictions")
async def get_recent_predictions() -> List[str]:
    try:
        predictions = db.get_recent_predictions()
        return predictions
    except Exception as e:
        logger.error(f"Error fetching predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching predictions")

@app.get("/")
async def display_image():
    try:
        images = db.get_images()
        return {"image": [img['url'] for img in images]}
    except Exception as e:
        logger.error(f"Error fetching images: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching images")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting the server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
