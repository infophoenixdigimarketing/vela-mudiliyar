import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { getPrintHistory } from '../lib/memberStore';

export default function PrintHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getPrintHistory());
  }, []);

  const totalCards = history.reduce((sum, h) => sum + (h.members?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">Print History</h1>
        <p className="text-gray-600 mt-1">Every ID card print is logged — who printed, when, and which members</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">{history.length}</p>
          <p className="text-sm text-gray-600 mt-1">Print Jobs</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">{totalCards}</p>
          <p className="text-sm text-gray-600 mt-1">Cards Printed</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-navy text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Date & Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Printed By</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Cards</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-card-blue transition align-top">
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {dayjs(h.at).format('DD-MM-YYYY hh:mm A')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <p className="font-medium">{h.by}</p>
                    {h.role && <p className="text-xs text-gray-500 capitalize">{h.role}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-navy">{h.members?.length || 0}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      {(h.members || []).map(m => (
                        <Link
                          key={m.id}
                          to={`/members/${m.id}`}
                          className="text-xs bg-gray-100 hover:bg-navy hover:text-white px-2 py-1 rounded transition"
                        >
                          {m.full_name} ({m.mva_id})
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No cards printed yet. History will appear here after the first PDF download.
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
