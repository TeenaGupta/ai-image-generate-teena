import React, { useState, memo } from 'react';
import { Layout, Input, Button } from 'antd';
import {
  SendOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  CopyOutlined,
  EyeOutlined,
  CheckOutlined
} from '@ant-design/icons';
import ImagePreview, { PreviewState } from './ImagePreview';

const { Content } = Layout;
const { TextArea } = Input;

interface MainContentProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleClear: () => void;
  handleGenerateMagicPrompt: () => Promise<void>;
  handleDownload: (imageUrl: string, format?: string) => Promise<void>;
  handleCopyPrompt: (prompt: string) => void;
  isLoading: boolean;
  error: string | null;
  generatedImage: string[];
  previousImages: Array<{ id: number; url: string; prompt: string; created_at: string; model_type?: string }>;
  modelType: string;
  imageFormat: string;
  numImages: number;
  isAuth: boolean;
  onImageError: (image: { id: number; url: string; prompt: string; created_at: string }) => void;
  onDeleteGeneratedImage: (index: number) => void;
  onDeletePreviousImage: (image: { id: number; url: string; prompt: string; created_at: string }) => void;
  selectedImages: { [key: number]: boolean };
  onSelectImage: (imageId: number) => void;
  onSelectAll: () => void;
  onBatchDownload: () => Promise<void>;
  onBatchDelete: () => Promise<void>;
}

const CustomCheckbox = memo<{
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

const MainContent = memo<MainContentProps>(({
  prompt,
  setPrompt,
  handleSubmit,
  handleClear,
  handleGenerateMagicPrompt,
  handleDownload,
  isLoading,
  error,
  generatedImage,
  previousImages,
  numImages,
  handleCopyPrompt,
  onImageError,
  onDeleteGeneratedImage,
  onDeletePreviousImage,
  imageFormat,
  selectedImages,
  onSelectImage,
  onSelectAll,
  onBatchDownload,
  onBatchDelete,
  modelType
}) => {
  const allImages = [...generatedImage, ...previousImages.map(img => img.url)];
  const [preview, setPreview] = useState<PreviewState>({
    isOpen: false,
    imageUrl: '',
    scale: 1,
    position: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    isLoading: true
  });

  const handlePreview = (imageUrl: string) => {
    setPreview({
      isOpen: true,
      imageUrl,
      scale: 1,
      position: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      isLoading: true
    });
  };

  const closePreview = () => {
    setPreview({
      isOpen: false,
      imageUrl: '',
      scale: 1,
      position: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      isLoading: true
    });
  };

  return (
    <Content className="p-8 bg-[#1a1b2e]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <h2 className="text-xl font-semibold text-white">Create Your Image</h2>
          </div>
          <p className="text-[#8e8fb5] mb-4">
            Be descriptive! Include details about style, mood, colors, and composition.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="space-y-4">
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: A serene landscape at sunset with mountains reflected in a calm lake, digital art style with vibrant colors..."
              autoSize={{ minRows: 3, maxRows: 6 }}
              className="bg-[#2a2c42] border-[#383a5c] text-white placeholder-[#8e8fb5] rounded-lg focus:border-[#6366f1] focus:bg-[#2f3147] hover:bg-[#2f3147] hover:border-[#6366f1] transition-all duration-200 text-base"
            />
          </div>
          <div className="flex space-x-4 mt-6">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              disabled={!prompt.trim()}
              icon={<SendOutlined />}
              className={`text-white flex-1 h-11 ${prompt.trim()
                  ? 'bg-[#6366f1] hover:bg-[#4f46e5]'
                  : 'cursor-not-allowed opacity-40 disabledBtn'
                }`}
            >
              Generate {numImages > 1 ? `${numImages} Images` : 'Image'}
            </Button>
            <Button
              onClick={handleGenerateMagicPrompt}
              icon={<ExperimentOutlined />}
              disabled={!prompt.trim()}
              className={`h-11 ${prompt.trim()
                  ? 'bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1]'
                  : 'cursor-not-allowed opacity-40 disabledBtn'
                }`}
            >
              Magic Prompt
            </Button>
            <Button
              onClick={handleClear}
              icon={<DeleteOutlined />}
              disabled={!prompt.trim()}
              className={`h-11 ${prompt.trim()
                  ? 'bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1]'
                  : 'cursor-not-allowed opacity-40 disabledBtn'
                }`}
            />
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {generatedImage.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6 text-white">Generated Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedImage.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Generated ${index + 1}`}
                    className="w-full rounded-lg border-2 border-[#383a5c] transition-all duration-300 hover:border-[#6366f1] cursor-pointer"
                    onClick={() => handlePreview(url)}
                  />
                  <div className="absolute inset-0 backdrop-blur-sm bg-[#1a1b2e]/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="flex items-center gap-3 p-2 bg-[#242538]/80 backdrop-blur-sm rounded-xl">
                        <Button
                          onClick={() => handlePreview(url)}
                          icon={<EyeOutlined className="text-lg text-[#6366f1]" />}
                          className="h-8 w-8 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white border-none rounded-lg transform hover:scale-110 transition-all"
                          title="Preview image"
                        />
                        <Button
                          onClick={() => handleDownload(url, imageFormat || 'jpg')}
                          icon={<DownloadOutlined className="text-lg text-[#22c55e]" />}
                          className="h-8 w-8 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white border-none rounded-lg transform hover:scale-110 transition-all"
                          title="Download image"
                        />
                        <Button
                          onClick={() => onDeleteGeneratedImage(index)}
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
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-white">Previous Generations</h2>
              {previousImages.length > 0 && (
              <div className="flex items-center gap-3">
                <CustomCheckbox
                  checked={previousImages.length > 0 && previousImages.every(img => selectedImages[img.id])}
                  onChange={onSelectAll}
                />
                {Object.values(selectedImages).filter(Boolean).length > 0 && (
                  <span className="px-3 py-1 bg-[#2a2c42] text-[#8e8fb5] rounded-full text-sm">
                    {Object.values(selectedImages).filter(Boolean).length} selected
                  </span>
                )}
              </div>
              )}
            </div>
            {previousImages.length > 0 && (
              <div className="flex gap-3">
                <Button
                  onClick={onBatchDownload}
                  icon={<DownloadOutlined className="text-[#22c55e]" />}
                  disabled={Object.values(selectedImages).filter(Boolean).length === 0}
                  className="bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1] disabled:opacity-40"
                />
                <Button
                  onClick={onBatchDelete}
                  icon={<DeleteOutlined className="text-[#ef4444]" />}
                  disabled={Object.values(selectedImages).filter(Boolean).length === 0}
                  className="bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1] disabled:opacity-40"
                />
              </div>
            )}
          </div>
          {previousImages.length > 0 ? (
            <div className="columns-1 md:columns-3 gap-6 space-y-6">
              {previousImages.map((image, index) => (
                <div key={index} className="relative group break-inside-avoid mb-6">
                  <div className="absolute top-2 left-2 z-10">
                    <CustomCheckbox
                      checked={selectedImages[image.id] || false}
                      onChange={() => onSelectImage(image.id)}
                    />
                  </div>
                  <img
                    src={image.url}
                    alt={`Previous ${index + 1}`}
                    className="w-full rounded-lg border-2 border-[#383a5c] transition-all duration-300 hover:border-[#6366f1] cursor-pointer"
                    onError={() => onImageError(image)}
                    onClick={() => handlePreview(image.url)}
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
                          onClick={() => handleDownload(image.url, image.url.split('.').pop() || 'jpg')}
                          icon={<DownloadOutlined className="text-lg text-[#22c55e]" />}
                          className="h-8 w-8 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white border-none rounded-lg transform hover:scale-110 transition-all"
                          title="Download image"
                        />
                        <Button
                          onClick={() => onDeletePreviousImage(image)}
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
          ) : (
            <div className="bg-[#2a2c42] border border-[#383a5c] rounded-lg p-8 text-center">
              <p className="text-[#8e8fb5]">No previous generations yet. Create your first image!</p>
            </div>
          )}
        </div>
      </div>

      {preview.isOpen && (
        <ImagePreview
          preview={preview}
          setPreview={setPreview}
          allImages={allImages}
          closePreview={closePreview}
        />
      )}
    </Content>
  );
});

MainContent.displayName = 'MainContent';

export default MainContent;
