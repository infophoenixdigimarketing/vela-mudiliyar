import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Download, Edit, MessageCircle, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import IdCardTemplate from '../components/IdCardTemplate';
import { getMemberById, saveMember, logPrint, getFamilyOf, recordDeparture, waLink, verificationMessage, canEdit } from '../lib/memberStore';
import { loadCardAssets } from '../lib/cardAssets';

export default function MemberView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showDeparture, setShowDeparture] = useState(false);
  const [departureForm, setDepartureForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reason: 'Deceased',
    remarks: ''
  });

  useEffect(() => {
    loadMember();
  }, [id]);

  const loadMember = async () => {
    try {
      setMember(getMemberById(id));
    } catch (err) {
      console.error('Failed to load member:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- WhatsApp verification workflow ----
  const sendForVerification = () => {
    window.open(waLink(member.whatsapp || member.phone, verificationMessage(member)), '_blank');
    const updated = { ...member, card_status: 'sent', verification_sent_at: new Date().toISOString() };
    saveMember(updated);
    setMember(updated);
  };

  const markApproved = () => {
    const updated = { ...member, card_status: 'approved', approved_at: new Date().toISOString() };
    saveMember(updated);
    setMember(updated);
  };

  const submitDeparture = () => {
    if (!departureForm.date) return;
    recordDeparture(member, departureForm);
    setShowDeparture(false);
    setMember(getMemberById(id));
  };

  const downloadCard = async () => {
    if (member.card_status !== 'approved') {
      const proceed = window.confirm(
        '⚠️ This card is NOT yet approved by the member via WhatsApp.\n\nRecommended: Send for verification first and print only after approval.\n\nDownload anyway?'
      );
      if (!proceed) return;
    }
    setDownloading(true);
    try {
      // Pre-processed images: square faint watermark + transparent signature
      const { sealDataUrl, watermarkDataUrl, signDataUrl } = await loadCardAssets();

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1280px';
      container.style.height = '800px';
      document.body.appendChild(container);

      // Card HTML — exact replica of the approved Claude Design (1280x800)
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
              <div style="font-size:37px;font-weight:600;color:#2e7d32;padding-left:110px;margin-bottom:8px">${member?.membership_type === 'life' ? 'Life Member' : 'Annual Member'}</div>
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

      // Wait for render
      // Wait for fonts (incl. Kannada) to be ready — otherwise first PDF renders fallback fonts
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Exact ID card size: 4in x 2.5in — the card IS the page
      const CARD_W = 101.6;
      const CARD_H = 63.5;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_W, CARD_H] });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, CARD_W, CARD_H);
      pdf.save(`${member.mva_id}-card.pdf`);

      document.body.removeChild(container);

      // Record in print history + bump issue count
      logPrint([member]);
      setMember(getMemberById(id));
    } catch (err) {
      console.error('Failed to download card:', err);
      alert('Failed to download card. Check console for details.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading member...</div>;
  if (!member) return <div className="text-center py-8">Member not found</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">{member.full_name}</h1>
          <p className="text-gray-600 mt-1">{member.mva_id}</p>
        </div>
        <div className="flex gap-3">
          {canEdit() && (
          <Link
            to={`/members/${id}/edit`}
            className="flex items-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            <Edit size={18} /> Edit
          </Link>
          )}
          <button
            onClick={() => navigate(-1)}
            className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-8">
            <h3 className="text-lg font-bold text-navy mb-2">ID Card</h3>

            {/* Approval Status Badge */}
            <div className="mb-4">
              {member.card_status === 'approved' ? (
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full">
                  <CheckCircle size={14} /> Approved by member — ready to print
                </span>
              ) : member.card_status === 'sent' ? (
                <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-full">
                  <MessageCircle size={14} /> Sent on WhatsApp — awaiting approval
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full">
                  ● Draft — not yet verified
                </span>
              )}
            </div>

            <div className="flex justify-center mb-6 bg-gray-100 p-3 rounded">
              <IdCardTemplate member={member} type={member.membership_type} scale={0.21} />
            </div>

            {/* Step 1: Send for verification */}
            <button
              onClick={sendForVerification}
              className="w-full bg-[#25D366] text-white flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg hover:opacity-90 transition font-medium mb-2"
            >
              <MessageCircle size={18} />
              {member.card_status === 'sent' ? 'Re-send on WhatsApp' : 'Send for Verification (WhatsApp)'}
            </button>

            {/* Step 2: Mark approved after customer replies */}
            {member.card_status !== 'approved' && (
              <button
                onClick={markApproved}
                className="w-full bg-green text-white flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg hover:opacity-90 transition font-medium mb-2"
              >
                <CheckCircle size={18} /> Mark as Approved
              </button>
            )}

            {/* Step 3: Print / Download */}
            <button
              onClick={downloadCard}
              disabled={downloading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition disabled:opacity-50 font-medium ${
                member.card_status === 'approved'
                  ? 'bg-navy text-white hover:bg-navy-deep'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <Download size={18} /> {downloading ? 'Generating PDF...' : 'Download PDF for Print'}
            </button>

            {member.card_status !== 'approved' && (
              <p className="text-[11px] text-gray-500 mt-2 text-center">
                Workflow: Send on WhatsApp → member approves → print
              </p>
            )}
            {member.card_issue_count > 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Printed {member.card_issue_count} time(s)
              </p>
            )}
          </div>
        </div>

        {/* Member Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-navy mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Full Name" value={member.full_name} />
              <Detail label="DOB" value={member.dob} />
              <Detail label="Sex" value={member.sex === 'M' ? 'Male' : 'Female'} />
              <Detail label="Blood Group" value={member.blood_group} />
              <Detail label="Occupation" value={member.occupation} />
              {member.relation_type && (
                <>
                  <Detail label="Relation Type" value={member.relation_type} />
                  <Detail label="Relation Name" value={member.relation_name} />
                </>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-navy mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <Detail label="Phone" value={member.phone} />
              <Detail label="WhatsApp" value={member.whatsapp} />
              <Detail label="Email" value={member.email} />
              <Detail label="Area" value={member.area} />
              <Detail label="Pincode" value={member.pincode} />
            </div>
          </div>

          {/* Address */}
          {member.residence_address && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-navy mb-4">Residence Address</h3>
              <p className="text-gray-700">{member.residence_address}</p>
              {member.residence_phone && (
                <p className="text-sm text-gray-600 mt-2">Phone: {member.residence_phone}</p>
              )}
            </div>
          )}

          {/* Membership Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-navy mb-4">Membership Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Detail
                label="Type"
                value={member.membership_type === 'life' ? 'Life Member' : 'Annual Member'}
              />
              <Detail
                label="Status"
                value={
                  <span className={`inline-flex items-center gap-2 ${
                    member.status === 'active' ? 'text-green' :
                    member.status === 'pending' ? 'text-saffron' :
                    'text-gray-500'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {member.status}
                  </span>
                }
              />
              <Detail label="Voucher No." value={member.voucher_no} />
              <Detail label="Introduced By" value={member.introduced_by} />
              <Detail label="Date of Membership" value={member.date_of_membership} />
              <Detail label="Passed by Committee On" value={member.passed_by_committee_on} />
            </div>
          </div>

          {member.special_remarks && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-navy mb-4">Special Remarks</h3>
              <p className="text-gray-700">{member.special_remarks}</p>
            </div>
          )}

          {/* Family Members (same phone number) */}
          {getFamilyOf(member).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-navy mb-4">
                👨‍👩‍👧 Family Members <span className="text-sm font-normal text-gray-500">(same phone number)</span>
              </h3>
              <div className="space-y-2">
                {getFamilyOf(member).map(fm => (
                  <Link
                    key={fm.id}
                    to={`/members/${fm.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-card-blue transition"
                  >
                    <div>
                      <p className="text-sm font-medium">{fm.full_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{fm.mva_id}</p>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{fm.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Departure record / action */}
          {member.status === 'departed' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-700 mb-2">🕊️ Departed Member</h3>
              <p className="text-sm text-gray-600">
                Date: <strong>{member.departure_date || '—'}</strong>
                {member.departure_reason && <> · Reason: <strong>{member.departure_reason}</strong></>}
              </p>
            </div>
          ) : showDeparture ? (
            <div className="bg-white border-2 border-red-200 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-red-700">Record Departure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={departureForm.date}
                    onChange={e => setDepartureForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <select
                    value={departureForm.reason}
                    onChange={e => setDepartureForm(p => ({ ...p, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option>Deceased</option>
                    <option>Relocated</option>
                    <option>Resigned</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={departureForm.remarks}
                  onChange={e => setDepartureForm(p => ({ ...p, remarks: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Any additional notes for the register"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={submitDeparture}
                  className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Record in Departure Register
                </button>
                <button
                  onClick={() => setShowDeparture(false)}
                  className="border border-gray-300 px-5 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-right">
              <button
                onClick={() => setShowDeparture(true)}
                className="text-sm text-red-600 hover:underline"
              >
                🕊️ Mark as Departed…
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}
