import React, { useCallback, useEffect } from 'react';
import { Button, Spin } from 'antd';
import { 
  LeftOutlined, 
  RightOutlined, 
  CloseOutlined,
  LoadingOutlined 
} from '@ant-design/icons';

export interface PreviewState {
  isOpen: boolean;
  imageUrl: string;
  scale: number;
  position: { x: number; y: number };
  isDragging: boolean;
  dragStart: { x: number; y: number };
  isLoading: boolean;
}

interface ImagePreviewProps {
  preview: PreviewState;
  setPreview: React.Dispatch<React.SetStateAction<PreviewState>>;
  allImages: string[];
  closePreview: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = React.memo(({ 
  preview, 
  setPreview, 
  allImages, 
  closePreview 
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (preview.scale > 1) {
      setPreview(prev => ({
        ...prev,
        isDragging: true,
        dragStart: {
          x: e.clientX - prev.position.x,
          y: e.clientY - prev.position.y
        }
      }));
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (preview.isDragging) {
      setPreview(prev => ({
        ...prev,
        position: {
          x: e.clientX - prev.dragStart.x,
          y: e.clientY - prev.dragStart.y
        }
      }));
    }
  }, [preview.isDragging, setPreview]);

  const handleMouseUp = useCallback(() => {
    setPreview(prev => ({ ...prev, isDragging: false }));
  }, [setPreview]);

  useEffect(() => {
    if (preview.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [preview.isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!preview.isOpen) return;
      if (e.key === 'Escape') {
        closePreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preview.isOpen, closePreview]);

  useEffect(() => {
    document.body.style.overflow = preview.isOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [preview.isOpen]);

  const currentIndex = allImages.indexOf(preview.imageUrl);

  return (
    <div 
      className="fixed inset-0 backdrop-blur-lg bg-black/80 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePreview();
        }
      }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
        
        <Button
          onClick={() => {
            if (currentIndex > 0) {
              setPreview(prev => ({
                ...prev,
                imageUrl: allImages[currentIndex - 1],
                scale: 1,
                position: { x: 0, y: 0 },
                isLoading: true
              }));
            }
          }}
          disabled={currentIndex <= 0}
          icon={<LeftOutlined className="text-xl" />}
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white disabled:opacity-40 disabled:text-white disabled:cursor-not-allowed border border-[#383a5c] rounded-lg transform hover:scale-110 disabled:hover:scale-100 transition-all shadow-lg backdrop-blur-sm"
          title="Previous image"
        />

        <Button
          onClick={() => {
            if (currentIndex < allImages.length - 1) {
              setPreview(prev => ({
                ...prev,
                imageUrl: allImages[currentIndex + 1],
                scale: 1,
                position: { x: 0, y: 0 },
                isLoading: true
              }));
            }
          }}
          disabled={currentIndex >= allImages.length - 1}
          icon={<RightOutlined className="text-xl" />}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 flex items-center justify-center bg-[#2a2c42]/80 hover:bg-[#2a2c42] text-white disabled:opacity-40 disabled:cursor-not-allowed border border-[#383a5c] rounded-lg transform hover:scale-110 disabled:hover:scale-100 transition-all shadow-lg backdrop-blur-sm"
          title="Next image"
        />

        <Button
          onClick={closePreview}
          icon={<CloseOutlined className="text-lg" />}
          className="absolute top-4 right-4 flex items-center justify-center bg-[#242538]/100 hover:bg-[#242538] text-white border-none rounded-xl transform hover:scale-105 transition-all shadow-lg backdrop-blur-sm"
          title="Close preview"
        />

        <div className="relative">
          <div 
            className={`relative ${preview.isDragging ? 'cursor-grabbing' : preview.scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!preview.isDragging) {
                setPreview(prev => ({
                  ...prev,
                  scale: prev.scale > 1 ? 1 : 2,
                  position: { x: 0, y: 0 }
                }));
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (preview.scale > 1) {
                handleMouseDown(e);
              }
            }}
            style={{
              transform: `translate(${preview.position.x}px, ${preview.position.y}px) scale(${preview.scale})`,
              transition: preview.isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {preview.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              </div>
            )}
            <img
              src={preview.imageUrl}
              alt="Preview"
              className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
              draggable={false}
              onLoad={() => setPreview(prev => ({ ...prev, isLoading: false }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

ImagePreview.displayName = 'ImagePreview';

export default ImagePreview;
