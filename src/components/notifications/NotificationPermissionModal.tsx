import React, { useState } from 'react';
import { Bell, ShieldCheck, Zap, X } from 'lucide-react';
import { deviceNotificationService } from '../../services/deviceNotificationService';
import { useApp } from '../../context/AppContext';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useApp();
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const granted = await deviceNotificationService.requestPermission();
      if (granted) {
        showToast('Device notifications enabled!');
        // Send a welcoming confirmation notification to the device shade
        await deviceNotificationService.sendDeviceNotification({
          id: 'welcome_notif_' + Date.now(),
          userId: 'current',
          type: 'settlement_confirmed',
          title: 'Expenso Notifications Active',
          message: "You'll receive real-time alerts whenever friends add you to ride expenses or verify UPI settlements.",
          actorId: 'system',
          isRead: false,
          isHandled: true,
          createdAt: new Date().toISOString(),
        });
      } else {
        showToast('Notification permission was not granted.', 'info');
      }
    } catch {
      showToast('Could not enable notifications.', 'error');
    } finally {
      setIsRequesting(false);
      onClose();
    }
  };

  const handleDismiss = () => {
    deviceNotificationService.setPrompted();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-title"
    >
      <div className="w-full max-w-sm bg-warm-50 rounded-3xl border border-warm-200 shadow-modal overflow-hidden animate-slide-up sm:animate-pop-in p-6 space-y-4">
        {/* Header with dismiss button */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#12543F] flex items-center justify-center text-white shadow-elevated">
            <Bell className="w-6 h-6 stroke-[2.2]" />
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-charcoal-400 hover:bg-warm-200 hover:text-charcoal-800 transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text */}
        <div>
          <h3 id="perm-title" className="text-lg font-black text-charcoal-900 tracking-tight">
            Enable Real-Time Notifications
          </h3>
          <p className="text-xs text-charcoal-600 mt-1.5 leading-relaxed">
            Allow Expenso to send notifications directly to your device notification panel whenever:
          </p>
        </div>

        {/* Benefits list */}
        <div className="bg-white rounded-2xl p-3 border border-warm-200 space-y-2 text-xs text-charcoal-700">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-700 shrink-0" />
            <span>A friend adds you to a ride expense with your split share</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>A friend sends UPI repayment proof for verification</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleAllow}
            disabled={isRequesting}
            className="btn-action-primary w-full py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold shadow-card flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span>{isRequesting ? 'Requesting Permission…' : 'Allow Notifications'}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl text-charcoal-500 hover:text-charcoal-800 hover:bg-warm-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionModal;

