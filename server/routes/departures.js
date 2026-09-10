const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/departures
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT * FROM departure_register ORDER BY id DESC`).all();
  res.json(rows);
});

// POST /api/departures  { member_id, mva_id, full_name, date, reason, remarks, recorded_by }
router.post('/', (req, res) => {
  const { member_id, mva_id, full_name, date, reason, remarks, recorded_by } = req.body;
  if (!member_id || !date) {
    return res.status(400).json({ error: 'member_id and date are required' });
  }

  const info = db.prepare(`
    INSERT INTO departure_register (member_id, mva_id, full_name, date, reason, remarks, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(member_id, mva_id || '', full_name || '', date, reason || '', remarks || '', recorded_by || '');

  // Update member status as well
  db.prepare(`
    UPDATE members
    SET status = 'departed', departure_date = ?, departure_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(date, reason || '', member_id);

  res.status(201).json(db.prepare(`SELECT * FROM departure_register WHERE id = ?`).get(info.lastInsertRowid));
});

module.exports = router;
