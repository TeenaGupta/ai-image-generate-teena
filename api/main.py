from dotenv import load_dotenv
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

# Relative imports for Vercel structure
from api.auth import router as auth_router, init_users_table
from .database import db
from .models import image_generator

# Load environment variables (Local only, Vercel uses Dashboard)
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

try:
    db.init_database() # Creates images table
    init_users_table() # Creates users table
except Exception as e:
    logger.error(f"Database setup failed: {e}")

app = FastAPI()

# CORS Configuration
origins = [
    "https://ai-image-generate-teenagupta.vercel.app",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Changed to True to support Auth
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# Hugging Face configuration
HUGGING_FACE_API_KEY = os.getenv("HUGGING_FACE_API_KEY")
MAGIC_PROMPT_URL = "https://api-inference.huggingface.co/models/Gustavosta/MagicPrompt-Stable-Diffusion"

headers = {
    "Authorization": f"Bearer {HUGGING_FACE_API_KEY}",
    "Content-Type": "application/json"
}

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
    model_type: str = 'stable-diffusion'

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "database": "connected"}

@app.post("/api/magic-prompt")
async def generate_magic_prompt(request: PromptRequest):
    try:
        response = requests.post(MAGIC_PROMPT_URL, headers=headers, json={"inputs": request.prompt})
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid response from Hugging Face API")
        
        output = response.json()
        if output and 'generated_text' in output[0]:
            return {"magicPrompt": output[0]['generated_text']}
        raise HTTPException(status_code=400, detail="Invalid response format")
    except Exception as e:
        logger.error(f"Magic Prompt failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/api/generate-image")
async def generate_image(image_prompt: ImagePrompt):
    try:
        new_images = []
        for i in range(image_prompt.num_images):
            # Generate image using your updated models.py logic
            cloudinary_url = image_generator.generate_image(
                prompt=image_prompt.prompt,
                model_type=image_prompt.model_type,
                aspect_ratio=image_prompt.aspect_ratio,
                image_format=image_prompt.image_format,
                headers=headers,
                reference_image=image_prompt.reference_image
            )
            
            # Store image details in Cloud MySQL
            db.store_image(
                url=cloudinary_url,
                prompt=image_prompt.prompt,
                user_email=image_prompt.user_email,
                model_type=image_prompt.model_type
            )
            new_images.append(cloudinary_url)
            
        return {"image": new_images}
    except Exception as e:
        logger.error(f"Error in generate_image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/images/{image_id}")
@app.delete("/api/images/{image_id}")
async def delete_image(image_id: int, request: Request):
    try:
        user_email = request.headers.get('X-User-Email')
        db.delete_image(image_id, user_email)
        return {"message": "Image deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting image: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting image")

@app.post("/api/images/batch-download")
async def batch_download_images(image_ids: List[int]):
    connection = None
    cursor = None
    try:
        connection = db.get_connection()
        cursor = connection.cursor(dictionary=True)
        
        format_strings = ','.join(['%s'] * len(image_ids))
        cursor.execute(f"SELECT url FROM images WHERE id IN ({format_strings})", tuple(image_ids))
        images = cursor.fetchall()
        
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for idx, image in enumerate(images):
                response = requests.get(image['url'])
                if response.status_code == 200:
                    extension = image['url'].split('.')[-1].split('?')[0] # Clean extension
                    zip_file.writestr(f'image_{idx + 1}.{extension}', response.content)
        
        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=imagix_images.zip"}
        )
    finally:
        if cursor: cursor.close()
        if connection: connection.close()

@app.get("/images/details")
@app.get("/api/images/details")
async def get_images_details(request: Request):
    try:
        user_email = request.headers.get('X-User-Email')
        images = db.get_images(user_email)
        return {"images": images}
    except Exception as e:
        logger.error(f"Error fetching images: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching images")

# Vercel doesn't use the __main__ block, but we keep it for local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)