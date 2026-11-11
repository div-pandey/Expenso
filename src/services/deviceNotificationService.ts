import type { InAppNotification } from '../types';

const NOTIFICATIONS_PROMPTED_KEY = 'expenso_notifications_prompted';
const NOTIFICATIONS_ENABLED_KEY = 'expenso_notifications_enabled';
const DELIVERED_NOTIFICATIONS_KEY = 'expenso_delivered_device_notifs';

// Simple string hash to generate a valid 32-bit positive integer for notification IDs
export function hashStringToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647 || 1;
}

class DeviceNotificationService {
  private isInitialized = false;
  private deliveredIds: Set<string> = new Set();
  private notificationTapListener?: (notifId: string, extra?: Record<string, unknown>) => void;
  private memoryPrompted = false;

  constructor() {
    this.loadDeliveredIds();
  }

  private loadDeliveredIds(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DELIVERED_NOTIFICATIONS_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            this.deliveredIds = new Set(list.slice(-200)); // keep last 200
          }
        }
      }
    } catch {
      this.deliveredIds = new Set();
    }
  }

  private saveDeliveredIds(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          DELIVERED_NOTIFICATIONS_KEY,
          JSON.stringify(Array.from(this.deliveredIds))
        );
      }
    } catch {}
  }

  public async init(onNotificationTap?: (notifId: string, extra?: Record<string, unknown>) => void): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.notificationTapListener = onNotificationTap;

    // 1. Electron Desktop Native Notifications & Action Listener
    if (typeof window !== 'undefined' && window.desktopApi?.isDesktop) {
      window.desktopApi.onTriggerAction((action, extra) => {
        if (action === 'open-notification') {
          const notifId = extra?.notificationId ? String(extra.notificationId) : '';
          if (this.notificationTapListener) {
            this.notificationTapListener(notifId, extra);
          }
        }
      });
      return;
    }

    // 2. Web notifications listener fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Supported in modern browsers and desktop environments
    }
  }

  public hasPrompted(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(NOTIFICATIONS_PROMPTED_KEY);
        if (val !== null) return val === 'true';
      }
    } catch {}
    return this.memoryPrompted;
  }

  public setPrompted(): void {
    this.memoryPrompted = true;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(NOTIFICATIONS_PROMPTED_KEY, 'true');
      }
    } catch {}
  }

  public async checkPermission(): Promise<boolean> {
    // Desktop Windows notifications are always permitted
    if (typeof window !== 'undefined' && window.desktopApi?.isDesktop) {
      return true;
    }

    // Web Notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }

    return false;
  }

  public async requestPermission(): Promise<boolean> {
    this.setPrompted();

    if (typeof window !== 'undefined' && window.desktopApi?.isDesktop) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
      }
      return true;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        const granted = result === 'granted';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, granted ? 'true' : 'false');
        }
        return granted;
      } catch {
        return false;
      }
    }

    return false;
  }

  public async sendDeviceNotification(notif: InAppNotification): Promise<boolean> {
    // Avoid double delivery
    if (this.deliveredIds.has(notif.id)) {
      return false;
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      return false;
    }

    this.deliveredIds.add(notif.id);
    this.saveDeliveredIds();

    // 1. Electron Desktop Toast Notification
    if (typeof window !== 'undefined' && window.desktopApi?.isDesktop) {
      try {
        await window.desktopApi.showNotification({
          title: notif.title,
          body: notif.message,
          extra: {
            notificationId: notif.id,
            blendId: notif.blendId,
            type: notif.type,
            actorId: notif.actorId,
            amountPaise: notif.amountPaise,
          },
        });
        return true;
      } catch (err) {
        console.warn('[DeviceNotificationService] Could not send desktop notification:', err);
      }
    }

    // 2. Web Notification fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/icon.png',
          badge: '/icon.png',
        });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

export const deviceNotificationService = new DeviceNotificationService();
export default deviceNotificationService;
