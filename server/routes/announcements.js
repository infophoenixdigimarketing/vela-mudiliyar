const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db.js');
const { getSetting, setSetting } = require('../lib/settingsStore');

function normalizePhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
}

function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (values[key] !== undefined ? values[key] : ''));
}

// POST /api/announcements/upload-image — stash the announcement image, return a public URL for it
router.post('/upload-image', (req, res) => {
  const { imageDataUrl } = req.body;
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(imageDataUrl || '');
  if (!match) return res.status(400).json({ error: 'A valid image data URL is required' });

  const [, ext, base64] = match;
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'announcements');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64, 'base64'));

  const url = `${req.protocol}://${req.get('host')}/uploads/announcements/${filename}`;
  res.json({ url });
});

// POST /api/announcements/send  { memberIds, message, imageUrl? } — bulk SMS via the configured gateway
router.post('/send', async (req, res) => {
  const { memberIds, message, imageUrl } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one member' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const gateway = getSetting('sms_gateway', null);
  if (!gateway || !gateway.url_template) {
    return res.status(400).json({ error: 'No SMS gateway configured yet — add one in Settings first.' });
  }

  const finalMessage = imageUrl ? `${message}\n\nView image: ${imageUrl}` : message;
  const members = db.prepare(
    `SELECT * FROM members WHERE id IN (${memberIds.map(() => '?').join(',')})`
  ).all(...memberIds);

  const results = [];
  let sentCount = 0;

  for (const m of members) {
    const phone = normalizePhone(m.phone || m.whatsapp);
    if (!phone) {
      results.push({ id: m.id, name: m.full_name, ok: false, error: 'No phone number on file' });
      continue;
    }
    if ((gateway.credits || 0) <= sentCount) {
      results.push({ id: m.id, name: m.full_name, ok: false, error: 'Out of SMS credits' });
      continue;
    }

    const values = { phone, message: finalMessage, api_key: gateway.api_key || '', sender_id: gateway.sender_id || '' };

    try {
      const url = fillTemplate(
        gateway.url_template,
        Object.fromEntries(Object.entries(values).map(([k, v]) => [k, encodeURIComponent(v)]))
      );

      let response;
      if (gateway.method === 'POST' && gateway.body_template) {
        const isJson = gateway.body_format === 'json';
        const bodyValues = Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, isJson ? JSON.stringify(v).slice(1, -1) : encodeURIComponent(v)])
        );
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': isJson ? 'application/json' : 'application/x-www-form-urlencoded' },
          body: fillTemplate(gateway.body_template, bodyValues),
        });
      } else {
        response = await fetch(url, { method: gateway.method === 'POST' ? 'POST' : 'GET' });
      }

      if (response.ok) {
        sentCount++;
        results.push({ id: m.id, name: m.full_name, ok: true });
      } else {
        const text = await response.text().catch(() => '');
        results.push({ id: m.id, name: m.full_name, ok: false, error: `Gateway returned ${response.status}${text ? ': ' + text.slice(0, 200) : ''}` });
      }
    } catch (err) {
      results.push({ id: m.id, name: m.full_name, ok: false, error: err.message });
    }
  }

  gateway.credits = Math.max(0, (gateway.credits || 0) - sentCount);
  setSetting('sms_gateway', gateway);

  db.prepare(`
    INSERT INTO message_log (channel, template_name, body, recipient_count, filter_used, status)
    VALUES ('sms', 'announcement', ?, ?, ?, ?)
  `).run(message, sentCount, JSON.stringify(memberIds), sentCount === members.length ? 'sent' : 'partial');

  res.json({ sentCount, total: members.length, creditsRemaining: gateway.credits, results });
});

module.exports = router;
