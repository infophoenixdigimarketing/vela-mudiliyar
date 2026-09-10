import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { getDepartureRegister, getAllMembers } from '../lib/memberStore';

export default function Departures() {
  const [register, setRegister] = useState([]);
  const [departedMembers, setDepartedMembers] = useState([]);

  useEffect(() => {
    setRegister(getDepartureRegister());
    setDepartedMembers(getAllMembers().filter(m => m.status === 'departed'));
  }, []);

  // Members marked departed but with no register entry (legacy/sample data)
  const registeredIds = new Set(register.map(r => String(r.member_id)));
  const unregistered = departedMembers.filter(m => !registeredIds.has(String(m.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">Departure Register</h1>
        <p className="text-gray-600 mt-1">
          Official record of departed members. To add an entry, open a member's profile and use "Mark as Departed".
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">{departedMembers.length}</p>
          <p className="text-sm text-gray-600 mt-1">Departed Members</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">{register.length}</p>
          <p className="text-sm text-gray-600 mt-1">Register Entries</p>
        </div>
      </div>

      {/* Register entries */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-navy">Register Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-navy text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Member</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Departure Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Reason</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Remarks</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {register.map(r => (
                <tr key={r.id} className="hover:bg-card-blue transition">
                  <td className="px-6 py-4">
                    <Link to={`/members/${r.member_id}`} className="hover:underline">
                      <p className="text-sm font-medium">{r.full_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{r.mva_id}</p>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">{r.date}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{r.reason}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[240px]">{r.remarks || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <p>{r.recorded_by}</p>
                    <p className="text-xs text-gray-500">{dayjs(r.recorded_at).format('DD-MM-YYYY')}</p>
                  </td>
                </tr>
              ))}
              {register.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No register entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Departed without formal register entry */}
      {unregistered.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="font-bold text-yellow-800 mb-3">
            ⚠️ Departed without register entry ({unregistered.length})
          </h2>
          <p className="text-sm text-yellow-700 mb-3">
            These members are marked departed but have no formal record. Open each profile to complete the register.
          </p>
          <div className="flex flex-wrap gap-2">
            {unregistered.map(m => (
              <Link
                key={m.id}
                to={`/members/${m.id}`}
                className="text-xs bg-white border border-yellow-300 hover:bg-yellow-100 px-3 py-1.5 rounded-full transition"
              >
                {m.full_name} ({m.mva_id})
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
