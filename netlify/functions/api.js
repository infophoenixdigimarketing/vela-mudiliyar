const jwt = require('jsonwebtoken');

const SECRET = 'demo-secret';

// Mock data
const users = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Admin', role: 'superadmin' },
  { id: 2, username: 'operator', password: 'oper123', name: 'Operator', role: 'operator' },
  { id: 3, username: 'viewer', password: 'view123', name: 'Viewer', role: 'viewer' }
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

const respond = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const path = event.path.split('/.netlify/functions/api')[1] || '';
  const method = event.httpMethod;

  try {
    // POST /login
    if (path === '/auth/login' && method === 'POST') {
      const { username, password } = JSON.parse(event.body || '{}');
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) return respond(401, { error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
      return respond(200, {
        token,
        user: { id: user.id, username: user.username, full_name: user.name, role: user.role }
      });
    }

    // GET /auth/me
    if (path === '/auth/me' && method === 'GET') {
      const token = event.headers.authorization?.split(' ')[1];
      if (!token) return respond(401, { error: 'No token' });

      try {
        const decoded = jwt.verify(token, SECRET);
        const user = users.find(u => u.id === decoded.id);
        return respond(200, { id: user.id, username: user.username, full_name: user.name, role: user.role });
      } catch (e) {
        return respond(401, { error: 'Invalid token' });
      }
    }

    // GET /members or /members/:id
    if (path.startsWith('/members') && method === 'GET') {
      const id = path.split('/')[2];

      if (id) {
        // Single member
        const member = members.find(m => m.id === parseInt(id));
        if (!member) return respond(404, { error: 'Not found' });
        return respond(200, member);
      } else {
        // List members
        const { q, status, page = '1', limit = '25' } = event.queryStringParameters || {};
        let filtered = [...members];

        if (q) {
          const query = q.toLowerCase();
          filtered = filtered.filter(m =>
            m.full_name.toLowerCase().includes(query) ||
            m.phone.includes(query) ||
            m.mva_id.includes(query)
          );
        }

        if (status) {
          filtered = filtered.filter(m => m.status === status);
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 25;
        const offset = (pageNum - 1) * limitNum;

        return respond(200, {
          members: filtered.slice(offset, offset + limitNum),
          total: filtered.length,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(filtered.length / limitNum)
        });
      }
    }

    // POST /members
    if (path === '/members' && method === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const newMember = {
        id: members.length + 1,
        mva_id: `MVA-ID-${String(members.length + 1).padStart(3, '0')}`,
        ...data,
        created_at: new Date().toISOString()
      };
      members.push(newMember);
      return respond(201, newMember);
    }

    // POST /cards/generate
    if (path === '/cards/generate' && method === 'POST') {
      const { memberIds } = JSON.parse(event.body || '{}');
      return respond(200, { success: true, count: memberIds?.length || 0 });
    }

    // Health check
    if (path === '/health') {
      return respond(200, { status: 'ok' });
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    return respond(500, { error: 'Server error' });
  }
};
