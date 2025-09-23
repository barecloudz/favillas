import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  className?: string;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  className = '',
  label = 'Image'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Route to Express server for local development
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const expressPort = localStorage.getItem('express-dev-port') || '5000';
      const uploadUrl = isLocalDev ? `http://localhost:${expressPort}/api/image-upload-test` : '/api/image-upload-test';

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response:', responseText);
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      
      if (result.success) {
        // Add cache busting parameter to force browser to reload image
        const cacheBustedUrl = `${result.imageUrl}?v=${Date.now()}`;
        setPreview(cacheBustedUrl);
        onChange(result.imageUrl); // Store clean URL in database
        
        // Invalidate menu queries to refresh images across all tabs
        queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
        queryClient.invalidateQueries({ queryKey: ['/api/featured'] });

        // Force refetch immediately
        queryClient.refetchQueries({ queryKey: ['/api/menu'] });
        queryClient.refetchQueries({ queryKey: ['/api/featured'] });
        
        toast({
          title: 'Success',
          description: 'Image uploaded successfully!'
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlChange = (url: string) => {
    setPreview(url);
    onChange(url);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label}</Label>
      
      {/* Image Preview */}
      {preview && (
        <div className="relative w-full max-w-md">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
            onError={() => {
              setPreview('');
              onChange('');
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>
        
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* URL Input Alternative */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-500">Or enter image URL</Label>
        <Input
          type="text"
          placeholder="https://example.com/image.jpg or /images/menu/item.webp"
          value={preview}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
      </div>
    </div>
  );
};