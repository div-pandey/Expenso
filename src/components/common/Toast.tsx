import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-600 shrink-0" />,
  };

  return (
    <aside
      aria-label="Notification"
      className="fixed bottom-20 md:bottom-8 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-50 flex items-center gap-2.5 bg-white border border-charcoal-200 shadow-elevated px-4 py-2.5 rounded-xl animate-pop-in"
    >
      {icons[toast.type]}
      <p className="text-xs sm:text-sm font-medium text-charcoal-900 whitespace-nowrap">
        {toast.message}
      </p>
    </aside>
  );
};
