const express = require('express');
const router = express.Router();
const db = require('../db.js');

// POST /api/cards/generate - record card generation
router.post('/generate', (req, res) => {
  const { memberIds } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'Member IDs required' });
  }

  try {
    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE members
      SET card_issue_count = card_issue_count + 1,
          card_issued_at = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    for (const id of memberIds) {
      updateStmt.run(now, id);
    }

    const members = db.prepare(`
      SELECT * FROM members WHERE id IN (${memberIds.join(',')})
    `).all();

    res.json({ success: true, count: memberIds.length, members });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/cards/:memberId - get member data for card rendering
router.get('/:memberId', (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json(member);
});

module.exports = router;
