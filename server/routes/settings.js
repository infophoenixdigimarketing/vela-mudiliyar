const express = require('express');
const router = express.Router();
const { getSetting, setSetting } = require('../lib/settingsStore');

// GET /api/settings/sms-gateway — config with the API key masked
router.get('/sms-gateway', (req, res) => {
  const cfg = getSetting('sms_gateway', null);
  if (!cfg) return res.json(null);
  const { api_key, ...rest } = cfg;
  res.json({
    ...rest,
    api_key_set: !!api_key,
    api_key_preview: api_key ? `••••${api_key.slice(-4)}` : '',
  });
});

// PUT /api/settings/sms-gateway — create/update the gateway config.
// api_key is optional on update: send blank/omitted to keep the currently stored key.
router.put('/sms-gateway', (req, res) => {
  const { label, url_template, method, body_template, body_format, api_key, sender_id } = req.body;
  if (!url_template) return res.status(400).json({ error: 'API URL is required' });

  const existing = getSetting('sms_gateway', {}) || {};
  const cfg = {
    label: label || '',
    url_template,
    method: method === 'POST' ? 'POST' : 'GET',
    body_template: body_template || '',
    body_format: body_format === 'json' ? 'json' : 'form',
    api_key: api_key ? api_key : (existing.api_key || ''),
    sender_id: sender_id || '',
    credits: existing.credits ?? 0,
  };
  setSetting('sms_gateway', cfg);
  res.json({ success: true });
});

// POST /api/settings/sms-gateway/credits  { add } or { set } — top up after a new purchase
router.post('/sms-gateway/credits', (req, res) => {
  const existing = getSetting('sms_gateway', null);
  if (!existing) return res.status(400).json({ error: 'Configure the SMS gateway first' });

  const { add, set } = req.body;
  if (typeof set === 'number') existing.credits = Math.max(0, set);
  else if (typeof add === 'number') existing.credits = Math.max(0, (existing.credits || 0) + add);
  else return res.status(400).json({ error: '"add" or "set" number is required' });

  setSetting('sms_gateway', existing);
  res.json({ success: true, credits: existing.credits });
});

module.exports = router;
