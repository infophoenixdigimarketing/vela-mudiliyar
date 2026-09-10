import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Receipt } from 'lucide-react';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import { getAllMembers, getReceipts, saveReceipt } from '../lib/memberStore';

const PURPOSES = [
  'Life Membership Fee',
  'Annual Membership Fee',
  'Annual Membership Renewal',
  'Donation',
  'Event Contribution',
  'Other',
];

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [form, setForm] = useState({ purpose: PURPOSES[0], amount: '', payment_mode: 'Cash' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setReceipts(getReceipts());
    setMembers(getAllMembers().filter(m => m.status !== 'departed'));
  }, []);

  const selectedMember = members.find(
    m => `${m.full_name} (${m.mva_id})` === memberQuery
  );

  const generateReceipt = () => {
    if (!selectedMember) {
      setMessage('⚠️ Please select a member from the list');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setMessage('⚠️ Please enter a valid amount');
      return;
    }
    const rec = saveReceipt({
      member_id: selectedMember.id,
      mva_id: selectedMember.mva_id,
      member_name: selectedMember.full_name,
      purpose: form.purpose,
      amount: Number(form.amount),
      payment_mode: form.payment_mode,
    });
    setReceipts(getReceipts());
    setMemberQuery('');
    setForm({ purpose: PURPOSES[0], amount: '', payment_mode: 'Cash' });
    setMessage(`✓ Receipt ${rec.voucher_no} created`);
    setTimeout(() => setMessage(''), 4000);
    downloadReceiptPdf(rec);
  };

  const downloadReceiptPdf = (rec) => {
    const pdf = new jsPDF('l', 'mm', 'a5'); // A5 landscape receipt
    const w = pdf.internal.pageSize.getWidth();

    // Header band
    pdf.setFillColor(47, 48, 132);
    pdf.rect(0, 0, w, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Mysore Vellala Association (R.)', w / 2, 12, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('#76, Manasara Road, Indiranagar, Ittigegudu, Mysuru - 570010', w / 2, 19, { align: 'center' });
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT RECEIPT', w / 2, 26, { align: 'center' });

    // Red line
    pdf.setDrawColor(196, 30, 58);
    pdf.setLineWidth(1);
    pdf.line(0, 31, w, 31);

    pdf.setTextColor(26, 35, 126);
    pdf.setFontSize(11);

    const left = 18;
    let y = 44;
    const row = (label, value) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, left, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(': ' + String(value), left + 42, y);
      y += 9;
    };

    row('Voucher No.', rec.voucher_no);
    row('Date', dayjs(rec.created_at).format('DD-MM-YYYY'));
    row('Received From', `${rec.member_name} (${rec.mva_id})`);
    row('Towards', rec.purpose);
    row('Payment Mode', rec.payment_mode);

    // Amount box
    pdf.setFillColor(240, 247, 252);
    pdf.setDrawColor(47, 48, 132);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(left, y, 80, 14, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(`Amount: Rs. ${Number(rec.amount).toLocaleString('en-IN')}/-`, left + 4, y + 9.5);

    // Signature
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Received by: ' + (rec.created_by || ''), w - 20, y + 4, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorised Signatory', w - 20, y + 12, { align: 'right' });

    pdf.save(`${rec.voucher_no.replace(/\//g, '-')}.pdf`);
  };

  const totalCollected = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">Receipts</h1>
        <p className="text-gray-600 mt-1">Generate membership fee receipts with automatic voucher numbers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">{receipts.length}</p>
          <p className="text-sm text-gray-600 mt-1">Receipts Issued</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-green-700">₹{totalCollected.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-600 mt-1">Total Collected</p>
        </div>
      </div>

      {/* New Receipt Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
          <Receipt size={20} /> New Receipt
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member *</label>
            <input
              list="member-options"
              value={memberQuery}
              onChange={e => setMemberQuery(e.target.value)}
              placeholder="Type name or MVA-ID to search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <datalist id="member-options">
              {members.map(m => (
                <option key={m.id} value={`${m.full_name} (${m.mva_id})`} />
              ))}
            </datalist>
            {selectedMember && (
              <p className="text-xs text-green-700 mt-1">✓ {selectedMember.full_name} selected</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
            <select
              value={form.purpose}
              onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {PURPOSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="e.g. 500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
            <select
              value={form.payment_mode}
              onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Cheque</option>
              <option>Bank Transfer</option>
            </select>
          </div>
        </div>
        {message && <p className="text-sm font-medium mt-3">{message}</p>}
        <button
          onClick={generateReceipt}
          className="mt-4 bg-navy text-white px-6 py-2.5 rounded-lg hover:bg-navy-deep transition font-medium"
        >
          Generate Receipt & Download PDF
        </button>
      </div>

      {/* Receipts list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-navy text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Voucher No.</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Member</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Purpose</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Mode</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {receipts.map(r => (
                <tr key={r.id} className="hover:bg-card-blue transition">
                  <td className="px-6 py-4 text-sm font-mono text-navy">{r.voucher_no}</td>
                  <td className="px-6 py-4 text-sm">{dayjs(r.created_at).format('DD-MM-YYYY')}</td>
                  <td className="px-6 py-4 text-sm">
                    <Link to={`/members/${r.member_id}`} className="hover:underline">
                      {r.member_name}
                      <span className="text-xs text-gray-500 block font-mono">{r.mva_id}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">{r.purpose}</td>
                  <td className="px-6 py-4 text-sm font-bold">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm">{r.payment_mode}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => downloadReceiptPdf(r)}
                      className="p-2 rounded-lg text-navy hover:bg-navy/10 transition"
                      title="Download receipt PDF"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No receipts yet. Generate the first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
