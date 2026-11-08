/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Calendar,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { NodeImageAttachment, AppTheme } from '../../types/diagram';
import { THEMES } from '../../utils/themeConfig';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: NodeImageAttachment | null;
  allImages?: NodeImageAttachment[];
  onSelectImage?: (img: NodeImageAttachment) => void;
  theme?: AppTheme;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  image,
  allImages = [],
  onSelectImage,
  theme = 'dark',
}) => {
  const [zoom, setZoom] = useState(1);
  const [currentImage, setCurrentImage] = useState<NodeImageAttachment | null>(image);

  useEffect(() => {
    setCurrentImage(image);
    setZoom(1);
  }, [image]);

  const imagesList = allImages.length > 0 ? allImages : currentImage ? [currentImage] : [];
  const currentIndex = imagesList.findIndex(
    img => (img.id && currentImage?.id && img.id === currentImage.id) || img.url === currentImage?.url
  );

  const handlePrev = useCallback(() => {
    if (imagesList.length <= 1) return;
    const prevIdx = (currentIndex - 1 + imagesList.length) % imagesList.length;
    const nextImg = imagesList[prevIdx];
    setCurrentImage(nextImg);
    onSelectImage?.(nextImg);
    setZoom(1);
  }, [imagesList, currentIndex, onSelectImage]);

  const handleNext = useCallback(() => {
    if (imagesList.length <= 1) return;
    const nextIdx = (currentIndex + 1) % imagesList.length;
    const nextImg = imagesList[nextIdx];
    setCurrentImage(nextImg);
    onSelectImage?.(nextImg);
    setZoom(1);
  }, [imagesList, currentIndex, onSelectImage]);

  // Handle keyboard events (Escape to close, Left/Right arrows for nav, +/- for zoom)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(z + 0.25, 3));
      } else if (e.key === '-') {
        setZoom(z => Math.max(z - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentImage) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentImage.url;
    a.download = currentImage.filename || currentImage.title || 'image.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      {/* Top Bar Header */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-slate-950/80 border-b border-slate-800 text-white z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate text-slate-100 flex items-center gap-2">
              <span>{currentImage.title || currentImage.filename}</span>
              {imagesList.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                  {currentIndex + 1} of {imagesList.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5">
              <span className="text-sky-400 truncate">{currentImage.filename}</span>
              {currentImage.size && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(currentImage.size)}</span>
                </>
              )}
              {currentImage.uploadedAt && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(currentImage.uploadedAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom In / Out / Reset */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-slate-300">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              className="p-1.5 hover:bg-slate-800 rounded hover:text-white transition-colors cursor-pointer"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-xs font-mono hover:bg-slate-800 rounded hover:text-white transition-colors cursor-pointer"
              title="Reset Zoom (100%)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              className="p-1.5 hover:bg-slate-800 rounded hover:text-white transition-colors cursor-pointer"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Open in new tab */}
          <a
            href={currentImage.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open raw image in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Download image to your computer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Lightbox Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {/* Previous Button */}
        {imagesList.length > 1 && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-2xl transition-all hover:scale-110 cursor-pointer"
            title="Previous image (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {imagesList.length > 1 && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-2xl transition-all hover:scale-110 cursor-pointer"
            title="Next image (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Centered Image Container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{ transform: `scale(${zoom})` }}
          onClick={e => e.stopPropagation()}
        >
          <img
            src={currentImage.url}
            alt={currentImage.title || currentImage.filename}
            className="max-w-[90vw] max-h-[82vh] object-contain rounded-xl shadow-2xl border border-slate-700/60 bg-slate-950/60"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) & Caption */}
      {(imagesList.length > 1 || currentImage.caption) && (
        <div
          className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-col items-center gap-2 z-10"
          onClick={e => e.stopPropagation()}
        >
          {currentImage.caption && (
            <p className="text-xs text-slate-300 max-w-2xl text-center italic">
              {currentImage.caption}
            </p>
          )}

          {imagesList.length > 1 && (
            <div className="flex items-center gap-2 max-w-3xl overflow-x-auto py-1 px-2">
              {imagesList.map((img, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => {
                      setCurrentImage(img);
                      onSelectImage?.(img);
                      setZoom(1);
                    }}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'border-sky-400 scale-105 ring-2 ring-sky-400/50 shadow-lg'
                        : 'border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.title || img.filename}
                      className="w-14 h-14 object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
