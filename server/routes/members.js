const express = require('express');
const router = express.Router();
const db = require('../db.js');
const dayjs = require('dayjs');

// GET /api/members - list with filters and search
router.get('/', (req, res) => {
  let {
    q, status, membership_type, blood_group, area, birthday_month,
    age_min, age_max, joined_year, sort = 'full_name', dir = 'asc',
    page = 1, limit = 25
  } = req.query;

  limit = Math.min(parseInt(limit) || 25, 100);
  page = Math.max(parseInt(page) || 1, 1);
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (q) {
    where.push(
      '(full_name LIKE ? OR mva_id LIKE ? OR phone LIKE ? OR residence_address LIKE ?)'
    );
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  if (membership_type) {
    where.push('membership_type = ?');
    params.push(membership_type);
  }

  if (blood_group) {
    where.push('blood_group = ?');
    params.push(blood_group);
  }

  if (area) {
    where.push('area = ?');
    params.push(area);
  }

  if (birthday_month) {
    where.push('dob_month = ?');
    params.push(parseInt(birthday_month));
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const validSort = ['full_name', 'mva_id', 'phone', 'area', 'created_at', 'blood_group', 'status'];
  const sortField = validSort.includes(sort) ? sort : 'full_name';
  const sortDir = dir === 'desc' ? 'DESC' : 'ASC';

  try {
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM members ${whereClause}`)
      .get(...params);
    const total = countResult.total;

    const members = db.prepare(`
      SELECT * FROM members
      ${whereClause}
      ORDER BY ${sortField} ${sortDir}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      members,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/:id
router.get('/:id', (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json(member);
});

// POST /api/members - create new member
router.post('/', (req, res) => {
  const { full_name, phone, dob, sex, blood_group, status = 'active', membership_type = 'life', ...data } = req.body;

  if (!full_name) return res.status(400).json({ error: 'Name required' });

  try {
    // Get next serial number
    const maxSerial = db.prepare('SELECT MAX(serial_no) as max FROM members').get().max || 0;
    const newSerial = maxSerial + 1;
    const mvaId = `MVA-ID-${String(newSerial).padStart(3, '0')}`;

    let dobDay = null, dobMonth = null;
    if (dob) {
      const parsed = dayjs(dob);
      dobDay = parsed.date();
      dobMonth = parsed.month() + 1;
    }

    const stmt = db.prepare(`
      INSERT INTO members (
        mva_id, serial_no, full_name, phone, dob, dob_day, dob_month, sex, blood_group,
        status, membership_type, updated_at, sync_status, ${Object.keys(data).join(', ')}
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'pending', ${Object.keys(data).map(() => '?').join(', ')}
      )
    `);

    const result = stmt.run(
      mvaId, newSerial, full_name, phone, dob, dobDay, dobMonth, sex, blood_group,
      status, membership_type, ...Object.values(data)
    );

    const newMember = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/members/:id - update member
router.put('/:id', (req, res) => {
  const { dob, ...data } = req.body;

  let dobDay = null, dobMonth = null;
  if (dob) {
    const parsed = dayjs(dob);
    dobDay = parsed.date();
    dobMonth = parsed.month() + 1;
  }

  const updates = Object.keys(data).map(k => `${k} = ?`).join(', ');
  if (dob) updates && (updates += ', dob_day = ?, dob_month = ?');

  const values = Object.values(data);
  if (dob) {
    values.push(dobDay, dobMonth);
  }

  try {
    db.prepare(`
      UPDATE members
      SET ${updates}, updated_at = datetime('now'), sync_status = 'pending'
      WHERE id = ?
    `).run(...values, req.params.id);

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    res.json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/members/:id - soft delete
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE members SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run('deleted', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/members/check-duplicate - check for duplicate phone
router.get('/check-duplicate', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.json({ exists: false });

  const existing = db.prepare('SELECT id, full_name FROM members WHERE phone = ?').get(phone);
  res.json({ exists: !!existing, member: existing });
});

module.exports = router;
