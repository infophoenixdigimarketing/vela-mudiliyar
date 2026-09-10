# MVA Membership System — Hostinger Deployment Guide

The app has two parts, both hosted on your Hostinger plan:
- **Frontend**: the built React app (static files) → `public_html/`
- **Backend**: PHP API + MySQL database → `public_html/api/`

No Node.js needed on the server — everything runs on standard Hostinger shared hosting.

---

## Step 1 — Create the MySQL database

1. Log in to **Hostinger hPanel**
2. Go to **Databases → MySQL Databases**
3. Create a new database, e.g. `u123456789_mva`
4. Create a database user, e.g. `u123456789_mvauser` with a strong password
5. Assign the user to the database with **All Privileges**
6. Note down: database name, username, password

## Step 2 — Configure the API

1. Open `hostinger/api/config.php` in this project
2. Fill in your database name, user, and password from Step 1
3. Change the `secret` value to any long random string

## Step 3 — Build the frontend

On your computer:
```
cd client
npm run build
```
This creates the `client/dist/` folder.

## Step 4 — Upload to Hostinger

Using hPanel **File Manager** (or FTP), upload into `public_html/`:

```
public_html/
├── index.html          ← from client/dist/
├── assets/             ← from client/dist/assets/ (JS, CSS, seal.png, sign.png, ...)
├── .htaccess           ← from hostinger/.htaccess
└── api/
    ├── index.php       ← from hostinger/api/
    ├── config.php      ← from hostinger/api/ (with YOUR credentials filled in)
    └── .htaccess       ← from hostinger/api/
```

## Step 5 — Test

1. Visit `https://yourdomain.com/api/health` → should show `{"status":"ok",...}`
   - If you see a database error, re-check `config.php` credentials
2. Visit `https://yourdomain.com` → login page appears
3. Log in with **admin / admin123**
   - First login auto-creates all database tables and the 3 user accounts
4. Go to **Settings** → Server Connection should show **● Live**

## Step 6 — Secure it (IMPORTANT)

1. The default accounts are `admin/admin123`, `operator/oper123`, `viewer/view123`
   — change these passwords immediately (via phpMyAdmin: users table, or ask the developer to add the change-password screen; the API endpoint `change-password` is already built)
2. In hPanel, make sure **SSL (HTTPS)** is enabled for the domain (free Let's Encrypt)

## Step 7 — Load real member data

1. Log in as admin
2. Go to **Members → Import Excel** and upload the association's member CSV
3. All imported members are saved to the MySQL database automatically
4. The 60 sample members ("Member 1..60") disappear automatically once the server is live

---

## How the modes work

| Situation | Behaviour |
|---|---|
| API deployed & reachable | **Live mode** — data in MySQL, shared across all staff, sample data hidden |
| API not reachable | **Offline/demo mode** — browser storage, sample data shown, demo logins work |

The mode indicator is in **Settings → Server Connection**.

## Roles

| Account | Can do |
|---|---|
| superadmin | Everything incl. Settings, signature upload |
| operator | Add/edit members, print cards, receipts |
| viewer | View only — edit/import buttons hidden, server rejects writes |

## Backups

- **Settings → Download Full Backup** any time (JSON file)
- Hostinger also backs up MySQL — hPanel → Backups
