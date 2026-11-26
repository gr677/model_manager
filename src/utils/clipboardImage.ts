/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function extensionFromMime(mimeType: string): string {
  const normalized = (mimeType || '').toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('svg')) return 'svg';
  return 'png';
}

export function buildTimestampedImageFilename(mimeType: string, originalName?: string): string {
  const ext = extensionFromMime(mimeType);
  const cleaned = (originalName || '').trim();
  if (cleaned && cleaned !== 'image.png' && cleaned !== 'image.jpg' && cleaned !== 'image.jpeg') {
    return cleaned.includes('.') ? cleaned : `${cleaned}.${ext}`;
  }
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `pasted_image_${stamp}.${ext}`;
}

export function extractImageFileFromDataTransfer(data: DataTransfer | null | undefined): File | null {
  if (!data) return null;

  if (data.items && data.items.length > 0) {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          const filename = buildTimestampedImageFilename(blob.type || item.type, blob.name);
          return new File([blob], filename, { type: blob.type || item.type || 'image/png' });
        }
      }
    }
  }

  if (data.files && data.files.length > 0) {
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      if (file.type.startsWith('image/')) {
        const filename = buildTimestampedImageFilename(file.type, file.name);
        return file.name === filename
          ? file
          : new File([file], filename, { type: file.type || 'image/png' });
      }
    }
  }

  return null;
}

export async function readImageFileFromNavigatorClipboard(): Promise<{
  file: File | null;
  status: 'ok' | 'no-image' | 'blocked';
}> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
    return { file: null, status: 'blocked' };
  }

  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const imageMime = item.types.find(t => t.startsWith('image/'));
      if (imageMime) {
        const blob = await item.getType(imageMime);
        const filename = buildTimestampedImageFilename(imageMime);
        return {
          file: new File([blob], filename, { type: imageMime }),
          status: 'ok',
        };
      }
    }
    return { file: null, status: 'no-image' };
  } catch {
    return { file: null, status: 'blocked' };
  }
}
