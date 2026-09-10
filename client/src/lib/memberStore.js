// Central member data store.
// - Demo mode (no server): sample data + local additions, all in browser storage.
// - Live mode (Hostinger API reachable): server is the source of truth; data is
//   pulled into local cache on login and every write is pushed to the server.
//   Sample members are hidden in live mode.

import { apiFetch, apiAvailable } from './api';

const AREAS = ['Ittigegudu', 'J P Nagar', 'Medar Block', 'Hunsur Town'];

export function isServerConnected() {
  return localStorage.getItem('serverConnected') === '1';
}

// Pull everything from the server into the local cache
export async function syncFromServer() {
  try {
    const ok = await apiAvailable();
    if (!ok) throw new Error('API not reachable');
    const [membersRes, receipts, departures, history] = await Promise.all([
      // GET /api/members is paginated ({ members, total, page, ... }),
      // not a bare array — request the max page size and unwrap it.
      apiFetch('members?limit=100'),
      apiFetch('receipts'),
      apiFetch('departures'),
      apiFetch('history'),
    ]);
    const members = Array.isArray(membersRes) ? membersRes : (membersRes?.members || []);
    localStorage.setItem('appMembers', JSON.stringify(members));
    localStorage.setItem('memberOverrides', '{}');
    localStorage.setItem('receipts', JSON.stringify(receipts || []));
    localStorage.setItem('departureRegister', JSON.stringify(departures || []));
    localStorage.setItem('printHistory', JSON.stringify(history || []));
    localStorage.setItem('serverConnected', '1');
    return true;
  } catch (e) {
    localStorage.setItem('serverConnected', '0');
    console.warn('Server sync unavailable — running in offline/demo mode:', e.message);
    return false;
  }
}

// Fire-and-forget push of one record to the server
function pushToServer(collection, item) {
  if (!isServerConnected()) return;
  apiFetch(collection, { method: 'POST', body: JSON.stringify(item) })
    .catch(e => console.warn(`Sync push failed (${collection}):`, e.message));
}

export function getMockMembers() {
  return Array.from({ length: 60 }, (_, i) => ({
    id: i + 1,
    mva_id: `MVA-ID-${String(i + 1).padStart(3, '0')}`,
    full_name: `Member ${i + 1}`,
    phone: `9999${String(90000 + i).padStart(5, '0')}`,
    blood_group: ['A+', 'B+', 'O+', 'AB+'][i % 4],
    area: AREAS[i % 4],
    status: i < 48 ? 'active' : (i < 56 ? 'pending' : 'departed'),
    membership_type: i % 5 === 0 ? 'annual' : 'life',
    dob: `1975-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
    residence_address: `${123 + i} Main Road, ${AREAS[i % 4]}, Mysore 570010`,
    email: `member${i}@example.com`,
    sex: i % 2 === 0 ? 'M' : 'F',
    card_status: 'draft',
    // Annual members get a last-renewal date; alternating so some are overdue
    ...(i % 5 === 0
      ? { last_renewal: i % 2 === 0 ? '2025-06-15' : '2026-03-10' }
      : {}),
  }));
}

function safeParse(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function getOverrides() {
  return safeParse('memberOverrides', {});
}

function getStoredMembers() {
  const data = safeParse('appMembers', []);
  // Defensive: guard against any stale/malformed cache (e.g. from before
  // the members-sync fix) so the app can never crash on a bad cache value.
  return Array.isArray(data) ? data : [];
}

export function getAllMembers() {
  // Live mode: only real (server-synced) members — no sample data
  if (isServerConnected()) {
    return getStoredMembers();
  }
  const overrides = getOverrides();
  const mock = getMockMembers().map(m =>
    overrides[m.id] ? { ...m, ...overrides[m.id] } : m
  );
  return [...mock, ...getStoredMembers()];
}

export function getMemberById(id) {
  return getAllMembers().find(m => String(m.id) === String(id)) || null;
}

export function saveMember(member) {
  const id = Number(member.id);
  if (!isServerConnected() && id && id <= 60) {
    // Demo mode sample member — persist as an override
    const overrides = getOverrides();
    overrides[id] = { ...overrides[id], ...member };
    localStorage.setItem('memberOverrides', JSON.stringify(overrides));
  } else {
    const stored = getStoredMembers();
    const idx = stored.findIndex(m => String(m.id) === String(member.id));
    if (idx >= 0) stored[idx] = { ...stored[idx], ...member };
    else stored.push(member);
    localStorage.setItem('appMembers', JSON.stringify(stored));
  }
  pushToServer('members', member);
  return member;
}

export function deleteMember(id) {
  const numId = Number(id);
  if (numId && numId <= 60) {
    const overrides = getOverrides();
    overrides[numId] = { ...overrides[numId], status: 'departed' };
    localStorage.setItem('memberOverrides', JSON.stringify(overrides));
  } else {
    const stored = getStoredMembers().filter(m => String(m.id) !== String(id));
    localStorage.setItem('appMembers', JSON.stringify(stored));
  }
}

// ================= Current user =================
export function getCurrentUser() {
  return safeParse('currentUser', null);
}

export function canEdit() {
  const u = getCurrentUser();
  return u?.role === 'superadmin' || u?.role === 'operator';
}

// ================= WhatsApp helper =================
export function waLink(phoneRaw, message) {
  const digits = (phoneRaw || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? '91' + digits : digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function verificationMessage(m) {
  return `*Mysore Vellala Association — ID Card Verification*

Namaste ${m.full_name},
Please verify your ID card details below:

MVA-ID: ${m.mva_id}
Name: ${m.full_name}
DOB: ${m.dob || '—'}
Blood Group: ${m.blood_group || '—'}
Contact: ${m.phone || '—'}
Address: ${m.residence_address || '—'}

✅ Reply *APPROVED* if all details are correct.
✏️ Reply with corrections if anything is wrong.

Card will be printed only after your approval. Thank you!`;
}

// ================= SMS helper =================
export function smsLink(phoneRaw, message) {
  const digits = (phoneRaw || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? '+91' + digits : (digits ? `+${digits}` : '');
  const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
  return `sms:${phone}${sep}body=${encodeURIComponent(message)}`;
}

// Plain-text version of the verification message — SMS has no bold/markdown
export function verificationMessageSms(m) {
  return `Mysore Vellala Association - ID Card Verification

Namaste ${m.full_name},
Please verify your ID card details below:

MVA-ID: ${m.mva_id}
Name: ${m.full_name}
DOB: ${m.dob || '—'}
Blood Group: ${m.blood_group || '—'}
Contact: ${m.phone || '—'}
Address: ${m.residence_address || '—'}

Reply APPROVED if all details are correct.
Reply with corrections if anything is wrong.

Card will be printed only after your approval. Thank you!`;
}

// ================= Print history =================
export function logPrint(members) {
  const history = safeParse('printHistory', []);
  const user = getCurrentUser();
  const entry = {
    id: Date.now(),
    at: new Date().toISOString(),
    by: user?.full_name || user?.username || 'Unknown',
    role: user?.role || '',
    members: members.map(m => ({ id: m.id, mva_id: m.mva_id, full_name: m.full_name })),
  };
  history.unshift(entry);
  localStorage.setItem('printHistory', JSON.stringify(history.slice(0, 500)));
  pushToServer('history', entry);
  members.forEach(m =>
    saveMember({ ...m, card_issue_count: (m.card_issue_count || 0) + 1 })
  );
}

export function getPrintHistory() {
  return safeParse('printHistory', []);
}

// ================= Family grouping =================
export function getFamilies() {
  const byPhone = {};
  getAllMembers().forEach(m => {
    const p = (m.phone || '').trim();
    if (!p) return;
    (byPhone[p] = byPhone[p] || []).push(m);
  });
  return Object.entries(byPhone)
    .filter(([, list]) => list.length > 1)
    .map(([phone, list]) => ({ phone, members: list }));
}

export function getFamilyOf(member) {
  if (!member?.phone) return [];
  return getAllMembers().filter(
    m => m.phone === member.phone && String(m.id) !== String(member.id)
  );
}

// ================= Departure register =================
export function recordDeparture(member, { date, reason, remarks }) {
  const reg = safeParse('departureRegister', []);
  const entry = {
    id: Date.now(),
    member_id: member.id,
    mva_id: member.mva_id,
    full_name: member.full_name,
    date,
    reason,
    remarks: remarks || '',
    recorded_by: getCurrentUser()?.full_name || 'Unknown',
    recorded_at: new Date().toISOString(),
  };
  reg.unshift(entry);
  localStorage.setItem('departureRegister', JSON.stringify(reg));
  pushToServer('departures', entry);
  saveMember({
    ...member,
    status: 'departed',
    departure_date: date,
    departure_reason: reason,
  });
}

export function getDepartureRegister() {
  return safeParse('departureRegister', []);
}

// ================= Receipts =================
export function getReceipts() {
  return safeParse('receipts', []);
}

export function nextVoucherNo() {
  const year = new Date().getFullYear();
  const seq =
    getReceipts().filter(r => (r.voucher_no || '').includes(`/${year}/`)).length + 1;
  return `MVA/${year}/${String(seq).padStart(4, '0')}`;
}

export function saveReceipt(receipt) {
  const receipts = getReceipts();
  const rec = {
    id: Date.now(),
    voucher_no: nextVoucherNo(),
    created_at: new Date().toISOString(),
    created_by: getCurrentUser()?.full_name || 'Unknown',
    ...receipt,
  };
  receipts.unshift(rec);
  localStorage.setItem('receipts', JSON.stringify(receipts));
  pushToServer('receipts', rec);
  return rec;
}

// ================= Renewals =================
export function getRenewalInfo(m) {
  if (m.membership_type !== 'annual') return null;
  const last = m.last_renewal || m.date_of_membership || m.date_created;
  if (!last) return { due: true, last: null, dueDate: null };
  const dueDate = new Date(last);
  dueDate.setFullYear(dueDate.getFullYear() + 1);
  return {
    due: dueDate <= new Date(),
    last: String(last).slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
  };
}

export function getAnnualMembers() {
  return getAllMembers().filter(
    m => m.membership_type === 'annual' && m.status !== 'departed'
  );
}

export function markRenewed(member, { amount, payment_mode }) {
  const today = new Date().toISOString().slice(0, 10);
  saveMember({ ...member, last_renewal: today });
  return saveReceipt({
    member_id: member.id,
    mva_id: member.mva_id,
    member_name: member.full_name,
    purpose: 'Annual Membership Renewal',
    amount,
    payment_mode,
  });
}
