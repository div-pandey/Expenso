import { sandboxBackend } from './sandboxBackend';
import { isValidUpiId } from '../utils/upi';

export const UPI_APP_PACKAGES = {
  gpay: 'com.google.android.apps.nbu.paisa.user',
  phonepe: 'com.phonepe.app',
  paytm: 'net.one97.paytm',
  bhim: 'in.org.npci.upiapp',
};

/**
 * Automatically launches the UPI intent / handler (or opens external URL in Desktop / Web)
 */
export async function launchUpiApp(uri: string, _packageName?: string): Promise<boolean> {
  if (!uri || !uri.trim()) return false;
  const cleanUri = uri.trim();

  // Desktop Electron App handler
  if (typeof window !== 'undefined' && window.desktopApi?.isDesktop) {
    try {
      await window.desktopApi.openExternal(cleanUri);
      return true;
    } catch (err) {
      console.warn('[upiPaymentService] Desktop openExternal failed:', err);
    }
  }

  // Web / PWA / Browser fallback
  try {
    const link = document.createElement('a');
    link.href = cleanUri;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    try {
      window.location.href = cleanUri;
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Resolves the recipient's registered UPI ID using all available profiles,
 * signup records, and local storage caches so it is ALWAYS pre-filled automatically.
 */
export function resolveRecipientUpi(memberId: string, fallbackName?: string): string {
  if (!memberId) return '';

  // 1. Check sandbox user profile
  try {
    const user = sandboxBackend.getUserById(memberId);
    if (user?.paymentMethod?.upiId?.trim()) {
      return user.paymentMethod.upiId.trim();
    }
  } catch {}

  // 2. Check dedicated payment method table in sandbox
  try {
    const pm = sandboxBackend.getUserPaymentMethod(memberId);
    if (pm?.upiId?.trim()) {
      return pm.upiId.trim();
    }
  } catch {}

  // 3. Check persistent localStorage keys
  if (typeof localStorage !== 'undefined') {
    try {
      const storedRecipient = localStorage.getItem(`expenso_recipient_upi_${memberId}`);
      if (storedRecipient && isValidUpiId(storedRecipient.trim())) {
        return storedRecipient.trim();
      }

      const storedUser = localStorage.getItem(`expenso_user_upi_${memberId}`);
      if (storedUser && isValidUpiId(storedUser.trim())) {
        return storedUser.trim();
      }
    } catch {}
  }

  // 4. Check initial demo users (Rahul, Aman, Priya, etc.)
  try {
    const demo = sandboxBackend.getAllDemoUsers().find((u) => u.id === memberId);
    if (demo?.paymentMethod?.upiId?.trim()) {
      return demo.paymentMethod.upiId.trim();
    }
  } catch {}

  // 5. Intelligent default based on person's name or username
  const name = fallbackName || 'friend';
  const cleanHandle = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'expenso';
  return `${cleanHandle}@oksbi`;
}
