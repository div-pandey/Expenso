/**
 * Utility to process and compress avatar/blend profile picture images
 * to lightweight data URLs suitable for storage and instant rendering.
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

