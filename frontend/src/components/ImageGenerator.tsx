import React, { useState, useEffect, useCallback } from 'react';
import { Layout, message } from 'antd';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { useAuth } from '../context/AuthContext';

interface ImageDetails {
  id: number;
  url: string;
  prompt: string;
  created_at: string;
}

interface SelectedImages {
  [key: number]: boolean;
}

const ImageGenerator: React.FC = () => {
  const { isAuth, email } = useAuth();
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedImages, setSelectedImages] = useState<SelectedImages>({});
  const [numImages, setNumImages] = useState<number>(1);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string[]>([]);
  const [loadingState, setLoadingState] = useState({
    isGenerating: false,
    isEnhancing: false,
    isDownloading: false,
    isFetching: false
  });
  const [error, setError] = useState<string | null>(null);
  const [previousImages, setPreviousImages] = useState<ImageDetails[]>([]);
  const [imageFormat, setImageFormat] = useState('jpg');
  const [modelType, setModelType] = useState('stable-diffusion');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const { isGenerating, isEnhancing, isDownloading, isFetching } = loadingState;

  const handleReferenceImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveReferenceImage = useCallback(() => {
    setReferenceImage(null);
  }, []);

  const handleDeleteGeneratedImage = useCallback((indexToDelete: number) => {
    setGeneratedImage(current => current.filter((_, index) => index !== indexToDelete));
  }, []);

  const handleImageError = useCallback((failedImage: ImageDetails) => {
    setPreviousImages(current => current.filter(img => img.url !== failedImage.url));
  }, []);

  const handleSelectImage = useCallback((imageId: number) => {
    setSelectedImages(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSelected = previousImages.every(img => selectedImages[img.id]);
    const newSelected: SelectedImages = {};
    previousImages.forEach(img => {
      newSelected[img.id] = !allSelected;
    });
    setSelectedImages(newSelected);
  }, [previousImages, selectedImages]);

  const handleBatchDownload = useCallback(async () => {
    const selectedIds = Object.entries(selectedImages)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id));

    setLoadingState(prev => ({ ...prev, isDownloading: true }));
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (isAuth && email) {
        headers['X-User-Email'] = email;
      }

      const response = await fetch('http://localhost:8000/images/batch-download', {
        method: 'POST',
        headers,
        body: JSON.stringify(selectedIds)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'selected_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success('Images downloaded successfully');
      } else {
        throw new Error('Failed to download images');
      }
    } catch (err) {
      console.error('Error downloading images:', err);
      message.error('Failed to download images');
    } finally {
      setLoadingState(prev => ({ ...prev, isDownloading: false }));
    }
  }, [selectedImages, isAuth, email]);

  const handleBatchDelete = useCallback(async () => {
    const selectedIds = Object.entries(selectedImages)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id));

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (isAuth && email) {
        headers['X-User-Email'] = email;
      }

      for (const id of selectedIds) {
        const response = await fetch(`http://localhost:8000/images/${id}`, {
          method: 'DELETE',
          headers
        });

        if (!response.ok) {
          throw new Error(`Failed to delete image with id ${id}`);
        }
      }

      setPreviousImages(current =>
        current.filter(img => !selectedIds.includes(img.id))
      );
      setSelectedImages({});
      message.success('Selected images deleted successfully');
    } catch (err) {
      console.error('Error deleting images:', err);
      message.error('Failed to delete some images');
    }
  }, [selectedImages, isAuth, email]);

  const handleDeletePreviousImage = useCallback(async (imageToDelete: ImageDetails) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (isAuth && email) {
        headers['X-User-Email'] = email;
      }

      const response = await fetch(`http://localhost:8000/images/${imageToDelete.id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setPreviousImages(current => current.filter(img => img.url !== imageToDelete.url));
        message.success('Image deleted successfully');
      } else {
        message.error('Failed to delete image');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      message.error('Failed to delete image');
    }
  }, [isAuth, email]);

  const fetchImages = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, isFetching: true }));
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (isAuth && email) {
        headers['X-User-Email'] = email;
      }
      const response = await fetch('http://localhost:8000/images/details', { headers });
      const data = await response.json();
      if (data.images) {
        setPreviousImages(data.images);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
    } finally {
      setLoadingState(prev => ({ ...prev, isFetching: false }));
    }
  }, [isAuth, email]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'userEmail') {
        fetchImages();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchImages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image');
      return;
    }

    setGeneratedImage([]);
    setLoadingState(prev => ({ ...prev, isGenerating: true }));
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          num_images: numImages,
          image_format: imageFormat,
          model_type: modelType,
          user_email: isAuth ? email : null,
          reference_image: referenceImage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();

      if (data.image) {
        // Ensure data.image is always an array
        const images = Array.isArray(data.image) ? data.image : [data.image];
        setGeneratedImage(images);
        await fetchImages();
        message.success('Image generated successfully');
      } else {
        setError('No image URL returned');
      }
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image');
      message.error('Failed to generate image');
    } finally {
      setLoadingState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [prompt, aspectRatio, numImages, imageFormat, modelType, isAuth, email, referenceImage, fetchImages]);

  const handleClear = useCallback(() => {
    setPrompt('');
  }, []);

  const handleGenerateMagicPrompt = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt first');
      return;
    }

    setLoadingState(prev => ({ ...prev, isEnhancing: true }));
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/magic-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const data = await response.json();

      if (data.magicPrompt) {
        setPrompt(data.magicPrompt);
      } else {
        setError('Could not enhance the prompt');
      }
    } catch (error) {
      console.error('Error fetching magic prompt:', error);
      setError('Failed to enhance prompt. Please try again.');
    } finally {
      setLoadingState(prev => ({ ...prev, isEnhancing: false }));
    }
  }, [prompt]);

  const handleCopyPrompt = useCallback((promptText: string) => {
    navigator.clipboard.writeText(promptText)
      .then(() => {
        message.success('Prompt copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy prompt:', err);
        message.error('Failed to copy prompt');
      });
  }, []);

  const handleDownload = useCallback(async (imageUrl: string, format: string = imageFormat) => {
    const link = document.createElement('a');
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      link.href = URL.createObjectURL(blob);
      link.download = `generated-image.${format}`;
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  }, [imageFormat]);

  return (
    <Layout className="min-h-screen bg-[#1a1b2e] relative pt-[56px]">
      {(isGenerating || isEnhancing || isDownloading || isFetching) && (
        <div className="fixed inset-0 bg-[#1a1b2e]/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#242538] p-6 rounded-xl border border-[#383a5c] flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#383a5c] border-t-[#6366f1] rounded-full animate-spin"></div>
              <div className="w-16 h-16 border-4 border-[#383a5c] border-b-[#6366f1] rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            </div>
            <h2 className="text-white font-medium mt-6 text-lg">
              {isEnhancing
                ? 'Enhancing your prompt...'
                : isDownloading
                  ? 'Preparing download...'
                  : isFetching
                    ? 'Loading images...'
                    : 'Generating image...'}
            </h2>
            <p className="text-[#8e8fb5] mt-2">
              {isEnhancing
                ? 'Making your prompt more descriptive'
                : isDownloading
                  ? 'Creating zip file of selected images'
                  : isFetching
                    ? 'Please wait while we load your images'
                    : 'This might take a few seconds'}
            </p>
          </div>
        </div>
      )}
      <Layout className="bg-[#1a1b2e] min-h-[calc(100vh-56px)]">
        {!isFetching && (
          <>
            <Sidebar
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              numImages={numImages}
              setNumImages={setNumImages}
              imageFormat={imageFormat}
              setImageFormat={setImageFormat}
              modelType={modelType}
              setModelType={setModelType}
              handleSubmit={handleSubmit}
              prompt={prompt}
              referenceImage={referenceImage}
              onReferenceImageUpload={handleReferenceImageUpload}
              onRemoveReferenceImage={handleRemoveReferenceImage}
            />
          <MainContent
            prompt={prompt}
            setPrompt={setPrompt}
            handleSubmit={handleSubmit}
            handleClear={handleClear}
            handleGenerateMagicPrompt={handleGenerateMagicPrompt}
            handleDownload={handleDownload}
            isLoading={isGenerating}
            error={error}
            generatedImage={generatedImage}
            onDeleteGeneratedImage={handleDeleteGeneratedImage}
            previousImages={previousImages}
            onImageError={handleImageError}
            onDeletePreviousImage={handleDeletePreviousImage}
            imageFormat={imageFormat}
            numImages={numImages}
            isAuth={isAuth}
            handleCopyPrompt={handleCopyPrompt}
            selectedImages={selectedImages}
            onSelectImage={handleSelectImage}
            onSelectAll={handleSelectAll}
            onBatchDownload={handleBatchDownload}
            onBatchDelete={handleBatchDelete}
            modelType={modelType}
            />
          </>
        )}
      </Layout>
    </Layout>
  );
};

export default ImageGenerator;
