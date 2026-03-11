import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Button, message } from 'antd';
import {
  DownloadOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  EyeOutlined,
  CopyOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImagePreview, { PreviewState } from './ImagePreview';

interface ImageDetails {
  id: number;
  url: string;
  prompt: string;
  created_at: string;
  user_email?: string;
}

interface SelectedImages {
  [key: number]: boolean;
}

const { Content } = Layout;

const API_URL = process.env.REACT_APP_API_URL ;

const CustomCheckbox = React.memo<{
  checked: boolean;
  onChange: () => void;
  className?: string;
}>(({ checked, onChange, className = '' }) => (
  <div className={`relative w-5 h-5 ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="peer absolute w-5 h-5 opacity-0 cursor-pointer z-10"
    />
    <div className="absolute inset-0 border-2 border-white/50 bg-white/10 rounded transition-all duration-200 peer-hover:border-white peer-checked:border-[#6366f1] peer-checked:bg-[#6366f1]">
      {checked && (
        <CheckOutlined className="w-full h-full text-white flex items-center justify-center" />
      )}
    </div>
  </div>
));

CustomCheckbox.displayName = 'CustomCheckbox';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { isAuth, username, email } = useAuth();
  const [images, setImages] = useState<ImageDetails[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImages>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState({
    isDownloading: false,
    isDeleting: false
  });
  const [preview, setPreview] = useState<PreviewState>({
    isOpen: false,
    imageUrl: '',
    scale: 1,
    position: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    isLoading: true
  });

  const fetchImages = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };

      if (email) {
        headers['X-User-Email'] = email;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL }/images/details`, {
        headers
      });
      const data = await response.json();
      if (data.images) {
        // Filter images for current user
        const userImages = data.images.filter((img: ImageDetails) =>
          img.user_email === email
        );
        setImages(userImages);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (!isAuth) {
      navigate('/login');
      return;
    }
    fetchImages();
  }, [isAuth, navigate, email]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'userEmail') {
        fetchImages();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSelectImage = useCallback((imageId: number) => {
    setSelectedImages(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSelected = images.every(img => selectedImages[img.id]);
    const newSelected: SelectedImages = {};
    images.forEach(img => {
      newSelected[img.id] = !allSelected;
    });
    setSelectedImages(newSelected);
  }, [images, selectedImages]);

  const handleBatchDownload = useCallback(async () => {
    const selectedIds = Object.entries(selectedImages)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id));

    setLoadingState(prev => ({ ...prev, isDownloading: true }));
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (email) {
        headers['X-User-Email'] = email;
      }

      const response = await fetch(`${API_URL}/images/batch-download`, {
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
  }, [selectedImages, email]);

  const handleBatchDelete = useCallback(async () => {
    const selectedIds = Object.entries(selectedImages)
      .filter(([_, selected]) => selected)
      .map(([id]) => Number(id));

    setLoadingState(prev => ({ ...prev, isDeleting: true }));
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (email) {
        headers['X-User-Email'] = email;
      }

      for (const id of selectedIds) {
        const response = await fetch(`${API_URL}/images/${id}`, {
          method: 'DELETE',
          headers
        });

        if (!response.ok) {
          throw new Error(`Failed to delete image with id ${id}`);
        }
      }

      setImages(current => current.filter(img => !selectedIds.includes(img.id)));
      setSelectedImages({});
      message.success('Selected images deleted successfully');
    } catch (err) {
      console.error('Error deleting images:', err);
      message.error('Failed to delete some images');
    } finally {
      setLoadingState(prev => ({ ...prev, isDeleting: false }));
    }
  }, [selectedImages, email]);

  const handleDownload = async (imageUrl: string) => {
    const link = document.createElement('a');
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      link.href = URL.createObjectURL(blob);
      link.download = 'generated-image.jpg';
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  const handlePreview = useCallback((imageUrl: string) => {
    setPreview({
      isOpen: true,
      imageUrl,
      scale: 1,
      position: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      isLoading: true
    });
  }, []);

  const closePreview = useCallback(() => {
    setPreview({
      isOpen: false,
      imageUrl: '',
      scale: 1,
      position: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      isLoading: true
    });
  }, []);

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

  const handleDelete = useCallback(async (imageId: number) => {
    setLoadingState(prev => ({ ...prev, isDeleting: true }));
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (email) {
        headers['X-User-Email'] = email;
      }

      const response = await fetch(`${API_URL}/images/${imageId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setImages(current => current.filter(img => img.id !== imageId));
        message.success('Image deleted successfully');
      } else {
        message.error('Failed to delete image');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      message.error('Failed to delete image');
    } finally {
      setLoadingState(prev => ({ ...prev, isDeleting: false }));
    }
  }, [email]);

  if (isLoading || loadingState.isDownloading || loadingState.isDeleting) {
    return (
      <div className="fixed inset-0 bg-[#1a1b2e] flex flex-col items-center justify-center z-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#383a5c] border-t-[#6366f1] rounded-full animate-spin"></div>
          <div className="w-16 h-16 border-4 border-[#383a5c] border-b-[#6366f1] rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
        <h2 className="text-white font-medium mt-6 text-lg">
          {loadingState.isDownloading
            ? 'Preparing download...'
            : loadingState.isDeleting
              ? 'Deleting image...'
              : 'Loading your gallery...'}
        </h2>
        <p className="text-[#8e8fb5] mt-2">
          {loadingState.isDownloading
            ? 'Creating zip file of selected images'
            : loadingState.isDeleting
              ? 'Removing selected image'
              : 'Please wait while we fetch your images'}
        </p>
      </div>
    );
  }

  return (
    <Layout className="min-h-screen bg-[#1a1b2e] relative pt-[56px]">
      <Content className="p-8 bg-[#1a1b2e] overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <ArrowLeftOutlined
                onClick={() => navigate('/')}
                className="mr-6 text-[#8e8fb5] hover:text-white cursor-pointer text-xl transition-colors"
              />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold text-white">Welcome, {username}</h1>
                  {images.length > 0 && (
                    <span className="px-3 py-1 bg-[#2a2c42] text-[#8e8fb5] rounded-full text-sm">
                      {images.length} {images.length === 1 ? 'Image' : 'Images'}
                    </span>
                  )}
                </div>
                <p className="text-[#8e8fb5]">Your personal gallery of generated images</p>
              </div>
            </div>
            {images.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <CustomCheckbox
                    checked={images.length > 0 && images.every(img => selectedImages[img.id])}
                    onChange={handleSelectAll}
                  />
                  {Object.values(selectedImages).filter(Boolean).length > 0 && (
                    <span className="px-3 py-1 bg-[#2a2c42] text-[#8e8fb5] rounded-full text-sm">
                      {Object.values(selectedImages).filter(Boolean).length} selected
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleBatchDownload}
                    icon={<DownloadOutlined className="text-[#22c55e]" />}
                    disabled={Object.values(selectedImages).filter(Boolean).length === 0}
                    className="bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1] disabled:opacity-40"
                  />
                  <Button
                    onClick={handleBatchDelete}
                    icon={<DeleteOutlined className="text-[#ef4444]" />}
                    disabled={Object.values(selectedImages).filter(Boolean).length === 0}
                    className="bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1] disabled:opacity-40"
                  />
                </div>
              </div>
            )}
          </div>

          {images.length === 0 ? (
            <div className="text-center py-16 bg-[#242538] rounded-lg border border-[#383a5c]">
              <h3 className="text-white text-lg font-medium mb-2">No Images Yet</h3>
              <p className="text-[#8e8fb5] mb-6">Start creating amazing images with AI</p>
              <Button
                type="primary"
                className="bg-[#6366f1] hover:bg-[#4f46e5] border-none"
                onClick={() => navigate('/')}
              >
                Create Your First Image
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="absolute top-2 left-2 z-10">
                    <CustomCheckbox
                      checked={selectedImages[image.id] || false}
                      onChange={() => handleSelectImage(image.id)}
                    />
                  </div>
                  <img
                    src={image.url}
                    alt={`Generated ${index + 1}`}
                    className="w-full rounded-lg border-2 border-[#383a5c] transition-all duration-300 hover:border-[#6366f1]"
                  />
                  <div className="absolute inset-0 backdrop-blur-sm bg-[#1a1b2e]/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-white text-sm px-4 mb-4 line-clamp-3 text-center">
                        {image.prompt}
                      </p>
                      <div className="flex items-center gap-3 p-2 bg-[#242538]/80 backdrop-blur-sm rounded-xl">
                        <Button
                          onClick={() => handlePreview(image.url)}
                          icon={<EyeOutlined className="text-lg text-[#6366f1]" />}
                          className="h-8 w-8 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white border-none rounded-lg transform hover:scale-110 transition-all"
                          title="Preview image"
                        />
                        <Button
                          onClick={() => handleCopyPrompt(image.prompt)}
                          icon={<CopyOutlined className="text-lg text-[#8b5cf6]" />}
                          className="h-8 w-8 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white border-none rounded-lg transform hover:scale-110 transition-all"
                          title="Copy prompt"
                        />
                        <Button
                          onClick={() => handleDownload(image.url)}
                          icon={<DownloadOutlined className="text-lg text-[#22c55e]" />}
                          className="h-8 w-8 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white border-none rounded-lg transform hover:scale-110 transition-all"
                          title="Download image"
                        />
                        <Button
                          onClick={() => handleDelete(image.id)}
                          icon={<DeleteOutlined className="text-lg text-[#ef4444]" />}
                          className="h-8 w-8 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white border-none rounded-lg transform hover:scale-110 transition-all"
                          title="Delete image"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Content>
      {preview.isOpen && (
        <ImagePreview
          preview={preview}
          setPreview={setPreview}
          allImages={images.map(img => img.url)}
          closePreview={closePreview}
        />
      )}
    </Layout>
  );
};

export default Profile;
