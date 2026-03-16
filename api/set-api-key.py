import os
import logging
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Hugging Face API Key
huggingface_api_key = os.getenv("HUGGINGFACE_API_KEY")

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
# Set the environment variable
api_token = os.environ.get('REPLICATE_API_TOKEN')

logger.info(f"REPLICATE_API_TOKEN has been set. First 4 characters: {api_token[:4]}")

if __name__ == "__main__":
    logger.info("Starting the main application...")
    # Run the main application as a separate process, ensuring it inherits the environment variables
    subprocess.run(["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], env=os.environ)
