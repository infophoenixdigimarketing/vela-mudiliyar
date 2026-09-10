const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'mva.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name     TEXT,
      role          TEXT NOT NULL DEFAULT 'operator',
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      mva_id            TEXT UNIQUE NOT NULL,
      serial_no         INTEGER,
      full_name         TEXT NOT NULL,
      relation_type     TEXT,
      relation_name     TEXT,
      dob               TEXT,
      dob_day           INTEGER,
      dob_month         INTEGER,
      sex               TEXT,
      blood_group       TEXT,
      occupation        TEXT,
      phone             TEXT,
      whatsapp          TEXT,
      email             TEXT,
      residence_address TEXT,
      residence_phone   TEXT,
      office_address    TEXT,
      office_phone      TEXT,
      area              TEXT,
      pincode           TEXT,
      membership_type   TEXT DEFAULT 'life',
      status            TEXT DEFAULT 'active',
      voucher_no        TEXT,
      introduced_by     TEXT,
      special_remarks   TEXT,
      date_of_membership TEXT,
      passed_by_committee_on TEXT,
      photo_path        TEXT,
      card_issued_at    TEXT,
      card_issue_count  INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now')),
      sync_status       TEXT DEFAULT 'pending'
    );

    CREATE INDEX IF NOT EXISTS idx_members_name   ON members(full_name);
    CREATE INDEX IF NOT EXISTS idx_members_phone  ON members(phone);
    CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
    CREATE INDEX IF NOT EXISTS idx_members_month  ON members(dob_month);

    CREATE TABLE IF NOT EXISTS member_documents (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id  INTEGER REFERENCES members(id) ON DELETE CASCADE,
      doc_type   TEXT,
      file_path  TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      action     TEXT,
      entity     TEXT,
      entity_id  INTEGER,
      detail     TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      channel        TEXT,
      template_name  TEXT,
      body           TEXT,
      recipient_count INTEGER,
      filter_used    TEXT,
      status         TEXT DEFAULT 'simulated',
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS print_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      printed_by  TEXT,
      role        TEXT,
      member_ids  TEXT,          -- JSON array of {id, mva_id, full_name}
      card_count  INTEGER,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_no   TEXT UNIQUE NOT NULL,
      member_id    INTEGER,
      mva_id       TEXT,
      member_name  TEXT,
      purpose      TEXT,
      amount       REAL,
      payment_mode TEXT,
      created_by   TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS departure_register (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id    INTEGER,
      mva_id       TEXT,
      full_name    TEXT,
      date         TEXT,
      reason       TEXT,
      remarks      TEXT,
      recorded_by  TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  // Add newer member columns if the table pre-dates them
  const memberCols = db.prepare(`PRAGMA table_info(members)`).all().map(c => c.name);
  const addCol = (name, ddl) => {
    if (!memberCols.includes(name)) db.exec(`ALTER TABLE members ADD COLUMN ${ddl}`);
  };
  addCol('card_status', `card_status TEXT DEFAULT 'draft'`);
  addCol('last_renewal', `last_renewal TEXT`);
  addCol('photo', `photo TEXT`);          // base64 data URL
  addCol('signature', `signature TEXT`);  // base64 data URL
  addCol('departure_date', `departure_date TEXT`);
  addCol('departure_reason', `departure_reason TEXT`);
  addCol('family_member_id', `family_member_id TEXT`);   // explicit "linked to" pointer
  addCol('family_group_id', `family_group_id TEXT`);     // shared key for a family group
}

function hashPassword(password) {
  // Simple hash for demo - not secure for production
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

function initDemoUsers() {
  const users = [
    { username: 'admin', password: 'admin123', full_name: 'Administrator', role: 'superadmin' },
    { username: 'operator', password: 'oper123', full_name: 'Operator', role: 'operator' },
    { username: 'viewer', password: 'view123', full_name: 'Viewer', role: 'viewer' }
  ];

  users.forEach(user => {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO users (username, password_hash, full_name, role)
        VALUES (?, ?, ?, ?)
      `).run(user.username, hashPassword(user.password), user.full_name, user.role);
    } catch (e) {
      // Already exists
    }
  });
}

initSchema();
initDemoUsers();

module.exports = db;
