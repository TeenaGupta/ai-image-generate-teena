import React from 'react';
import { Layout, Button, Select } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';

const { Sider } = Layout;
const { Option } = Select;

interface SidebarProps {
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  numImages: number;
  setNumImages: (num: number) => void;
  imageFormat: string;
  setImageFormat: (format: string) => void;
  modelType: string;
  setModelType: (type: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  referenceImage: string | null;
  onReferenceImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveReferenceImage: () => void;
  prompt: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  aspectRatio,
  setAspectRatio,
  numImages,
  setNumImages,
  imageFormat,
  setImageFormat,
  referenceImage,
  onReferenceImageUpload,
  onRemoveReferenceImage,
  modelType,
  setModelType,
  handleSubmit,
  prompt
}) => {
  const aspectRatios = [
    { label: 'Square', value: '1:1' },
    { label: 'Landscape', value: '16:9' },
    { label: 'Portrait', value: '4:3' },
    { label: 'Wide', value: '3:2' },
  ];

  return (
    <Sider width={280} className="sticky top-[56px] h-[calc(100vh-56px)] overflow-auto">
      <div className="p-8 bg-[#242538] border-r border-[#383a5c] shadow-[2px_0_12px_rgba(0,0,0,0.2)] h-full">
        <div className="space-y-6">
          <div>
            <h3 className="text-white text-sm font-medium mb-3">Aspect Ratio</h3>
            <Select
              value={aspectRatio}
              onChange={setAspectRatio}
              className="w-full aspect-ratio-select"
              popupClassName="dark-select-dropdown"
              dropdownStyle={{ 
                backgroundColor: '#2a2c42',
                borderColor: '#383a5c'
              }}
              style={{ height: 44 }}
            >
              {aspectRatios.map((ratio) => (
                <Option 
                  key={ratio.value} 
                  value={ratio.value}
                  className="text-[#8e8fb5] hover:text-white hover:bg-[#383a5c]"
                >
                  {ratio.label} ({ratio.value})
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <h3 className="text-white text-sm font-medium mb-3">Number of Images</h3>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((num) => (
                <Button
                  key={num}
                  onClick={() => setNumImages(num)}
                  className={`h-11 flex items-center justify-center ${numImages === num
                      ? 'bg-[#6366f1] text-white border-[#6366f1] hover:bg-[#4f46e5]'
                      : 'bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1]'
                    }`}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white text-sm font-medium mb-3">Image Format</h3>
            <div className="grid grid-cols-3 gap-3">
              {['jpg', 'png', 'webp'].map((format) => (
                <Button
                  key={format}
                  onClick={() => setImageFormat(format)}
                  className={`h-11 flex items-center justify-center uppercase ${
                    imageFormat === format
                      ? 'bg-[#6366f1] text-white border-[#6366f1] hover:bg-[#4f46e5]'
                      : 'bg-[#2a2c42] border-[#383a5c] text-[#8e8fb5] hover:text-white hover:border-[#6366f1]'
                  }`}
                >
                  {format}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white text-sm font-medium mb-3">Model Type</h3>
            <Select
              value={modelType}
              onChange={setModelType}
              className="w-full aspect-ratio-select"
              popupClassName="dark-select-dropdown"
              dropdownStyle={{ 
                backgroundColor: '#2a2c42',
                borderColor: '#383a5c'
              }}
              style={{ height: 44 }}
            >
              {[
                { value: 'sdxl', label: 'Stable Diffusion XL' },
                { value: 'playground', label: 'Playground AI' },
                // { value: 'playground', label: 'Playground AI v2.5 (High Quality)' }
              ].map((model) => (
                <Option 
                  key={model.value} 
                  value={model.value}
                  className="text-[#8e8fb5] hover:text-white hover:bg-[#383a5c]"
                >
                  {model.label}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <h3 className="text-white text-sm font-medium mb-3">Reference Image</h3>
            <div className="relative group">
              <input
                type="file"
                onChange={onReferenceImageUpload}
                accept="image/*"
                className="hidden"
                id="reference-image-upload"
              />
              {referenceImage ? (
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="w-full h-48 object-cover rounded-lg border-2 border-[#383a5c] transition-all duration-300 group-hover:border-[#6366f1]"
                  />
                  <div className="absolute inset-0 bg-[#1a1b2e]/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <Button
                      onClick={onRemoveReferenceImage}
                      icon={<DeleteOutlined/>}
                      className=" flex items-center justify-center bg-[#ef4444]/80 hover:bg-[#ef4444] text-white border-none rounded-full transform hover:scale-110 transition-all shadow-lg"
                    />
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="reference-image-upload"
                  className="cursor-pointer block w-full h-48 border-2 border-dashed border-[#383a5c] rounded-lg group-hover:border-[#6366f1] transition-all duration-300 bg-[#2a2c42] group-hover:bg-[#2f3147] relative overflow-hidden"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center transform group-hover:scale-105 transition-all duration-300">
                    <div className="text-[#8e8fb5] mb-3 transform group-hover:scale-110 transition-all duration-300">
                      <UploadOutlined className="text-3xl group-hover:text-[#6366f1]" />
                    </div>
                    <span className="text-[#8e8fb5] text-sm group-hover:text-white transition-colors duration-300">Upload Reference Image</span>
                    <span className="text-[#8e8fb5]/60 text-xs mt-2 transition-colors duration-300">Click to browse</span>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </Sider>
  );
};

export default Sidebar;
