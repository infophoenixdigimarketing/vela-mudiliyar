import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import IdCardTemplate from '../components/IdCardTemplate';
import { MessageCircle, MessageSquare, CheckCircle } from 'lucide-react';
import { getAllMembers, saveMember, waLink, verificationMessage, smsLink, verificationMessageSms, logPrint } from '../lib/memberStore';
import { loadCardAssets } from '../lib/cardAssets';

export default function IdCards() {
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [memberType, setMemberType] = useState('life');

  useEffect(() => {
    loadMembers();
  }, [memberType]);

  const loadMembers = async () => {
    try {
      setLoading(true);

      // Filter by membership type
      const filtered = getAllMembers().filter(m => m.membership_type === memberType);
      setMembers(filtered);
      setSelectedMembers([]);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.id));
    }
  };

  // ---- Bulk WhatsApp verification queue ----
  const pendingVerification = members.filter(m => m.card_status !== 'approved');

  const sendVerification = (member) => {
    window.open(waLink(member.whatsapp || member.phone, verificationMessage(member)), '_blank');
    saveMember({ ...member, card_status: 'sent', verification_sent_at: new Date().toISOString() });
    loadMembers();
  };

  const sendVerificationSms = (member) => {
    window.open(smsLink(member.phone || member.whatsapp, verificationMessageSms(member)), '_self');
    saveMember({ ...member, card_status: 'sent', verification_sent_at: new Date().toISOString() });
    loadMembers();
  };

  const sendNextPending = () => {
    const next = pendingVerification.find(m => m.card_status !== 'sent');
    if (next) {
      sendVerification(next);
    } else {
      alert('All pending members have been sent verification messages. Waiting for their approval replies.');
    }
  };

  const sendNextPendingSms = () => {
    const next = pendingVerification.find(m => m.card_status !== 'sent');
    if (next) {
      sendVerificationSms(next);
    } else {
      alert('All pending members have been sent verification messages. Waiting for their approval replies.');
    }
  };

  const markApproved = (member) => {
    saveMember({ ...member, card_status: 'approved', approved_at: new Date().toISOString() });
    loadMembers();
  };

  const downloadBulkPDF = async () => {
    if (selectedMembers.length === 0) {
      alert('Please select at least one member');
      return;
    }

    setDownloading(true);
    try {
      const membersToDownload = members.filter(m => selectedMembers.includes(m.id));
      // Exact ID card size: 4in x 2.5in (101.6mm x 63.5mm) — same ratio as the 1280x800 design
      const CARD_W = 101.6;
      const CARD_H = 63.5;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_W, CARD_H] });

      // Pre-processed images: square faint watermark + transparent signature
      const { sealDataUrl, watermarkDataUrl, signDataUrl } = await loadCardAssets();

      for (let i = 0; i < membersToDownload.length; i++) {
        if (i > 0) pdf.addPage([CARD_W, CARD_H], 'landscape');

        const member = membersToDownload[i];
        const now = Date.now();
        const containerId = `card-${now}-${i}`;

        const container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '1280px';
        container.style.height = '800px';
        container.style.backgroundColor = '#fff';
        container.style.zIndex = '-9999';
        document.body.appendChild(container);

        const dobFmt = member?.dob ? member.dob.split('T')[0].split('-').reverse().join('-') : '—';
        const cardHtml = `
          <div style="width:1280px;height:800px;font-family:'Noto Sans',sans-serif;background:#fff;margin:0;padding:0;overflow:hidden">
            <!-- HEADER -->
            <div style="height:300px;background:#2f3084;border-bottom:5px solid #c41e3a;display:flex;align-items:center;padding:0 34px 0 30px;box-sizing:border-box;gap:20px;color:#fff">
              <img src="${sealDataUrl}" style="width:238px;height:246px;flex-shrink:0;object-fit:contain"/>
              <div style="flex:1;text-align:center">
                <div style="font-size:38px;font-weight:600;letter-spacing:.2px">Mudaliar Sangham</div>
                <div style="font-size:57px;font-weight:800;line-height:1.15;letter-spacing:-.5px;white-space:nowrap;margin:2px 0 8px">Mysore Vellala Association®</div>
                <div style="font-family:'Noto Sans Kannada',sans-serif;font-size:48px;font-weight:700;line-height:1.45;white-space:nowrap">ಮೈಸೂರು ವೆಲ್ಲಾಳ ಅಸೋಸಿಯೇಷನ್(ರಿ.)</div>
                <div style="font-size:26px;font-weight:600;margin-top:8px;letter-spacing:.2px">#76, Manasara Road, Indiranagar, Ittigegudu, Mysuru - 570010</div>
              </div>
            </div>

            <!-- BODY with faint round watermark (pre-baked, square = stays round) -->
            <div style="position:relative;height:437px;background:linear-gradient(180deg,#ffffff 0%,#f2f7fd 55%,#e6eff9 100%);overflow:hidden">
              ${watermarkDataUrl ? `<img src="${watermarkDataUrl}" style="position:absolute;left:450px;top:25px;width:380px;height:380px"/>` : ''}

              <!-- LEFT: photo + plain MVA-ID text -->
              <div style="position:absolute;left:78px;top:38px;width:296px;display:flex;flex-direction:column;align-items:center">
                <div style="width:296px;height:334px;border:6px solid #2f3084;box-sizing:border-box;background:#bfe3e6;overflow:hidden;display:flex;align-items:center;justify-content:center">
                  ${member?.photo ? `<img src="${member.photo}" style="width:100%;height:100%;object-fit:cover;"/>` : `<div style="font-size:96px">${member?.sex === 'M' ? '👤' : '👩'}</div>`}
                </div>
                <div style="font-size:33px;font-weight:700;color:#1a237e;letter-spacing:.5px;margin-top:6px">${member?.mva_id || 'MVA-ID'}</div>
              </div>

              <!-- RIGHT: details, signature flows BELOW address (never overlaps) -->
              <div style="position:absolute;left:450px;top:20px;right:36px">
                <div style="font-size:37px;font-weight:600;color:#2e7d32;padding-left:110px;margin-bottom:8px">${memberType === 'life' ? 'Life Member' : 'Annual Member'}</div>
                <div style="display:grid;grid-template-columns:240px 26px 1fr;align-items:start;font-size:34px;font-weight:700;color:#1a237e;line-height:44px">
                  <div>Name</div><div>:</div><div>${member?.full_name || '—'}</div>
                  <div>DOB</div><div>:</div><div>${dobFmt}</div>
                  <div>Blood Group</div><div>:</div><div>${member?.blood_group || '—'}</div>
                  <div>Contact</div><div>:</div><div>${member?.phone || '—'}</div>
                  <div>Address</div><div>:</div><div style="word-break:break-word;line-height:1.3">${member?.residence_address || '—'}</div>
                </div>
                <div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-start">
                  ${signDataUrl ? `<img src="${signDataUrl}" style="width:180px;height:65px;object-fit:contain"/>` : ''}
                  <div style="font-size:30px;font-weight:600;color:#2e7d32;margin-top:-2px">Secretary</div>
                </div>
              </div>
            </div>

            <!-- FOOTER BAND -->
            <div style="height:58px;background:#2f3084"></div>
          </div>
        `;

        container.innerHTML = cardHtml;
        // Wait for fonts (incl. Kannada) to be ready — otherwise first PDF renders fallback fonts
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 300));

        try {
          const canvas = await html2canvas(container, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          // Card fills the whole PDF page — exact ID card size
          pdf.addImage(imgData, 'PNG', 0, 0, CARD_W, CARD_H);
        } catch (err) {
          console.error(`Card ${i} error:`, err);
        }

        document.body.removeChild(container);
      }

      pdf.save(`mva-cards-${memberType}.pdf`);
      logPrint(membersToDownload);
      loadMembers();
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Error: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-navy">ID Card Generator</h1>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Member Type</label>
          <select
            value={memberType}
            onChange={(e) => setMemberType(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
          >
            <option value="life">Life Members</option>
            <option value="annual">Annual Members</option>
          </select>
        </div>

        <div className="flex gap-4 items-center pt-4 border-t">
          <button
            onClick={selectAll}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            {selectedMembers.length === members.length && members.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </button>
          <span className="text-sm text-gray-600">
            {selectedMembers.length} of {members.length} selected
          </span>
          <button
            onClick={downloadBulkPDF}
            disabled={selectedMembers.length === 0 || downloading}
            className="ml-auto flex items-center gap-2 bg-navy text-white px-6 py-2 rounded-lg hover:bg-navy-deep transition disabled:opacity-50 font-medium"
          >
            <Download size={18} />
            {downloading ? 'Generating PDF...' : 'Download PDF Sheet'}
          </button>
        </div>
      </div>

      {/* Bulk WhatsApp Verification Queue */}
      {!loading && pendingVerification.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-navy">WhatsApp Verification Queue</h2>
              <p className="text-sm text-gray-600">
                {pendingVerification.filter(m => m.card_status !== 'sent').length} not sent · {' '}
                {pendingVerification.filter(m => m.card_status === 'sent').length} awaiting reply
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={sendNextPending}
                className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition font-medium"
              >
                <MessageCircle size={18} /> Send Next Pending (WhatsApp)
              </button>
              <button
                onClick={sendNextPendingSms}
                className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-lg hover:bg-navy-deep transition font-medium"
              >
                <MessageSquare size={18} /> Send Next Pending (SMS)
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            WhatsApp/SMS opens one message at a time — press a button, send the pre-filled message, come back and press again. When a member replies APPROVED, click the ✓.
          </p>
          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {pendingVerification.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.full_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{m.mva_id} · {m.phone}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.card_status === 'sent' && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 whitespace-nowrap">Awaiting</span>
                  )}
                  <button
                    onClick={() => sendVerification(m)}
                    title="Send verification on WhatsApp"
                    className="p-2 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition"
                  >
                    <MessageCircle size={16} />
                  </button>
                  <button
                    onClick={() => sendVerificationSms(m)}
                    title="Send verification via SMS"
                    className="p-2 rounded-lg bg-navy/10 text-navy hover:bg-navy/20 transition"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button
                    onClick={() => markApproved(m)}
                    title="Mark as approved (member replied APPROVED)"
                    className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                  >
                    <CheckCircle size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Grid */}
      {loading ? (
        <div className="text-center py-8">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No {memberType} members found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map(member => (
            <div
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                selectedMembers.includes(member.id)
                  ? 'border-navy bg-navy/5'
                  : 'border-gray-200 hover:border-navy/30'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="w-5 h-5 rounded border-gray-300 text-navy mt-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1">
                  <p className="font-bold text-navy text-sm">{member.mva_id}</p>
                  <p className="font-medium text-sm">{member.full_name}</p>
                </div>
              </div>
              <div className="bg-gray-100 rounded mt-2 p-2 flex justify-center pointer-events-none">
                <IdCardTemplate member={member} type={memberType} scale={0.18} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
