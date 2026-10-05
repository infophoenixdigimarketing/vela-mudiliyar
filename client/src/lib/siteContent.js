import { apiFetch } from './api';

export function getSitePage(page) {
  return apiFetch(`site/${page}`);
}

export function saveSitePage(page, data) {
  return apiFetch(`site/${page}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function uploadSiteImage(imageDataUrl) {
  return apiFetch('site/upload-image', { method: 'POST', body: JSON.stringify({ imageDataUrl }) });
}

export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the image file'));
    reader.readAsDataURL(file);
  });
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
