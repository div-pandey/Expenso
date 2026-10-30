import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm bg-white border border-warm-200 rounded-2xl shadow-modal p-5 animate-pop-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal-900">{title}</h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-charcoal-400 hover:text-charcoal-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-charcoal-600 mt-3 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 rounded-lg hover:bg-warm-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white shadow-subtle transition-all ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-brand-700 hover:bg-brand-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
