
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUploadIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MediaValidationIndicator } from './MediaValidationIndicator';
import { useMediaValidation } from '@/hooks/useMediaValidation';

interface MediaUploadHandlerProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  acceptedTypes?: string[];
  currentFiles?: { url: string; type: string }[];
  onRemove?: (index: number) => void;
}

export const MediaUploadHandler: React.FC<MediaUploadHandlerProps> = ({
  onUpload,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'video/*'],
  currentFiles = [],
  onRemove
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { validateMediaUrl } = useMediaValidation();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      await onUpload(acceptedFiles);
      
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxFiles - currentFiles.length,
    disabled: isUploading || currentFiles.length >= maxFiles
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'}
          ${isUploading || currentFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2">
          {isDragActive ? 'Drop files here' : 'Drag files here or click to upload'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {`${maxFiles - currentFiles.length} files remaining (${acceptedTypes.join(', ')})`}
        </p>
      </div>

      {isUploading && (
        <Progress value={uploadProgress} className="w-full" />
      )}

      {currentFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {currentFiles.map((file, index) => (
            <div key={index} className="relative group">
              {file.type.includes('image') ? (
                <img
                  src={file.url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={file.url}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
              
              <MediaValidationIndicator url={file.url} />
              
              {onRemove && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemove(index)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
