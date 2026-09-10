# MVA Membership Management System — Complete Project Handover

> **Purpose of this file:** Full briefing for continuing development on another machine / with another Claude session. Read this top-to-bottom before touching code — it contains hard-won lessons (especially about PDF generation) that will save hours.

---

## 1. What this project is

A **Membership Management System for Mysore Vellala Association (MVA)** (also called Mudaliar Sangham), Mysuru, Karnataka, India. Built for a real customer. The association manages ~thousands of members, issues printed **ID cards**, collects membership fees, and communicates via **WhatsApp**.

**Client's key requirements (all implemented):**
- Member database with the full official application form fields
- Professional ID card generation matching their exact approved design (bilingual English/Kannada)
- WhatsApp verification workflow: send card details to member → member replies APPROVED → then print
- Excel import/export of members
- Fee receipts with voucher numbers
- Annual renewal tracking with WhatsApp reminders
- Print history (who printed what, when)
- Family grouping (members sharing a phone number)
- Departure register (deceased/relocated members)
- Secretary signature upload (changes yearly when secretary changes)
- **Hosting: Hostinger** (shared hosting → PHP + MySQL backend, NOT Node)

---

## 2. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, Tailwind (via CDN in index.html), react-router-dom, lucide-react icons, dayjs |
| PDF generation | html2canvas + jsPDF (client-side) |
| Data (demo mode) | Browser localStorage via `client/src/lib/memberStore.js` |
| Data (live mode) | **PHP + MySQL API** in `hostinger/api/` (Hostinger-native) |
| Legacy backend | `server/` — Node/Express + better-sqlite3 (built earlier, superseded by PHP for Hostinger; keep as reference) |
| Fonts | Noto Sans + Noto Sans Kannada (Google Fonts, loaded in `client/index.html`) |

---

## 3. How to run (development)

```bash
cd client
npm install       # first time only
npm run dev       # → http://localhost:5173 (or 5174 if busy)
```

Production build: `cd client && npm run build` → outputs `client/dist/`.

**Login accounts (demo mode):**
| Role | Username | Password | Access |
|---|---|---|---|
| superadmin | admin | admin123 | everything incl. Settings |
| operator | operator | oper123 | add/edit, no Settings |
| viewer | viewer | view123 | read-only (edit buttons hidden, server rejects writes) |

---

## 4. Project structure (the parts that matter)

```
vella mudiliyar/
├── client/                      # React app
│   ├── index.html               # Tailwind CDN + tailwind.config colors + Google Fonts
│   ├── public/assets/           # seal.png, sign.png, photo.png, logo.png (from client's Claude Design export)
│   └── src/
│       ├── App.jsx              # Routing, session restore, background syncFromServer()
│       ├── components/
│       │   ├── Layout.jsx       # Sidebar nav (9 items), mobile-collapsing
│       │   ├── IdCardTemplate.jsx  # On-screen card preview; takes `scale` prop
│       │   └── ErrorBoundary.jsx
│       ├── lib/
│       │   ├── memberStore.js   # ★ CENTRAL DATA STORE — read this file first
│       │   ├── cardAssets.js    # ★ Pre-processes card images (see §6 gotchas)
│       │   └── api.js           # fetch wrapper for /api (PHP backend)
│       └── pages/
│           ├── Login.jsx        # API-first login, demo fallback
│           ├── Dashboard.jsx    # Stats + card approval pipeline + recent members
│           ├── MemberList.jsx   # Search/filter/sort, CSV import/export, Card status column
│           ├── MemberForm.jsx   # Full official form (photo+signature upload as base64)
│           ├── MemberView.jsx   # Profile + card preview + WhatsApp workflow + single-card PDF + departure action + family section
│           ├── IdCards.jsx      # Bulk verification queue + bulk PDF
│           ├── Renewals.jsx     # Annual renewals, WhatsApp reminders, mark-renewed → auto receipt
│           ├── Receipts.jsx     # Voucher numbers MVA/YYYY/0001, A5 receipt PDF
│           ├── Families.jsx     # Auto-grouped by shared phone
│           ├── Departures.jsx   # Departure register
│           ├── PrintHistory.jsx # Who printed which cards, when
│           └── AdminSettings.jsx# Secretary signature upload, server status, backup/restore
├── hostinger/                   # ★ PRODUCTION BACKEND (PHP + MySQL)
│   ├── .htaccess                # → public_html/ (SPA fallback, api passthrough)
│   └── api/
│       ├── index.php            # Full API: login(bcrypt), members/receipts/departures/history (JSON-doc upsert), change-password, viewer write-block
│       ├── config.php           # DB credentials — user must fill from hPanel
│       └── .htaccess            # Routes to index.php?route=..., passes Authorization header
├── hostinger-upload/            # Ready-to-upload package (dist + api + htaccess) — REBUILD after code changes
├── HOSTINGER-DEPLOY.md          # Step-by-step deployment guide for the client
├── server/                      # Legacy Node/Express+SQLite backend (reference only, not deployed)
└── netlify/ + netlify.toml      # Old Netlify demo config (stale — ignore/delete)
```

---

## 5. Data architecture (IMPORTANT — how demo vs live works)

`client/src/lib/memberStore.js` is the single source all pages use. **Local-first, server-synced:**

- **Demo/offline mode** (`localStorage.serverConnected !== '1'`): 60 generated sample members ("Member 1..60", ids 1–60) + user-added members (`appMembers` key). Edits to sample members go into `memberOverrides` key.
- **Live mode** (PHP API reachable): `syncFromServer()` pulls members/receipts/departures/history from MySQL into localStorage cache; **sample members are hidden automatically**; every write goes to localStorage instantly AND is pushed to the API fire-and-forget (`pushToServer`).
- Login: tries `POST /api/login` first (bcrypt, HMAC token, 7-day expiry, stored as `apiToken`); falls back to hardcoded demo users only if the server is unreachable. Wrong password on a live server does NOT fall through.

**localStorage keys:** `appMembers`, `memberOverrides`, `receipts`, `departureRegister`, `printHistory`, `secretarySignature` (base64), `currentUser`, `token`, `apiToken`, `serverConnected`.

**Member record shape** (client-defined; server stores whole JSON doc keyed by `id`):
`id (Date.now() for new / 1-60 samples), mva_id ("MVA-ID-1234"), full_name, dob (YYYY-MM-DD), sex ('M'/'F'), blood_group, phone, whatsapp, email, occupation, relation_type, relation_name, residence_address, residence_phone, office_address, office_phone, area, pincode, membership_type ('life'/'annual'), status ('active'/'pending'/'departed'), voucher_no, introduced_by, special_remarks, photo (base64 data URL), signature (base64), card_status ('draft'/'sent'/'approved'), last_renewal, card_issue_count, date_created, departure_date, departure_reason`

**WhatsApp workflow:** `card_status` drives everything. Edit a member → resets to 'draft'. "Send for Verification" opens `wa.me/91<phone>` with prefilled message → 'sent'. Staff clicks "Mark as Approved" when member replies → 'approved'. PDF download warns if not approved. Bulk queue on IdCards page walks pending members one at a time (WhatsApp can only open one chat at a time — no API, deliberately, to avoid WhatsApp Business API cost).

---

## 6. ID CARD DESIGN — DO NOT REDESIGN. Hard-won specs + gotchas

The client iterated MANY times and finally **approved** this exact design (originally from a Claude Design export in `client/public/assets/`, incl. `card-source.jpg` reference image). Any change must be pixel-conservative.

**Card canvas: 1280 × 800 px. PDF page: exactly 101.6 × 63.5 mm (4in × 2.5in) landscape — the card IS the page, zero margins.**

Layout (identical in 3 places — keep them in sync: `IdCardTemplate.jsx` preview, `MemberView.jsx` downloadCard HTML, `IdCards.jsx` downloadBulkPDF HTML):
- **Header 300px** navy `#2f3084`, `border-bottom:5px solid #c41e3a`; seal.png 238×246 on LEFT; centered text: "Mudaliar Sangham" 38px → "Mysore Vellala Association®" 57px w/ `line-height:1.15; margin:2px 0 8px` → Kannada line 48px `line-height:1.45` (Kannada glyphs are tall — tighter overlaps!) → address 26px `margin-top:8px`
- **Body 437px** gradient white→`#e6eff9`; faint round watermark seal behind details; LEFT photo 296×334 `border:6px solid #2f3084` at left:78 top:38, **plain MVA-ID text below (NO box)** `margin-top:6px` 33px navy; RIGHT details at left:450 top:20: green member-type line, then grid `240px 26px 1fr`, 34px navy bold, `line-height:44px` (Name/DOB/Blood Group/Contact/Address), then **signature flows BELOW address in normal flow** (never absolute — it used to overlap the address) + green "Secretary"
- **Footer 58px** navy band. DOB format **DD-MM-YYYY**.

**⚠️ html2canvas gotchas discovered the hard way (do not regress):**
1. **CSS `filter` is IGNORED** by html2canvas → the watermark must be **pre-baked** grayscale+10%-alpha onto a **square 400×400 canvas** (`cardAssets.js → makeWatermark`). Square box = seal stays round (a non-square `<img>` box stretched it into an oval).
2. **Flex `gap` is unreliable** in html2canvas → use explicit margins instead.
3. **Signature white background** covered text → `cardAssets.js → makeTransparent` turns near-white pixels (RGB all >225) transparent. Works with any JPG/PNG the secretary uploads.
4. **Fonts race:** first PDF rendered fallback fonts for Kannada → both generators `await document.fonts.ready` before capture.
5. All images must be **data URLs** fetched in advance (`loadCardAssets()`), never live URLs, or capture is flaky.
6. `mix-blend-mode` also unsupported — don't rely on it.

Secretary signature source: `localStorage.secretarySignature` (uploaded in Settings) with fallback to `/assets/sign.png`.

---

## 7. Production deployment (Hostinger)

Client hosts on **Hostinger shared hosting** → PHP + MySQL (no Node). Full guide: `HOSTINGER-DEPLOY.md`. Short version:
1. hPanel → create MySQL DB + user
2. Fill `hostinger/api/config.php` (db creds + change `secret`)
3. `cd client && npm run build`
4. Upload `client/dist/*` + `hostinger/.htaccess` + `hostinger/api/` into `public_html/`
5. Test `https://domain/api/health` → `{"status":"ok"}` — first request auto-creates tables + seeds the 3 users (bcrypt)
6. **Change default passwords** (API endpoint `change-password` exists; no UI screen yet — see pending)
7. Import real members via Members → Import Excel (CSV columns supported: `MVA-ID, Name of the Member / Name, S/o Late Sridewappa / Relationship, Address, Phone Number / Phone, DOB, B-group / Blood Group`)

`hostinger-upload/` is a pre-assembled copy of all of the above — **rebuild it after any code change** (copy fresh `client/dist/*` in).

PHP API design: generic JSON-document collections (`members/receipts/departures/history` tables: `id BIGINT PK, data LONGTEXT`), upsert via `POST` (single object or array), client is source of truth for shape. Viewer role blocked from writes server-side. Auth = HMAC token in `Authorization: Bearer`.

---

## 8. Current status & PENDING work

**Done and verified building:** all features above; prod build passes (`npm run build`); mobile responsive; error boundary; backup/restore in Settings.

**Pending / next steps (in priority order):**
1. **Deploy to Hostinger** — user has the account; needs to do DB creation + config.php + upload (guide ready). Not yet done as of 2026-09-01.
2. **Change-password UI screen** in Settings (API endpoint already built in PHP: `POST /api/change-password {current, new}`).
3. **Real member data import** — need the association's actual Excel to verify column mapping.
4. Photos as base64 in MySQL LONGTEXT — fine to start; migrate to file storage if DB grows large.
5. Sequential MVA-ID assignment server-side (currently client random 4-digit — collision possible).
6. Optional later: WhatsApp Business API for true bulk auto-send (current: manual wa.me one-at-a-time queue, free), audit trail, code-splitting the 939KB bundle.
7. `netlify/` folder + `netlify.toml` are stale (old demo attempt) — safe to delete.

---

## 9. Client communication notes (context for the next Claude)

- The user (agency building this for the association) demands **working, complete, aligned** output — they compare generated PDFs against the approved reference side-by-side and will reject misalignments. Test before claiming done.
- The approved reference card: photo of "Ranganayaki H", MVA-ID-1091 — see `client/public/assets/card-source.jpg`.
- They asked for features proactively — suggesting sensible next features is welcomed.
- Print shop prints the PDF at 100% scale → card comes out exactly 4×2.5 inches. Don't change the PDF page size.
- Kannada text must render correctly (Noto Sans Kannada); the org name lines are exact — don't retype them.

---

## 10. Quick command reference

```bash
# Dev
cd client && npm run dev            # http://localhost:5173

# Build + refresh upload package (PowerShell)
cd client; npm run build
Remove-Item ..\hostinger-upload -Recurse -Force
New-Item -ItemType Directory ..\hostinger-upload
Copy-Item dist\* ..\hostinger-upload -Recurse
Copy-Item ..\hostinger\.htaccess ..\hostinger-upload
Copy-Item ..\hostinger\api ..\hostinger-upload -Recurse
```
