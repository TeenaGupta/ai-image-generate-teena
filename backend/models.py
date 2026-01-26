import logging
import os
from typing import Dict, Any, List, Optional
import replicate
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

class FluxModel(ModelConfig):
    def __init__(self):
        super().__init__("black-forest-labs/flux-schnell")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        return {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "visibility": "public",
            "model": "2.0",
            "color_palette": "auto"
        }

class ClaudeModel(ModelConfig):
    def __init__(self):
        super().__init__("black-forest-labs/flux-dev")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        return {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "visibility": "public",
            "model": "2.0",
            "color_palette": "auto"
        }

class ImagenFastModel(ModelConfig):
    def __init__(self):
        super().__init__("google/imagen-3-fast")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        return {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "speed_mode": True,
            "quality": "standard"
        }

class ImagenModel(ModelConfig):
    def __init__(self):
        super().__init__("google/imagen-3")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        return {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "high_quality": True,
            "quality": "premium"
        }

class SDXLLightningModel(ModelConfig):
    def __init__(self):
        super().__init__("bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        width, height = self._get_dimensions(aspect_ratio)
        return {
            "prompt": prompt,
            "width": width,
            "height": height,
            "scheduler": "K_EULER",
            "num_outputs": 1,
            "guidance_scale": 0,
            "negative_prompt": "worst quality, low quality",
            "num_inference_steps": 4
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

class StableDiffusionModel(ModelConfig):
    def __init__(self):
        super().__init__("stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4")

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

class FluxProModel(ModelConfig):
    def __init__(self):
        super().__init__("black-forest-labs/flux-1.1-pro")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        return {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "visibility": "public",
            "model": "1.1",
            "color_palette": "auto"
        }

class AnimagineModel(ModelConfig):
    def __init__(self):
        super().__init__("cjwbw/animagine-xl-3.1:6afe2e6b27dad2d6f480b59195c221884b6acc589ff4d05ff0e5fc058690fbb9")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        width, height = self._get_dimensions(aspect_ratio)
        return {
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_outputs": 1,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "scheduler": "DPMSolverMultistep",
            "negative_prompt": "worst quality, low quality, normal quality"
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

class RecraftModel(ModelConfig):
    def __init__(self):
        super().__init__("recraft-ai/recraft-v3")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        width, height = self._get_dimensions(aspect_ratio)
        return {
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_outputs": 1,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "negative_prompt": "worst quality, low quality, blurry"
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

class KandinskyModel(ModelConfig):
    def __init__(self):
        super().__init__("ai-forever/kandinsky-2-1:a768f3c2e174c54b576cc4f222e789e161160403d0cd0ace41eeb9a0f8c8d5f8")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        width, height = self._get_dimensions(aspect_ratio)
        return {
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_outputs": 1,
            "num_inference_steps": 50,
            "guidance_scale": 7.5,
            "prior_cf_scale": 4,
            "prior_steps": "5",
            "negative_prompt": "low quality, worst quality, blurry"
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

class StickerMakerModel(ModelConfig):
    def __init__(self):
        super().__init__("fofr/sticker-maker:4acb778eb059772225ec213948f0660867b2e03f277448f18cf1800b96a65a1a")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        return {
            "prompt": prompt,
            "num_outputs": 1,
            "guidance_scale": 7.5,
            "negative_prompt": "ugly, blurry, poor quality, distorted, deformed",
            "style": "flat",
            "background": "none"
        }

class SDXLEmojiModel(ModelConfig):
    def __init__(self):
        super().__init__("fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        # Prepend "A TOK emoji of " to the prompt as required
        enhanced_prompt = f"A TOK emoji of {prompt}"
        return {
            "prompt": enhanced_prompt,
            "num_outputs": 1,
            "guidance_scale": 7.5,
            "negative_prompt": "ugly, blurry, poor quality, distorted, deformed",
            "style": "emoji"
        }

class LatentConsistencyModel(ModelConfig):
    def __init__(self):
        super().__init__("fofr/latent-consistency-model:683d19dc312f7a9f0428b04429a9ccefd28dbf7785fef083ad5cf991b65f406f")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        width, height = self._get_dimensions(aspect_ratio)
        return {
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_outputs": 1,
            "num_inference_steps": 8,
            "guidance_scale": 7.5,
            "negative_prompt": "ugly, blurry, poor quality, distorted, deformed"
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

class RecraftSVGModel(ModelConfig):
    def __init__(self):
        super().__init__("recraft-ai/recraft-v3-svg")

    def get_params(self, prompt: str, aspect_ratio: str, **kwargs) -> Dict[str, Any]:
        return {
            "prompt": prompt,
            "num_outputs": 1,
            "guidance_scale": 7.5,
            "negative_prompt": "ugly, blurry, poor quality, distorted, deformed"
        }

class ImageGenerator:
    """Handle image generation using different models"""
    def __init__(self):
        self.models = {
            'flux': FluxModel(),
            'Flux Dev': ClaudeModel(), 
            'imagen-fast': ImagenFastModel(),
            'imagen': ImagenModel(),
            'sdxl-lightning': SDXLLightningModel(),
            'stable-diffusion': StableDiffusionModel(),
            'flux-pro': FluxProModel(),
            'animagine': AnimagineModel(),
            'recraft': RecraftModel(),
            'kandinsky': KandinskyModel(),
            'sticker-maker': StickerMakerModel(),
            'sdxl-emoji': SDXLEmojiModel(),
            'lcm': LatentConsistencyModel(),
            'recraft-svg': RecraftSVGModel()
        }

    def generate_image(
        self,
        prompt: str,
        model_type: str,
        aspect_ratio: str,
        image_format: str,
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
                
                output = replicate.run(
                    model.model_id,
                    input=params
                )
                logger.info(f"Replicate API output for {model_type}: {output}")
                
                if not output:
                    raise ValueError(f"Empty output from {model_type} model")
            except Exception as e:
                logger.error(f"Replicate API error for {model_type}: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate image with {model_type} model: {str(e)}"
                )

            if not output:
                raise HTTPException(status_code=500, detail="Failed to generate image")

            # Get image URL from output
            if isinstance(output, list):
                image_url = output[0] if output else None
            else:
                image_url = output

            if not image_url:
                raise HTTPException(status_code=500, detail="No image URL in response")

            logger.info(f"Image URL from model: {image_url}")

            # Download and upload to Cloudinary
            response = requests.get(image_url)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to download generated image")

            image_data = BytesIO(response.content)
            image_response = cloudinary.uploader.upload(image_data, format=image_format, folder="ai-images")
            cloudinary_url = image_response['secure_url']
            logger.info(f"Image uploaded to Cloudinary: {cloudinary_url}")

            return cloudinary_url

        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# Create singleton instance
image_generator = ImageGenerator()
