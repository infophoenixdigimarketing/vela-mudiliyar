import { useState, useEffect, useMemo } from 'react';
import { Search, Image as ImageIcon, MessageCircle, MessageSquare, Send } from 'lucide-react';
import { getAllMembers, waLink } from '../lib/memberStore';
import { uploadAnnouncementImage, sendSmsAnnouncement } from '../lib/announcements';

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

  useEffect(() => {
    setMembers(getAllMembers());
  }, []);

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
