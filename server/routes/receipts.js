const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/receipts
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT * FROM receipts ORDER BY id DESC LIMIT 500`).all();
  res.json(rows);
});

// POST /api/receipts  { member_id, mva_id, member_name, purpose, amount, payment_mode, created_by }
router.post('/', (req, res) => {
  const { member_id, mva_id, member_name, purpose, amount, payment_mode, created_by } = req.body;
  if (!member_name || !amount) {
    return res.status(400).json({ error: 'member_name and amount are required' });
  }

  const year = new Date().getFullYear();
  const count = db
    .prepare(`SELECT COUNT(*) AS c FROM receipts WHERE voucher_no LIKE ?`)
    .get(`MVA/${year}/%`).c;
  const voucher_no = `MVA/${year}/${String(count + 1).padStart(4, '0')}`;

  const info = db.prepare(`
    INSERT INTO receipts (voucher_no, member_id, mva_id, member_name, purpose, amount, payment_mode, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(voucher_no, member_id || null, mva_id || '', member_name, purpose || '', amount, payment_mode || 'Cash', created_by || '');

  res.status(201).json(db.prepare(`SELECT * FROM receipts WHERE id = ?`).get(info.lastInsertRowid));
});

module.exports = router;
