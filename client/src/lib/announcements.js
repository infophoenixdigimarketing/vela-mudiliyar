// Bulk announcement helpers — SMS goes through the server-configured gateway,
// WhatsApp reuses the same wa.me deep-link approach as the ID card verification flow.
import { apiFetch } from './api';

export function getSmsGatewaySettings() {
  return apiFetch('settings/sms-gateway');
}

export function saveSmsGatewaySettings(data) {
  return apiFetch('settings/sms-gateway', { method: 'PUT', body: JSON.stringify(data) });
}

export function topUpSmsCredits(add) {
  return apiFetch('settings/sms-gateway/credits', { method: 'POST', body: JSON.stringify({ add }) });
}

export function uploadAnnouncementImage(imageDataUrl) {
  return apiFetch('announcements/upload-image', { method: 'POST', body: JSON.stringify({ imageDataUrl }) });
}

export function sendSmsAnnouncement({ memberIds, message, imageUrl }) {
  return apiFetch('announcements/send', {
    method: 'POST',
    body: JSON.stringify({ memberIds, message, imageUrl }),
  });
}
