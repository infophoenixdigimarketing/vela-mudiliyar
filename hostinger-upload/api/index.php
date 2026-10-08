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

$pdo->exec("CREATE TABLE IF NOT EXISTS site_content (
  page VARCHAR(50) PRIMARY KEY,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

foreach (['members', 'receipts', 'departures', 'history'] as $t) {
  $pdo->exec("CREATE TABLE IF NOT EXISTS $t (
    id BIGINT PRIMARY KEY,
    data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

$pdo->exec("CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(100) PRIMARY KEY,
  value LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// One row per (member, calendar day) a birthday SMS was actually sent — lets the
// unattended cron run safely more than once a day without double-messaging anyone.
$pdo->exec("CREATE TABLE IF NOT EXISTS birthday_sms_log (
  member_id BIGINT NOT NULL,
  sent_date DATE NOT NULL,
  PRIMARY KEY (member_id, sent_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

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

// ---------- Generic key/value app settings (mirrors server/lib/settingsStore.js) ----------
function get_app_setting($pdo, $key, $default = null) {
  $stmt = $pdo->prepare("SELECT value FROM app_settings WHERE `key` = ?");
  $stmt->execute([$key]);
  $row = $stmt->fetchColumn();
  if ($row === false) return $default;
  $decoded = json_decode($row, true);
  return $decoded;
}

function set_app_setting($pdo, $key, $value) {
  $pdo->prepare("INSERT INTO app_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)")
      ->execute([$key, json_encode($value, JSON_UNESCAPED_UNICODE)]);
}

// ---------- SMS gateway (mirrors server/routes/announcements.js) ----------
function fill_template($template, $values) {
  return preg_replace_callback('/\{(\w+)\}/', function ($m) use ($values) {
    return $values[$m[1]] ?? '';
  }, $template);
}

function normalize_phone($raw) {
  $digits = preg_replace('/\D/', '', $raw ?? '');
  if ($digits === '') return '';
  return strlen($digits) === 10 ? '91' . $digits : $digits;
}

// Sends $message to each of $members through the configured gateway. Mutates
// $gateway['credits'] downward as it goes (caller persists it afterwards) and
// returns ['results' => [...], 'sentCount' => N]. $alreadySent is an optional
// [member_id => true] map of people to skip (used by the birthday cron so a
// second run the same day can't re-send).
function send_sms_to_members($gateway, $members, $message, $alreadySent = [], $dryRun = false) {
  $results = [];
  $sentCount = 0;

  foreach ($members as $m) {
    $id = $m['id'];
    $name = $m['full_name'] ?? '';

    if (isset($alreadySent[$id])) {
      $results[] = ['id' => $id, 'name' => $name, 'ok' => false, 'error' => 'Already sent today'];
      continue;
    }
    $phone = normalize_phone($m['phone'] ?? ($m['whatsapp'] ?? ''));
    if (!$phone) {
      $results[] = ['id' => $id, 'name' => $name, 'ok' => false, 'error' => 'No phone number on file'];
      continue;
    }
    if (($gateway['credits'] ?? 0) <= $sentCount) {
      $results[] = ['id' => $id, 'name' => $name, 'ok' => false, 'error' => 'Out of SMS credits'];
      continue;
    }

    if ($dryRun) {
      $results[] = ['id' => $id, 'name' => $name, 'ok' => true, 'dry_run' => true];
      $sentCount++;
      continue;
    }

    $values = [
      'phone' => $phone, 'message' => $message,
      'api_key' => $gateway['api_key'] ?? '', 'sender_id' => $gateway['sender_id'] ?? '',
    ];
    $url = fill_template($gateway['url_template'], array_map('rawurlencode', $values));
    $method = ($gateway['method'] ?? 'GET') === 'POST' ? 'POST' : 'GET';

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    if ($method === 'POST') {
      curl_setopt($ch, CURLOPT_POST, true);
      if (!empty($gateway['body_template'])) {
        $isJson = ($gateway['body_format'] ?? '') === 'json';
        $bodyValues = $isJson
          ? array_map(fn($v) => substr(json_encode($v, JSON_UNESCAPED_UNICODE), 1, -1), $values)
          : array_map('rawurlencode', $values);
        curl_setopt($ch, CURLOPT_POSTFIELDS, fill_template($gateway['body_template'], $bodyValues));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
          $isJson ? 'Content-Type: application/json' : 'Content-Type: application/x-www-form-urlencoded',
        ]);
      }
    }

    $responseBody = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($responseBody !== false && $status >= 200 && $status < 300) {
      $sentCount++;
      $results[] = ['id' => $id, 'name' => $name, 'ok' => true];
    } else {
      $err = $curlErr ?: ('Gateway returned ' . $status . ($responseBody ? ': ' . substr($responseBody, 0, 200) : ''));
      $results[] = ['id' => $id, 'name' => $name, 'ok' => false, 'error' => $err];
    }
  }

  return ['results' => $results, 'sentCount' => $sentCount];
}

// ---------- Brochure website content ----------
function site_text($value, $max = 6000) {
  return is_string($value) ? mb_substr(trim($value), 0, $max) : '';
}

function clean_site_about($body) {
  $input = is_array($body['sections'] ?? null) ? $body['sections'] : [];
  if (count($input) > 20) fail('Up to 20 sections allowed');
  $sections = [];
  foreach ($input as $raw) {
    $raw = is_array($raw) ? $raw : [];
    $s = [
      'image_url' => site_text($raw['image_url'] ?? '', 300),
      'image_alt' => site_text($raw['image_alt'] ?? '', 300),
      'caption' => site_text($raw['caption'] ?? '', 300),
      'description' => site_text($raw['description'] ?? ''),
    ];
    if ($s['image_url'] !== '' || $s['description'] !== '') $sections[] = $s;
  }
  if (!$sections) fail('Add at least one section with a photo or description');
  return ['sections' => $sections];
}

function clean_site_leaders($body) {
  $input = is_array($body['leaders'] ?? null) ? $body['leaders'] : [];
  if (count($input) > 60) fail('Up to 60 leaders allowed');
  $leaders = [];
  foreach ($input as $raw) {
    $raw = is_array($raw) ? $raw : [];
    $l = [
      'name' => site_text($raw['name'] ?? '', 200),
      'designation' => site_text($raw['designation'] ?? '', 200),
      'photo_url' => site_text($raw['photo_url'] ?? '', 300),
      'phone' => site_text($raw['phone'] ?? '', 40),
      'email' => site_text($raw['email'] ?? '', 200),
      'highlight' => ($raw['highlight'] ?? false) === true,
    ];
    if ($l['name'] !== '') $leaders[] = $l;
  }
  if (!$leaders) fail('Add at least one leader with a name');
  return [
    'heading' => site_text($body['heading'] ?? '', 200),
    'subtitle' => site_text($body['subtitle'] ?? '', 300),
    'leaders' => $leaders,
  ];
}

$site_pages = ['about' => 'clean_site_about', 'leaders' => 'clean_site_leaders'];

// ---------- Routing ----------
$route = trim($_GET['route'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true);

if ($route === 'health') {
  respond(['status' => 'ok', 'time' => date('c')]);
}

// GET /api/announcements/send-birthdays?secret=...  [&dry_run=1]
// Called by a Hostinger Cron Job once a day — no one needs to be logged in.
// Finds members whose date of birth is today, sends each the configured
// birthday message via the SMS gateway, and records who was sent so a second
// run the same day (e.g. a retried cron) can't double-message anyone.
// dry_run=1 reports who *would* be messaged without sending or logging anything.
if ($route === 'announcements/send-birthdays') {
  $cronSecret = $config['cron_secret'] ?? '';
  $given = $_GET['secret'] ?? '';
  if ($cronSecret === '' || strpos($cronSecret, 'CHANGE-THIS') === 0 || !hash_equals($cronSecret, $given)) {
    fail('Unauthorized', 401);
  }

  $gateway = get_app_setting($pdo, 'sms_gateway', null);
  if (!$gateway || empty($gateway['url_template'])) {
    fail('No SMS gateway configured yet — add one in Settings first.');
  }

  $dryRun = ($_GET['dry_run'] ?? '') === '1';
  $tz = new DateTimeZone($config['timezone'] ?? 'Asia/Kolkata');
  $today = new DateTime('now', $tz);
  $todayMonth = (int)$today->format('n');
  $todayDay = (int)$today->format('j');
  $todayDate = $today->format('Y-m-d');

  $rows = $pdo->query("SELECT id, data FROM members")->fetchAll(PDO::FETCH_ASSOC);
  $candidates = [];
  foreach ($rows as $row) {
    $m = json_decode($row['data'], true);
    if (!is_array($m)) continue;
    if (($m['status'] ?? '') === 'departed') continue;
    $dob = $m['dob'] ?? '';
    if (!preg_match('/^\d{4}-(\d{2})-(\d{2})/', $dob, $dm)) continue;
    if ((int)$dm[1] !== $todayMonth || (int)$dm[2] !== $todayDay) continue;
    $m['id'] = (int)$row['id'];
    $candidates[] = $m;
  }

  $alreadySent = [];
  if ($candidates) {
    $ids = array_column($candidates, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT member_id FROM birthday_sms_log WHERE sent_date = ? AND member_id IN ($placeholders)");
    $stmt->execute(array_merge([$todayDate], $ids));
    $alreadySent = array_flip($stmt->fetchAll(PDO::FETCH_COLUMN));
  }

  $message = get_app_setting($pdo, 'birthday_message', null) ?: (
    'Happy Birthday from all of us at Mysore Vellala Association (Mudaliar Sangam)! ' .
    'Wishing you a wonderful year ahead filled with health and happiness.'
  );

  $outcome = send_sms_to_members($gateway, $candidates, $message, $alreadySent, $dryRun);

  if (!$dryRun) {
    if ($outcome['sentCount'] > 0) {
      $gateway['credits'] = max(0, ($gateway['credits'] ?? 0) - $outcome['sentCount']);
      set_app_setting($pdo, 'sms_gateway', $gateway);
    }
    $logStmt = $pdo->prepare("INSERT IGNORE INTO birthday_sms_log (member_id, sent_date) VALUES (?, ?)");
    foreach ($outcome['results'] as $r) {
      if ($r['ok']) $logStmt->execute([$r['id'], $todayDate]);
    }
  }

  respond([
    'ok' => true,
    'date' => $todayDate,
    'dry_run' => $dryRun,
    'found' => count($candidates),
    'sent' => $outcome['sentCount'],
    'results' => $outcome['results'],
  ]);
}

if (preg_match('#^site/(about|leaders)$#', $route, $m) && $method === 'GET') {
  $stmt = $pdo->prepare("SELECT data FROM site_content WHERE page = ?");
  $stmt->execute([$m[1]]);
  $row = $stmt->fetchColumn();
  respond($row ? json_decode($row, true) : null);
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

if (preg_match('#^site/(about|leaders)$#', $route, $m) && $method === 'PUT') {
  $cleaner = $site_pages[$m[1]];
  $content = $cleaner(is_array($body) ? $body : []);
  $content['updated_at'] = date('c');
  $pdo->prepare("INSERT INTO site_content (page, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)")
      ->execute([$m[1], json_encode($content, JSON_UNESCAPED_UNICODE)]);
  respond($content);
}

if ($route === 'site/upload-image' && $method === 'POST') {
  if (!preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $body['imageDataUrl'] ?? '', $m)) {
    fail('Upload a PNG, JPG or WebP image');
  }
  $bytes = base64_decode($m[2], true);
  if ($bytes === false) fail('Invalid image data');
  if (strlen($bytes) > 8 * 1024 * 1024) fail('Image must be 8 MB or smaller');
  $type = strtolower($m[1]);
  $ext = $type === 'jpeg' ? 'jpg' : $type;
  $dir = __DIR__ . '/../uploads/site';
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  $name = time() . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
  file_put_contents("$dir/$name", $bytes);
  respond(['url' => "/uploads/site/$name"]);
}

if ($route === 'settings/sms-gateway' && $method === 'GET') {
  $cfg = get_app_setting($pdo, 'sms_gateway', null);
  if (!$cfg) respond(null);
  $apiKey = $cfg['api_key'] ?? '';
  unset($cfg['api_key']);
  $cfg['api_key_set'] = $apiKey !== '';
  $cfg['api_key_preview'] = $apiKey !== '' ? ('••••' . substr($apiKey, -4)) : '';
  respond($cfg);
}

if ($route === 'settings/sms-gateway' && $method === 'PUT') {
  $urlTemplate = $body['url_template'] ?? '';
  if (!$urlTemplate) fail('API URL is required');
  $existing = get_app_setting($pdo, 'sms_gateway', []) ?: [];
  $cfg = [
    'label' => $body['label'] ?? '',
    'url_template' => $urlTemplate,
    'method' => ($body['method'] ?? '') === 'POST' ? 'POST' : 'GET',
    'body_template' => $body['body_template'] ?? '',
    'body_format' => ($body['body_format'] ?? '') === 'json' ? 'json' : 'form',
    'api_key' => !empty($body['api_key']) ? $body['api_key'] : ($existing['api_key'] ?? ''),
    'sender_id' => $body['sender_id'] ?? '',
    'credits' => $existing['credits'] ?? 0,
  ];
  set_app_setting($pdo, 'sms_gateway', $cfg);
  respond(['success' => true]);
}

if ($route === 'settings/sms-gateway/credits' && $method === 'POST') {
  $existing = get_app_setting($pdo, 'sms_gateway', null);
  if (!$existing) fail('Configure the SMS gateway first');
  if (isset($body['set']) && is_numeric($body['set'])) {
    $existing['credits'] = max(0, (float)$body['set']);
  } elseif (isset($body['add']) && is_numeric($body['add'])) {
    $existing['credits'] = max(0, ($existing['credits'] ?? 0) + (float)$body['add']);
  } else {
    fail('"add" or "set" number is required');
  }
  set_app_setting($pdo, 'sms_gateway', $existing);
  respond(['success' => true, 'credits' => $existing['credits']]);
}

// The single birthday message shared by the manual "Send SMS to all" button
// and the unattended cron, so they never drift apart.
if ($route === 'settings/birthday-message' && $method === 'GET') {
  respond(['message' => get_app_setting($pdo, 'birthday_message', null)]);
}

if ($route === 'settings/birthday-message' && $method === 'PUT') {
  $msg = trim($body['message'] ?? '');
  if (!$msg) fail('Message is required');
  set_app_setting($pdo, 'birthday_message', $msg);
  respond(['success' => true, 'message' => $msg]);
}

if ($route === 'announcements/upload-image' && $method === 'POST') {
  if (!preg_match('#^data:image/(png|jpe?g|webp|gif);base64,(.+)$#i', $body['imageDataUrl'] ?? '', $m)) {
    fail('Upload a PNG, JPG, GIF or WebP image');
  }
  $bytes = base64_decode($m[2], true);
  if ($bytes === false) fail('Invalid image data');
  if (strlen($bytes) > 8 * 1024 * 1024) fail('Image must be 8 MB or smaller');
  $type = strtolower($m[1]);
  $ext = $type === 'jpeg' ? 'jpg' : $type;
  $dir = __DIR__ . '/../uploads/announcements';
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  $name = time() . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
  file_put_contents("$dir/$name", $bytes);
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  respond(['url' => "$scheme://{$_SERVER['HTTP_HOST']}/uploads/announcements/$name"]);
}

// POST /api/announcements/send  { memberIds, message, imageUrl? } — the manual
// "Send Announcement" button and the Birthdays panel's "Send SMS to all" button.
if ($route === 'announcements/send' && $method === 'POST') {
  if ($auth['r'] === 'viewer') fail('Viewers cannot make changes', 403);

  $memberIds = $body['memberIds'] ?? null;
  if (!is_array($memberIds) || count($memberIds) === 0) fail('Select at least one member');
  $message = trim($body['message'] ?? '');
  if ($message === '') fail('Message text is required');

  $gateway = get_app_setting($pdo, 'sms_gateway', null);
  if (!$gateway || empty($gateway['url_template'])) {
    fail('No SMS gateway configured yet — add one in Settings first.');
  }

  $finalMessage = !empty($body['imageUrl']) ? ($message . "\n\nView image: " . $body['imageUrl']) : $message;

  $ids = array_map('intval', $memberIds);
  $placeholders = implode(',', array_fill(0, count($ids), '?'));
  $rows = $pdo->prepare("SELECT id, data FROM members WHERE id IN ($placeholders)");
  $rows->execute($ids);
  $members = [];
  foreach ($rows->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $m = json_decode($row['data'], true);
    if (is_array($m)) { $m['id'] = (int)$row['id']; $members[] = $m; }
  }

  $outcome = send_sms_to_members($gateway, $members, $finalMessage);
  if ($outcome['sentCount'] > 0) {
    $gateway['credits'] = max(0, ($gateway['credits'] ?? 0) - $outcome['sentCount']);
    set_app_setting($pdo, 'sms_gateway', $gateway);
  }

  respond([
    'sentCount' => $outcome['sentCount'],
    'total' => count($members),
    'creditsRemaining' => $gateway['credits'] ?? 0,
    'results' => $outcome['results'],
  ]);
}

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
