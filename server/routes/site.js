const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getSetting, setSetting } = require('../lib/settingsStore');

const MAX_SECTIONS = 20;
const MAX_LEADERS = 60;
const MAX_TEXT = 6000;
const IMAGE_TYPES = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp' };

function cleanText(value, max = MAX_TEXT) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanAbout(body) {
  const input = Array.isArray(body.sections) ? body.sections : [];
  if (input.length > MAX_SECTIONS) return { error: `Up to ${MAX_SECTIONS} sections allowed` };

  const sections = input
    .map((raw) => ({
      image_url: cleanText(raw?.image_url, 300),
      image_alt: cleanText(raw?.image_alt, 300),
      caption: cleanText(raw?.caption, 300),
      description: cleanText(raw?.description),
    }))
    .filter((s) => s.image_url || s.description);

  if (sections.length === 0) return { error: 'Add at least one section with a photo or description' };
  return { content: { sections } };
}

function cleanLeaders(body) {
  const input = Array.isArray(body.leaders) ? body.leaders : [];
  if (input.length > MAX_LEADERS) return { error: `Up to ${MAX_LEADERS} leaders allowed` };

  const leaders = input
    .map((raw) => ({
      name: cleanText(raw?.name, 200),
      designation: cleanText(raw?.designation, 200),
      photo_url: cleanText(raw?.photo_url, 300),
      phone: cleanText(raw?.phone, 40),
      email: cleanText(raw?.email, 200),
      highlight: raw?.highlight === true,
    }))
    .filter((l) => l.name);

  if (leaders.length === 0) return { error: 'Add at least one leader with a name' };
  return {
    content: {
      heading: cleanText(body.heading, 200),
      subtitle: cleanText(body.subtitle, 300),
      leaders,
    },
  };
}

// Each editable page declares how its incoming data is cleaned and validated.
const PAGES = {
  about: { clean: cleanAbout },
  leaders: { clean: cleanLeaders },
};

function pageKey(page) {
  return `site_page_${page}`;
}

// POST /api/site/upload-image  { imageDataUrl } → { url }
router.post('/upload-image', (req, res) => {
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(req.body.imageDataUrl || '');
  if (!match) return res.status(400).json({ error: 'Upload a PNG, JPG or WebP image' });

  const ext = IMAGE_TYPES[match[1].toLowerCase()];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'Image must be 8 MB or smaller' });

  const uploadsDir = path.join(__dirname, '..', 'uploads', 'site');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  res.json({ url: `/uploads/site/${filename}` });
});

// GET /api/site/:page — public. Returns null until the page has been edited,
// so the public site keeps its built-in content.
router.get('/:page', (req, res) => {
  if (!PAGES[req.params.page]) return res.status(404).json({ error: 'Unknown page' });
  res.json(getSetting(pageKey(req.params.page), null));
});

// PUT /api/site/:page — body shape depends on the page (see cleanAbout / cleanLeaders)
router.put('/:page', (req, res) => {
  const { page } = req.params;
  if (!PAGES[page]) return res.status(404).json({ error: 'Unknown page' });

  const result = PAGES[page].clean(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });

  const content = { ...result.content, updated_at: new Date().toISOString() };
  setSetting(pageKey(page), content);
  res.json(content);
});

module.exports = router;
