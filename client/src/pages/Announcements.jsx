import { useState, useEffect, useMemo } from 'react';
import { Search, Image as ImageIcon, MessageCircle, MessageSquare, Send, Cake } from 'lucide-react';
import { getAllMembers, waLink } from '../lib/memberStore';
import { uploadAnnouncementImage, sendSmsAnnouncement } from '../lib/announcements';

const DEFAULT_BIRTHDAY_MESSAGE =
  'Happy Birthday from all of us at Mysore Vellala Association (Mudaliar Sangam)! ' +
  'Wishing you a wonderful year ahead filled with health and happiness. 🎂';

// Parses "YYYY-MM-DD" without timezone surprises (new Date('YYYY-MM-DD') is UTC midnight,
// which can land on the wrong local day near midnight).
function parseDob(dob) {
  if (!dob) return null;
  const [y, m, d] = dob.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

export default function Announcements() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null); // { dataUrl, name }
  const [channels, setChannels] = useState({ sms: false, whatsapp: true });

  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const [smsError, setSmsError] = useState('');

  const [waQueue, setWaQueue] = useState(null); // { members: [...], sentIds: [] }

  // Today's Birthdays
  const [birthdayMessage, setBirthdayMessage] = useState(DEFAULT_BIRTHDAY_MESSAGE);
  const [bdaySending, setBdaySending] = useState(false);
  const [bdayResult, setBdayResult] = useState(null);
  const [bdayError, setBdayError] = useState('');
  const [bdayWaQueue, setBdayWaQueue] = useState(null); // { members: [...], sentIds: [] }

  useEffect(() => {
    setMembers(getAllMembers());
  }, []);

  const todaysBirthdays = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    return members
      .filter(m => m.status !== 'departed')
      .map(m => ({ member: m, dob: parseDob(m.dob) }))
      .filter(({ dob }) => dob && dob.month === todayMonth && dob.day === todayDay)
      .map(({ member, dob }) => ({
        ...member,
        turningAge: dob.year > 1900 ? today.getFullYear() - dob.year : null,
      }));
  }, [members]);

  const bdayWaPending = bdayWaQueue ? bdayWaQueue.members.filter(m => !bdayWaQueue.sentIds.includes(m.id)) : [];

  const sendNextBirthdayWhatsapp = () => {
    const next = bdayWaPending[0];
    if (!next) return;
    window.open(waLink(next.whatsapp || next.phone, birthdayMessage), '_blank');
    setBdayWaQueue(prev => ({ ...prev, sentIds: [...prev.sentIds, next.id] }));
  };

  const sendBirthdaySms = async () => {
    setBdayError('');
    setBdayResult(null);
    if (!birthdayMessage.trim()) {
      setBdayError('Write a birthday message first.');
      return;
    }
    setBdaySending(true);
    try {
      const result = await sendSmsAnnouncement({
        memberIds: todaysBirthdays.map(m => m.id),
        message: birthdayMessage,
      });
      setBdayResult(result);
    } catch (err) {
      setBdayError('SMS send failed: ' + err.message + ' — make sure the server is running and a gateway is configured in Settings.');
    } finally {
      setBdaySending(false);
    }
  };

  const areas = useMemo(
    () => [...new Set(members.map(m => m.area).filter(Boolean))].sort(),
    [members]
  );

  const filteredMembers = useMemo(() => {
    let list = members;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.full_name?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.mva_id?.toLowerCase().includes(q)
      );
    }
    if (areaFilter) list = list.filter(m => m.area === areaFilter);
    if (statusFilter) list = list.filter(m => m.status === statusFilter);
    return list;
  }, [members, search, areaFilter, statusFilter]);

  const toggleMember = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredMembers.map(m => m.id);
    const allSelected = filteredIds.every(id => selectedIds.includes(id)) && filteredIds.length > 0;
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setImage({ dataUrl: event.target?.result, name: file.name });
    reader.readAsDataURL(file);
  };

  const resetSendState = () => {
    setSmsResult(null);
    setSmsError('');
    setWaQueue(null);
  };

  const handleSend = async () => {
    resetSendState();
    if (selectedIds.length === 0) {
      setSmsError('Select at least one member first.');
      return;
    }
    if (!message.trim()) {
      setSmsError('Write a message first.');
      return;
    }
    if (!channels.sms && !channels.whatsapp) {
      setSmsError('Choose at least one channel — SMS or WhatsApp.');
      return;
    }

    const selectedMembers = members.filter(m => selectedIds.includes(m.id));

    if (channels.sms) {
      setSmsSending(true);
      try {
        let imageUrl = '';
        if (image) {
          const uploaded = await uploadAnnouncementImage(image.dataUrl);
          imageUrl = uploaded.url;
        }
        const result = await sendSmsAnnouncement({ memberIds: selectedIds, message, imageUrl });
        setSmsResult(result);
      } catch (err) {
        setSmsError('SMS send failed: ' + err.message + ' — make sure the server is running and a gateway is configured in Settings.');
      } finally {
        setSmsSending(false);
      }
    }

    if (channels.whatsapp) {
      setWaQueue({ members: selectedMembers, sentIds: [] });
    }
  };

  const waPending = waQueue ? waQueue.members.filter(m => !waQueue.sentIds.includes(m.id)) : [];

  const sendNextWhatsapp = () => {
    const next = waPending[0];
    if (!next) return;
    window.open(waLink(next.whatsapp || next.phone, message), '_blank');
    setWaQueue(prev => ({ ...prev, sentIds: [...prev.sentIds, next.id] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">Announcements</h1>
        <p className="text-gray-600 mt-1">Send a message to selected members via SMS and/or WhatsApp.</p>
      </div>

      {/* Today's Birthdays — picked up automatically from each member's date of birth */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-1">
          <Cake size={22} className="text-saffron" />
          <h2 className="text-lg font-bold text-navy">Today's Birthdays</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} — found automatically from members' date of birth.
        </p>

        {todaysBirthdays.length === 0 ? (
          <p className="text-sm text-gray-500">No members have a birthday today.</p>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-gray-100 border rounded-lg">
              {todaysBirthdays.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {m.full_name}
                      {m.turningAge && <span className="text-gray-500 font-normal"> · turning {m.turningAge}</span>}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{m.mva_id} · {m.phone}</p>
                  </div>
                  <a
                    href={waLink(m.whatsapp || m.phone, birthdayMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-[#25D366] hover:underline flex-none ml-3"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Birthday message</label>
              <textarea
                value={birthdayMessage}
                onChange={(e) => setBirthdayMessage(e.target.value)}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={sendBirthdaySms}
                disabled={bdaySending}
                className="flex items-center gap-2 bg-navy text-white px-5 py-2 rounded-lg hover:bg-navy-deep transition font-medium text-sm disabled:opacity-50"
              >
                <MessageSquare size={16} /> {bdaySending ? 'Sending SMS...' : `Send SMS to all ${todaysBirthdays.length}`}
              </button>
              <button
                onClick={() => setBdayWaQueue({ members: todaysBirthdays, sentIds: [] })}
                className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-lg hover:opacity-90 transition font-medium text-sm"
              >
                <MessageCircle size={16} /> Send WhatsApp one by one
              </button>
            </div>

            {bdayError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{bdayError}</div>
            )}
            {bdayResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                SMS: sent {bdayResult.sentCount} of {bdayResult.total} · {bdayResult.creditsRemaining} credits remaining
              </div>
            )}
            {bdayWaQueue && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-green-900">
                  WhatsApp: {bdayWaQueue.sentIds.length} of {bdayWaQueue.members.length} opened
                </p>
                {bdayWaPending.length > 0 ? (
                  <button
                    onClick={sendNextBirthdayWhatsapp}
                    className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-lg hover:opacity-90 transition font-medium text-sm"
                  >
                    <MessageCircle size={16} /> Send Next ({bdayWaPending.length} left) — Next: {bdayWaPending[0].full_name}
                  </button>
                ) : (
                  <p className="text-xs text-green-800">All WhatsApp messages have been opened.</p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              SMS sends immediately to everyone above through the gateway configured in Settings.
              WhatsApp opens one pre-filled chat at a time — press "Send" in each window, same as the announcement composer below.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member selection */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col min-h-[28rem]">
          <h2 className="text-lg font-bold text-navy mb-4">1. Select Members</h2>

          <div className="space-y-3 mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone or MVA ID..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">All Areas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="departed">Departed</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={selectAllFiltered}
                className="text-sm font-medium text-navy hover:underline"
              >
                Select / Deselect all filtered ({filteredMembers.length})
              </button>
              <span className="text-sm text-gray-600">{selectedIds.length} selected</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 border rounded-lg">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-gray-500 p-4">No members match these filters.</p>
            ) : (
              filteredMembers.map(m => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-card-blue cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="w-4 h-4 rounded border-gray-300 text-navy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.full_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{m.mva_id} · {m.phone}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Compose */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <h2 className="text-lg font-bold text-navy mb-4">2. Compose & Send</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="5"
                placeholder="Write the announcement text..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image (optional)</label>
              <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
                <ImageIcon size={20} className="text-gray-500" />
                <span className="text-sm text-gray-600">{image ? image.name : 'Click to attach an image'}</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {image && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={image.dataUrl} alt="Preview" className="h-16 rounded border" />
                  <button onClick={() => setImage(null)} className="text-xs text-red-600 hover:underline">Remove</button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                WhatsApp messages open with the image ready to attach manually. SMS is text-only, so a link to the image is appended automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send Via</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={channels.whatsapp}
                    onChange={(e) => setChannels(prev => ({ ...prev, whatsapp: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-navy"
                  />
                  <MessageCircle size={16} className="text-[#25D366]" /> WhatsApp
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={channels.sms}
                    onChange={(e) => setChannels(prev => ({ ...prev, sms: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-navy"
                  />
                  <MessageSquare size={16} className="text-navy" /> SMS (bulk, via gateway)
                </label>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={smsSending}
              className="flex items-center gap-2 bg-navy text-white px-6 py-2.5 rounded-lg hover:bg-navy-deep transition font-medium disabled:opacity-50"
            >
              <Send size={18} /> {smsSending ? 'Sending SMS...' : 'Send Announcement'}
            </button>

            {smsError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{smsError}</div>
            )}

            {smsResult && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 space-y-1">
                <p className="font-semibold">
                  SMS: sent {smsResult.sentCount} of {smsResult.total} · {smsResult.creditsRemaining} credits remaining
                </p>
                {smsResult.results.filter(r => !r.ok).length > 0 && (
                  <ul className="text-xs list-disc list-inside text-blue-800">
                    {smsResult.results.filter(r => !r.ok).map(r => (
                      <li key={r.id}>{r.name}: {r.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {waQueue && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-green-900">
                  WhatsApp: {waQueue.sentIds.length} of {waQueue.members.length} opened
                </p>
                {waPending.length > 0 ? (
                  <>
                    <p className="text-xs text-green-800">
                      WhatsApp opens one chat at a time. Press the button, send the pre-filled message
                      {image ? ' and attach the image manually' : ''}, then come back and press again for the next member.
                    </p>
                    <button
                      onClick={sendNextWhatsapp}
                      className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-lg hover:opacity-90 transition font-medium text-sm"
                    >
                      <MessageCircle size={16} /> Send Next ({waPending.length} left) — Next: {waPending[0].full_name}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-green-800">All WhatsApp messages have been opened.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
