import logging
import os
from pyexpat import model
from typing import Dict, Any, List, Optional
from huggingface_hub import InferenceClient
import base64
from io import BytesIO
import requests
import cloudinary
import cloudinary.uploader
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

hugging_face_api_key = os.getenv("HUGGING_FACE_API_KEY")
client = InferenceClient(token=hugging_face_api_key)

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Set Replicate API token
replicate_api_token = os.getenv('REPLICATE_API_TOKEN')
if not replicate_api_token:
    logger.warning("REPLICATE_API_TOKEN not set")
else:
    logger.info(f"REPLICATE_API_TOKEN is set. First 4 characters: {replicate_api_token[:4]}")
    os.environ["REPLICATE_API_TOKEN"] = replicate_api_token

class ModelConfig:
    """Base class for model configurations"""
    def __init__(self, model_id: str):
        self.model_id = model_id

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        """Get model-specific parameters"""
        raise NotImplementedError

class StableDiffusionModel(ModelConfig):
    def __init__(self):
        super().__init__("stabilityai/stable-diffusion-xl-base-1.0")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        width, height = self._get_dimensions(aspect_ratio)
        return {
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_outputs": 1,
            "num_inference_steps": 50,
            "guidance_scale": 7.5,
            "scheduler": "K_EULER"
        }

    def _get_dimensions(self, aspect_ratio: str) -> tuple[int, int]:
        if aspect_ratio == "1:1":
            return 768, 768
        elif aspect_ratio == "16:9":
            return 768, 432
        elif aspect_ratio == "4:3":
            return 768, 576
        else:
            return 768, 768

class PlaygroundModel(ModelConfig):
    def __init__(self):
        super().__init__("playgroundai/playground-v2-1024px-aesthetic")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        width, height = self._get_dimensions(aspect_ratio)
        return {
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
        }

    def _get_dimensions(self, aspect_ratio: str) -> tuple[int, int]:
        if aspect_ratio == "1:1":
            return 1024, 1024
        elif aspect_ratio == "16:9":
            return 1024, 576
        elif aspect_ratio == "4:3":
            return 1024, 768
        else:
            return 1024, 1024

class ImageGenerator:
    """Handle image generation using different models"""
    def __init__(self):
        self.models = {
            'stable-diffusion': StableDiffusionModel(),
            'playground': PlaygroundModel(),
        }

    def generate_image(
        self,
        prompt: str,
        model_type: str,
        aspect_ratio: str,
        image_format: str,
        headers,
        reference_image: Optional[str] = None
    ) -> str:
        """Generate image using specified model"""
        try:
            model = self.models.get(model_type)
            
            if not model:
                raise HTTPException(status_code=400, detail=f"Unsupported model type: {model_type}")

            params = model.get_params(prompt, aspect_ratio)

            # Add reference image if provided
            if reference_image:
                image_data = base64.b64decode(reference_image.split(',')[1])
                temp_image = BytesIO(image_data)
                params["reference_image"] = temp_image

            # Generate image with Replicate
            try:
                logger.info(f"Starting image generation with model {model_type} ({model.model_id})")
                logger.info(f"Model parameters: {params}")
                
                image = client.text_to_image(
                    prompt,
                    model=model.model_id
                )

                image_bytes = BytesIO()
                image.save(image_bytes, format="PNG")
                image_bytes.seek(0)

            except Exception as e:
                logger.error(f"HuggingFace API error for {model_type}: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate image with {model_type} model: {str(e)}"
                )

            # Download and upload to Cloudinary
           
            image_data = image_bytes
            image_response = cloudinary.uploader.upload(image_data, format=image_format, folder="ai-image")
            cloudinary_url = image_response['secure_url']
            logger.info(f"Image uploaded to Cloudinary: {cloudinary_url}")

            return cloudinary_url

        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# Create singleton instance
image_generator = ImageGenerator()
