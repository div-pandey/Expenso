/**
 * Utility to process and compress avatar/blend profile picture images
 * and full-screen payment receipts to lightweight data URLs suitable
 * for fast uploads, storage, and instant rendering.
 */

export async function compressImageToDataUrl(file: File, maxSize = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const isImageMime = file.type.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|bmp|heic|svg)$/i.test(file.name);
    if (!isImageMime && !isImageExt) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('Image file is too large (max 50MB).'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to parse image. Please select a JPG, PNG, or WebP photo.'));
    };
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Center-crop to square
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        reject(new Error('Failed to process image on canvas'));
      }
    };
    img.src = objectUrl;
  });
}

/**
 * Client-Side Image Compression Before AI Upload:
 * Resizes and compresses payment screenshots on an HTML5 <canvas> to max dimension 1280px
 * and image/jpeg at 0.8 quality. This prevents Vercel 413 Payload Too Large errors and
 * minimizes serverless function execution latency.
 */
export async function compressScreenshotForVerification(
  fileOrDataUrl: File | Blob | string,
  maxDimension = 1280,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      if (typeof fileOrDataUrl === 'string') return resolve(fileOrDataUrl);
      return reject(new Error('Canvas compression only supported in browser environment'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    img.onload = () => {
      cleanup();
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          reject(new Error('Image has zero dimensions.'));
          return;
        }

        // Proportional scale factor ensuring max dimension <= maxDimension
        const maxCurrent = Math.max(width, height);
        const scale = maxCurrent > maxDimension ? maxDimension / maxCurrent : 1;
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('HTML5 Canvas 2D context unavailable.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to compress screenshot on canvas.'));
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Could not load screenshot for compression.'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      objectUrl = URL.createObjectURL(fileOrDataUrl);
      img.src = objectUrl;
    }
  });
}
