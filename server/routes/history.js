const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/history — print history
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT * FROM print_history ORDER BY id DESC LIMIT 500`).all();
  res.json(rows.map(r => ({ ...r, members: JSON.parse(r.member_ids || '[]') })));
});

// POST /api/history  { printed_by, role, members: [{id, mva_id, full_name}] }
router.post('/', (req, res) => {
  const { printed_by, role, members } = req.body;
  const list = Array.isArray(members) ? members : [];

  const info = db.prepare(`
    INSERT INTO print_history (printed_by, role, member_ids, card_count)
    VALUES (?, ?, ?, ?)
  `).run(printed_by || 'Unknown', role || '', JSON.stringify(list), list.length);

  // Bump issue counts
  const bump = db.prepare(`
    UPDATE members SET card_issue_count = COALESCE(card_issue_count, 0) + 1, card_issued_at = datetime('now')
    WHERE id = ?
  `);
  list.forEach(m => { try { bump.run(m.id); } catch (e) { /* sample-data ids may not exist */ } });

  res.status(201).json({ id: info.lastInsertRowid, ok: true });
});

module.exports = router;
