import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Bell, CheckCircle2, XCircle, Receipt, Users } from 'lucide-react';
import type { InAppNotification, Settlement } from '../../types';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function getTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Icon per notification type
// ---------------------------------------------------------------------------
interface NotificationIconProps {
  type: InAppNotification['type'];
}

function NotificationIcon({ type }: NotificationIconProps) {
  switch (type) {
    case 'settlement_proof_submitted':
      return (
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-600 shrink-0">
          <Receipt size={18} />
        </span>
      );
    case 'settlement_confirmed':
      return (
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
          <CheckCircle2 size={18} />
        </span>
      );
    case 'settlement_rejected':
      return (
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 text-red-500 shrink-0">
          <XCircle size={18} />
        </span>
      );
    case 'blend_invite':
      return (
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-forest-100 text-forest-700 shrink-0">
          <Users size={18} />
        </span>
      );
    default:
      return (
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-stone-100 text-stone-500 shrink-0">
          <Bell size={18} />
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Single notification card
// ---------------------------------------------------------------------------
interface NotificationCardProps {
  notification: InAppNotification;
  settlement?: Settlement;
  onRead: (id: string) => void;
  onViewProof: (settlement: Settlement) => void;
}

function NotificationCard({
  notification,
  settlement,
  onRead,
  onViewProof,
}: NotificationCardProps) {
  const { id, type, title, message, isRead, createdAt } = notification;

  const handleCardClick = () => {
    if (!isRead) onRead(id);
  };

  const handleViewProof = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetSettlement: Settlement = settlement || {
      id: notification.settlementId || '',
      blendId: notification.blendId || '',
      fromMemberId: notification.actorId,
      toMemberId: notification.userId,
      amountPaise: notification.amountPaise || 0,
      date: notification.createdAt,
      status: 'proof_submitted',
      proofImageUrl: notification.proofImageUrl,
      createdAt: notification.createdAt,
      createdBy: notification.actorId,
    };
    onViewProof(targetSettlement);
    onRead(id);
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRead(id);
  };

  const showViewProof =
    type === 'settlement_proof_submitted' && (!!settlement || !!notification.settlementId);
  const showViewButton =
    type === 'settlement_confirmed' || type === 'settlement_rejected';

  return (
    <div
      onClick={handleCardClick}
      className={`
        relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors
        hover:bg-stone-50 active:bg-stone-100
        ${!isRead
          ? 'border-l-4 border-forest-700 bg-forest-50/40'
          : 'border-l-4 border-transparent bg-white'
        }
      `}
    >
      {/* Icon */}
      <NotificationIcon type={type} />

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug ${
              isRead ? 'font-normal text-stone-700' : 'font-semibold text-stone-900'
            }`}
          >
            {title}
          </p>
          <span className="text-[11px] text-stone-400 whitespace-nowrap mt-0.5 shrink-0">
            {getTimeAgo(createdAt)}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-stone-500 leading-relaxed line-clamp-2">
          {message}
        </p>

        {/* Action buttons */}
        {(showViewProof || showViewButton) && (
          <div className="mt-2 flex gap-2">
            {showViewProof && (
              <button
                onClick={handleViewProof}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium
                           bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              >
                <Receipt size={12} />
                View Proof
              </button>
            )}
            {showViewButton && (
              <button
                onClick={handleMarkRead}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium
                           bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
              >
                View
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unread dot */}
      {!isRead && (
        <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-forest-600 shrink-0" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 text-stone-400">
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-stone-100">
        <Bell size={32} strokeWidth={1.5} />
      </span>
      <div className="text-center">
        <p className="text-base font-semibold text-stone-600">All caught up!</p>
        <p className="mt-1 text-sm text-stone-400">No notifications yet.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main drawer
// ---------------------------------------------------------------------------
export default function NotificationDrawer() {
  const {
    notifications,
    unreadNotificationsCount,
    isNotificationDrawerOpen,
    closeNotificationDrawer,
    markNotificationRead,
    markAllNotificationsRead,
    openProofReview,
    settlements,
  } = useApp();

  // Sort newest first
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const findSettlement = (settlementId?: string): Settlement | undefined =>
    settlementId ? settlements.find((s) => s.id === settlementId) : undefined;

  if (!isNotificationDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={closeNotificationDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-full flex flex-col
          w-full sm:w-[340px]
          bg-white shadow-2xl
          border-l border-stone-200
          animate-slide-in-right
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200 bg-stone-50 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-800 tracking-tight">
              Notifications
            </h2>
            {unreadNotificationsCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-forest-700 text-white">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-medium text-forest-700 hover:text-forest-900 transition-colors px-1"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={closeNotificationDrawer}
              aria-label="Close notifications"
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Notification list ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
          {sorted.length === 0 ? (
            <EmptyState />
          ) : (
            sorted.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                settlement={findSettlement(notification.settlementId)}
                onRead={markNotificationRead}
                onViewProof={openProofReview}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}
