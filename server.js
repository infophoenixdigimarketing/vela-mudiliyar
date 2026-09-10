const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = 'demo-key';

const users = [
  { id: 1, username: 'admin', pass: 'admin123', name: 'Admin', role: 'superadmin' },
  { id: 2, username: 'operator', pass: 'oper123', name: 'Operator', role: 'operator' },
  { id: 3, username: 'viewer', pass: 'view123', name: 'Viewer', role: 'viewer' }
];

let members = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  mva_id: `MVA-ID-${String(i + 1).padStart(3, '0')}`,
  full_name: `Member ${i + 1}`,
  phone: `9999${String(90000 + i).padStart(5, '0')}`,
  blood_group: ['A+', 'B+', 'O+', 'AB+'][i % 4],
  area: ['Ittigegudu', 'J P Nagar', 'Medar Block', 'Hunsur Town'][i % 4],
  status: i < 48 ? 'active' : (i < 56 ? 'pending' : 'departed'),
  membership_type: i % 5 === 0 ? 'annual' : 'life',
  dob: '1975-05-15',
  email: `member${i}@example.com`,
  created_at: new Date().toISOString()
}));

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.pass === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.name, role: user.role } });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = users.find(u => u.id === decoded.id);
    res.json({ id: user.id, username: user.username, full_name: user.name, role: user.role });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/members', (req, res) => {
  const { q, status, page = 1, limit = 25 } = req.query;
  let filtered = [...members];
  if (q) filtered = filtered.filter(m => m.full_name.includes(q) || m.phone.includes(q) || m.mva_id.includes(q));
  if (status) filtered = filtered.filter(m => m.status === status);
  const offset = (page - 1) * limit;
  res.json({
    members: filtered.slice(offset, offset + limit),
    total: filtered.length,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(filtered.length / limit)
  });
});

app.get('/api/members/:id', (req, res) => {
  const m = members.find(x => x.id === parseInt(req.params.id));
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

app.post('/api/members', (req, res) => {
  const member = { id: members.length + 1, mva_id: `MVA-ID-${String(members.length + 1).padStart(3, '0')}`, ...req.body };
  members.push(member);
  res.json(member);
});

app.post('/api/cards/generate', (req, res) => {
  res.json({ success: true, count: req.body.memberIds?.length || 0 });
});

app.use(express.static(path.join(__dirname, 'client/dist')));
// Admin SPA (member management app) lives under /admin
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'client/dist/admin/index.html')));
// Everything else falls back to the public MVA website
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'client/dist/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n✅ MVA System LIVE at http://localhost:${PORT}\n`));
