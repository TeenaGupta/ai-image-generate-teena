# Imagix AI

An advanced AI-powered text-to-image generation application that supports multiple AI models and provides a user-friendly interface for creating, saving, and managing AI-generated images.

## Project Structure

- `frontend/`: React TypeScript frontend application with Tailwind CSS
- `api/`: FastAPI Python backend application

## Features

- Generate images using multiple AI models ( Stable Diffusion, animagine)
- Magic prompt enhancement using Hugging Face API
- Save and manage generated images
- User authentication and profile management
- Responsive design for all devices
- Multiple aspect ratio support
- Batch image download
- Image history and favorites

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: MySQL
- **AI Models**: Hugging Face API
- **Image Storage**: Cloudinary
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.8+
- MySQL database
- Replicate API key
- Hugging Face API key
- Cloudinary account

### Environment Setup

1. Clone the repository:
   ```
   git clone https://github.com/TeenaGupta/ai-image-generate-teena.git
   cd ai-image-generate-teena
   ```

2. Create a `.env` file in the backend directory with the following variables:
   ```
   REPLICATE_API_TOKEN=your_replicate_api_token
   HUGGING_FACE_API_KEY=your_hugging_face_api_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # MySQL Database Configuration
   MYSQL_HOST=localhost
   MYSQL_USER=your_mysql_username
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=ai_image
   ```

### Installation

1. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

2. Install backend dependencies:
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   ```

3. Set up the database:
   ```
   python setup_db.py
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   python -m uvicorn main:app --reload
   ```

2. Start the frontend development server:
   ```
   cd frontend
   npm start
   ```

The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:8000`.

## API Endpoints

- `GET /api-token`: Get the Replicate API token
- `POST /magic-prompt`: Generate an enhanced prompt using Hugging Face
- `POST /generate-image`: Generate an image using the specified model
- `GET /images/details`: Get details of all saved images
- `DELETE /images/{image_id}`: Delete a specific image
- `POST /images/batch-download`: Download multiple images as a zip file
- `GET /predictions`: Get recent prediction prompts

## Troubleshooting

If you encounter issues with the backend not running properly:

1. Ensure all environment variables are correctly set in the `.env` file
2. Make sure MySQL is running and accessible with the provided credentials
3. Run the database setup script: `python setup_db.py`
4. Check that all required Python packages are installed
5. Verify that the Replicate API token and Hugging Face API key are valid

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
