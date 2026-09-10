const express = require('express');
const cors = require('cors');
const path = require('path');
require('./db.js');

const app = express();

app.use(cors());
// Large limit so base64 photos/signatures can be saved
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/departures', require('./routes/departures'));
app.use('/api/history', require('./routes/history'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/announcements', require('./routes/announcements'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React build
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
console.log(`📁 Looking for React build at: ${clientBuildPath}`);

app.use(express.static(clientBuildPath, {
  maxAge: '1h',
  etag: false
}));

// SPA fallback - serve the admin app's index.html under /admin,
// and the public MVA website's index.html for everything else
app.get('api/health', (req, res) => {
  const isAdmin = req.path === '/admin' || req.path.startsWith('/admin/');
  const indexPath = path.join(clientBuildPath, isAdmin ? 'admin/index.html' : 'index.html');
  console.log(`📄 Serving: ${req.path} -> ${indexPath}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`❌ Error serving index.html:`, err.message);
      res.status(404).json({ error: 'Not found', path: req.path });
    }
  });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n✅ MVA Membership System Ready!\n`);
  console.log(`   🌐 Server: http://${HOST}:${PORT}`);
  console.log(`   📱 API: http://${HOST}:${PORT}/api/health`);
  console.log(`   👤 Login: admin / admin123\n`);
});
