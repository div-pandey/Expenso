import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Trash2, Check, Loader2 } from 'lucide-react';
import { compressImageToDataUrl } from '../../utils/image';
import { BlendAvatar } from '../common/BlendAvatar';

interface BlendPfpModalProps {
  isOpen: boolean;
  blendName: string;
  currentIcon?: string;
  onClose: () => void;
  onSave: (icon?: string) => Promise<void>;
}

const POPULAR_EMOJIS = [
  '🚇', '🚕', '🚗', '🎒', '☕', '🚀',
  '🚲', '🌴', '🚌', '⚡', '🏢', '🏠',
  '🍕', '🍻', '🛵', '🎯', '🌟', '💼',
];

export const BlendPfpModal: React.FC<BlendPfpModalProps> = ({
  isOpen,
  blendName,
  currentIcon,
  onClose,
  onSave,
}) => {
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(currentIcon);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIcon(currentIcon);
      setError('');
    }
  }, [isOpen, currentIcon]);

  if (!isOpen) return null;

  const handleEmojiSelect = (emoji: string) => {
    setSelectedIcon(emoji);
    setError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    try {
      const dataUrl = await compressImageToDataUrl(file, 160);
      setSelectedIcon(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetToDefault = () => {
    setSelectedIcon(undefined);
    setError('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await onSave(selectedIcon);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile picture');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white border border-warm-200 rounded-3xl shadow-modal overflow-hidden animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal-900">Blend Profile Picture</h3>
              <p className="text-[11px] text-charcoal-400">Choose an icon or upload a custom photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Preview Hero */}
          <div className="flex flex-col items-center justify-center pt-1 pb-2">
            <div className="relative group">
              <BlendAvatar name={blendName} icon={selectedIcon} size="xl" className="ring-4 ring-brand-100" />
              {isUploading && (
                <div className="absolute inset-0 bg-charcoal-900/40 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs font-bold text-charcoal-800 mt-2.5">{blendName}</p>
            <span className="text-[10px] text-charcoal-400">Preview</span>
          </div>

          {/* Upload Custom Image Button */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-warm-100 hover:bg-warm-200 border border-warm-200 text-charcoal-800 text-xs font-bold rounded-xl transition-all shadow-subtle cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-brand-700" />
              <span>Upload Custom Photo</span>
            </button>
          </div>

          {/* Popular Emojis Grid */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400 block mb-2">
              Or pick an emoji
            </span>
            <div className="grid grid-cols-6 gap-2">
              {POPULAR_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                    selectedIcon === emoji
                      ? 'bg-brand-100 border-2 border-brand-600 scale-105 shadow-subtle'
                      : 'bg-warm-50 hover:bg-warm-100 border border-warm-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Remove custom icon if set */}
          {selectedIcon && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Custom Icon & Use Monogram</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <p className="text-xs text-rose-600 font-medium text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-warm-50 border-t border-warm-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-charcoal-600 hover:text-charcoal-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-subtle transition-all cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Save Profile Picture</span>
          </button>
        </div>
      </div>
    </div>
  );
};

