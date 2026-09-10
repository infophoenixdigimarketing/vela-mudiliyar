import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getAnnualMembers, getRenewalInfo, markRenewed, waLink } from '../lib/memberStore';

export default function Renewals() {
  const [members, setMembers] = useState([]);
  const [renewingId, setRenewingId] = useState(null);
  const [amount, setAmount] = useState('500');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    const list = getAnnualMembers().map(m => ({ ...m, renewal: getRenewalInfo(m) }));
    // Due members first
    list.sort((a, b) => (b.renewal?.due ? 1 : 0) - (a.renewal?.due ? 1 : 0));
    setMembers(list);
  };

  const dueCount = members.filter(m => m.renewal?.due).length;

  const sendReminder = (m) => {
    const msg = `*Mysore Vellala Association — Renewal Reminder*

Namaste ${m.full_name},

Your *Annual Membership* (${m.mva_id}) is due for renewal.
Last renewal: ${m.renewal?.last || '—'}
Due date: ${m.renewal?.dueDate || '—'}

Kindly renew at the earliest to continue enjoying member benefits.
For payment, please contact the association office:
#76, Manasara Road, Indiranagar, Ittigegudu, Mysuru - 570010

Thank you!
— Mysore Vellala Association®`;
    window.open(waLink(m.whatsapp || m.phone, msg), '_blank');
  };

  const confirmRenewal = (m) => {
    const receipt = markRenewed(m, { amount: Number(amount) || 0, payment_mode: paymentMode });
    setRenewingId(null);
    setMessage(`✓ ${m.full_name} renewed — receipt ${receipt.voucher_no} created. See Receipts page to print it.`);
    setTimeout(() => setMessage(''), 6000);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Annual Renewals</h1>
          <p className="text-gray-600 mt-1">Track annual membership renewals and send WhatsApp reminders</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">{members.length}</p>
          <p className="text-sm text-gray-600 mt-1">Annual Members</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center border-2 border-red-200">
          <p className="text-3xl font-bold text-red-600">{dueCount}</p>
          <p className="text-sm text-gray-600 mt-1">Renewal Due</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center border-2 border-green-200">
          <p className="text-3xl font-bold text-green-700">{members.length - dueCount}</p>
          <p className="text-sm text-gray-600 mt-1">Up to Date</p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
          {message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-navy text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Member</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Last Renewal</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Due Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-card-blue transition">
                  <td className="px-6 py-4">
                    <Link to={`/members/${m.id}`} className="hover:underline">
                      <p className="text-sm font-medium">{m.full_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{m.mva_id}</p>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">{m.phone}</td>
                  <td className="px-6 py-4 text-sm">{m.renewal?.last || '—'}</td>
                  <td className="px-6 py-4 text-sm">{m.renewal?.dueDate || '—'}</td>
                  <td className="px-6 py-4">
                    {m.renewal?.due ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Due</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {renewingId === m.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                          placeholder="₹ Amount"
                        />
                        <select
                          value={paymentMode}
                          onChange={e => setPaymentMode(e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option>Cash</option>
                          <option>UPI</option>
                          <option>Cheque</option>
                          <option>Bank Transfer</option>
                        </select>
                        <button
                          onClick={() => confirmRenewal(m)}
                          className="bg-green text-white px-3 py-1.5 rounded text-sm font-medium hover:opacity-90"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setRenewingId(null)}
                          className="text-gray-500 text-sm hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendReminder(m)}
                          title="Send WhatsApp reminder"
                          className="p-2 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          onClick={() => setRenewingId(m.id)}
                          title="Mark renewed (collect fee + create receipt)"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-deep transition"
                        >
                          <RefreshCw size={14} /> Renew
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No annual members found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
