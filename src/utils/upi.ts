import jsQR from 'jsqr';
import type { ParsedUPI } from '../types';

/**
 * Validates UPI ID format (e.g., user@okhdfcbank, name@upi, 9876543210@paytm)
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  // Standard VPA: minimum 2 chars username, '@', minimum 2 chars bank handle
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;
  return upiRegex.test(trimmed);
}

/**
 * Parses and validates a standard UPI payment URI string (upi://pay?...)
 */
export function parseUpiUri(uriString: string): { success: boolean; data?: ParsedUPI; error?: string } {
  if (!uriString || typeof uriString !== 'string') {
    return { success: false, error: 'Empty or invalid QR payload' };
  }

  const trimmed = uriString.trim();

  // Must begin with upi://pay scheme
  if (!/^upi:\/\/pay(\?.*)?$/i.test(trimmed)) {
    return {
      success: false,
      error: "This doesn't appear to be a valid UPI payment QR. Please upload a clear screenshot or image of your payment QR and try again.",
    };
  }

  try {
    const queryIdx = trimmed.indexOf('?');
    const queryString = queryIdx >= 0 ? trimmed.substring(queryIdx + 1) : '';
    const params = new URLSearchParams(queryString);

    const pa = params.get('pa')?.trim() || '';
    if (!pa) {
      return { success: false, error: 'Missing required Payee UPI ID (pa parameter) in QR code.' };
    }

    if (!isValidUpiId(pa)) {
      return { success: false, error: `Invalid UPI ID format in QR payload: "${pa}".` };
    }

    const pn = params.get('pn')?.trim() || undefined;
    const am = params.get('am')?.trim() || undefined;
    const cu = (params.get('cu')?.trim() || 'INR').toUpperCase();
    const mc = params.get('mc')?.trim() || undefined;
    const tn = params.get('tn')?.trim() || undefined;

    if (cu !== 'INR') {
      return { success: false, error: `Unsupported currency "${cu}". Expenso requires INR.` };
    }

    return {
      success: true,
      data: {
        pa,
        pn,
        am,
        cu,
        mc,
        tn,
        rawUri: trimmed,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse UPI QR payload.',
    };
  }
}

/**
 * Safely constructs a standard UPI payment URI with proper URL encoding.
 * Example: upi://pay?pa=RECIPIENT_UPI_ID&pn=RECIPIENT_NAME&am=59.00&cu=INR&tn=Expenso%20settlement
 */
export function buildSafeUpiUri(params: {
  pa: string;
  pn?: string;
  amPaise?: number;
  cu?: string;
  tn?: string;
}): string {
  const query = new URLSearchParams();

  // Required: Payee Address
  query.set('pa', params.pa.trim());

  // Optional: Payee Name
  if (params.pn && params.pn.trim()) {
    query.set('pn', params.pn.trim());
  }

  // Optional: Amount in rupees with 2 decimal places
  if (params.amPaise && params.amPaise > 0) {
    const rupees = (params.amPaise / 100).toFixed(2);
    query.set('am', rupees);
  }

  // Currency: strictly INR
  query.set('cu', params.cu || 'INR');

  // Optional Note
  if (params.tn && params.tn.trim()) {
    query.set('tn', params.tn.trim());
  } else {
    query.set('tn', 'Expenso settlement');
  }

  return `upi://pay?${query.toString()}`;
}

/**
 * Decodes a QR code from an image File in browser using canvas and jsQR.
 */
export async function decodeQrCodeFromImageFile(
  file: File
): Promise<{ success: boolean; payload?: string; parsed?: ParsedUPI; error?: string }> {
  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    return {
      success: false,
      error: 'Unsupported image format. Please upload a PNG, JPEG, or WebP image.',
    };
  }

  // Validate size (max 5 MB)
  if (file.size > 5 * 1024 * 1024) {
    return {
      success: false,
      error: 'File size exceeds 5MB limit. Please upload a smaller screenshot.',
    };
  }

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read image file.' });
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        resolve({ success: false, error: 'Failed to load image for QR inspection.' });
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ success: false, error: 'Canvas 2D context unavailable.' });
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);

          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (!qrCode || !qrCode.data) {
            resolve({
              success: false,
              error:
                "This doesn't appear to be a valid UPI payment QR. Please upload a clear screenshot or image of your payment QR and try again.",
            });
            return;
          }

          // Parse and validate the decoded payload
          const parseResult = parseUpiUri(qrCode.data);
          if (!parseResult.success) {
            resolve({
              success: false,
              payload: qrCode.data,
              error: parseResult.error,
            });
            return;
          }

          resolve({
            success: true,
            payload: qrCode.data,
            parsed: parseResult.data,
          });
        } catch (err) {
          resolve({
            success: false,
            error: err instanceof Error ? err.message : 'Error decoding QR image.',
          });
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Seeded verifiable sample UPI QRs for rapid offline testing and simulated accounts
 */
export const SAMPLE_UPI_DESTINATIONS: Record<string, { upiId: string; payeeName: string; rawUri: string }> = {
  user_you: {
    upiId: 'divyansh@oksbi',
    payeeName: 'Divyansh',
    rawUri: 'upi://pay?pa=divyansh@oksbi&pn=Divyansh&cu=INR&tn=Expenso',
  },
  user_rahul: {
    upiId: 'rahul.sharma@okhdfcbank',
    payeeName: 'Rahul Sharma',
    rawUri: 'upi://pay?pa=rahul.sharma@okhdfcbank&pn=Rahul%20Sharma&cu=INR&tn=Expenso',
  },
  user_aman: {
    upiId: 'aman.verma@paytm',
    payeeName: 'Aman Verma',
    rawUri: 'upi://pay?pa=aman.verma@paytm&pn=Aman%20Verma&cu=INR&tn=Expenso',
  },
};

