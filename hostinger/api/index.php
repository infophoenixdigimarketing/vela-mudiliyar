<?php
// ============================================================
// MVA Membership System — API (PHP + MySQL, Hostinger-ready)
// Routes: login, me, members, receipts, departures, history, health
// Data is stored as JSON documents keyed by client id — the React
// app is the source of truth for the record shape.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$config = require __DIR__ . '/config.php';

function respond($data, $code = 200) {
  http_response_code($code);
  echo json_encode($data);
  exit;
}

function fail($msg, $code = 400) {
  respond(['error' => $msg], $code);
}

// ---------- DB ----------
try {
  $pdo = new PDO(
    "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
    $config['db_user'],
    $config['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
} catch (Exception $e) {
  fail('Database connection failed. Check api/config.php credentials.', 500);
}

// Auto-create tables on first run
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'operator'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

foreach (['members', 'receipts', 'departures', 'history'] as $t) {
  $pdo->exec("CREATE TABLE IF NOT EXISTS $t (
    id BIGINT PRIMARY KEY,
    data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

// Seed default users once (change passwords after first login!)
$count = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
if ($count === 0) {
  $seed = $pdo->prepare("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)");
  $seed->execute(['admin',    password_hash('admin123', PASSWORD_BCRYPT), 'Administrator', 'superadmin']);
  $seed->execute(['operator', password_hash('oper123',  PASSWORD_BCRYPT), 'Operator',      'operator']);
  $seed->execute(['viewer',   password_hash('view123',  PASSWORD_BCRYPT), 'Viewer',        'viewer']);
}

// ---------- Tokens (HMAC-signed, 7-day expiry) ----------
function makeToken($user, $secret) {
  $payload = base64_encode(json_encode([
    'u' => $user['username'], 'n' => $user['full_name'], 'r' => $user['role'],
    'exp' => time() + 7 * 86400,
  ]));
  return $payload . '.' . hash_hmac('sha256', $payload, $secret);
}

function verifyToken($secret) {
  $auth = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');
  if (!preg_match('/Bearer\s+(.+)/', $auth, $m)) return null;
  $parts = explode('.', $m[1]);
  if (count($parts) !== 2) return null;
  [$payload, $sig] = $parts;
  if (!hash_equals(hash_hmac('sha256', $payload, $secret), $sig)) return null;
  $data = json_decode(base64_decode($payload), true);
  if (!$data || ($data['exp'] ?? 0) < time()) return null;
  return $data;
}

// ---------- Routing ----------
$route = trim($_GET['route'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true);

if ($route === 'health') {
  respond(['status' => 'ok', 'time' => date('c')]);
}

if ($route === 'login' && $method === 'POST') {
  $username = trim($body['username'] ?? '');
  $password = $body['password'] ?? '';
  $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
  $stmt->execute([$username]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$user || !password_verify($password, $user['password_hash'])) {
    fail('Invalid username or password', 401);
  }
  respond([
    'token' => makeToken($user, $config['secret']),
    'user' => [
      'id' => (int)$user['id'],
      'username' => $user['username'],
      'full_name' => $user['full_name'],
      'role' => $user['role'],
    ],
  ]);
}

// Everything below requires a valid token
$auth = verifyToken($config['secret']);
if (!$auth) fail('Unauthorized — please log in', 401);

if ($route === 'me') {
  respond(['username' => $auth['u'], 'full_name' => $auth['n'], 'role' => $auth['r']]);
}

if ($route === 'change-password' && $method === 'POST') {
  $current = $body['current'] ?? '';
  $new = $body['new'] ?? '';
  if (strlen($new) < 6) fail('New password must be at least 6 characters');
  $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
  $stmt->execute([$auth['u']]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$user || !password_verify($current, $user['password_hash'])) fail('Current password is wrong', 401);
  $pdo->prepare("UPDATE users SET password_hash = ? WHERE username = ?")
      ->execute([password_hash($new, PASSWORD_BCRYPT), $auth['u']]);
  respond(['ok' => true]);
}

// Generic JSON-document collections
$collections = ['members', 'receipts', 'departures', 'history'];
if (in_array($route, $collections, true)) {
  // Viewers can read but not write
  if ($method !== 'GET' && $auth['r'] === 'viewer') {
    fail('Viewers cannot make changes', 403);
  }

  if ($method === 'GET') {
    $rows = $pdo->query("SELECT data FROM $route ORDER BY id DESC")->fetchAll(PDO::FETCH_COLUMN);
    respond(array_map(fn($r) => json_decode($r, true), $rows));
  }

  if ($method === 'POST') {
    // Accept a single object or an array of objects; upsert by id
    $items = isset($body[0]) || $body === [] ? $body : [$body];
    if (!is_array($items)) fail('Invalid payload');
    $stmt = $pdo->prepare(
      "INSERT INTO $route (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)"
    );
    $saved = 0;
    foreach ($items as $item) {
      if (!is_array($item) || !isset($item['id'])) continue;
      $stmt->execute([(int)$item['id'], json_encode($item, JSON_UNESCAPED_UNICODE)]);
      $saved++;
    }
    respond(['ok' => true, 'saved' => $saved]);
  }

  if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) fail('id required');
    $pdo->prepare("DELETE FROM $route WHERE id = ?")->execute([$id]);
    respond(['ok' => true]);
  }
}

fail('Route not found: ' . $route, 404);
