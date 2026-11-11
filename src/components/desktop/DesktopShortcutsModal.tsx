import React from 'react';
import { X, Command } from 'lucide-react';

interface DesktopShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopShortcutsModal: React.FC<DesktopShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + N', label: 'Record New Ride Expense' },
    { key: 'Ctrl + S', label: 'Settle Up / Record Repayment' },
    { key: 'Ctrl + B', label: 'Blend Switcher & Join Code' },
    { key: 'Ctrl + 1', label: 'Switch to Dashboard' },
    { key: 'Ctrl + 2', label: 'Switch to Activity Log' },
    { key: 'Ctrl + 3', label: 'Switch to Balances View' },
    { key: 'Ctrl + 4', label: 'Switch to Blend Members' },
    { key: 'Esc', label: 'Close Active Modal / Drawer' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-warm-50 rounded-2xl border border-warm-200 shadow-modal p-5 space-y-4 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-warm-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-charcoal-900">Desktop Keyboard Shortcuts</h3>
              <p className="text-[11px] text-charcoal-500 font-medium">Quick navigation for power users</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-warm-200 text-charcoal-500 hover:text-charcoal-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-warm-200 text-xs"
            >
              <span className="text-charcoal-700 font-medium">{s.label}</span>
              <kbd className="px-2 py-0.5 rounded bg-warm-100 border border-warm-300 font-mono text-[11px] font-bold text-charcoal-800 shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-charcoal-500">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-warm-200 text-[10px] font-mono font-bold">Esc</kbd> anytime to dismiss overlays.
          </p>
        </div>
      </div>
    </div>
  );
};

