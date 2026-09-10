import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone } from 'lucide-react';
import { getFamilies } from '../lib/memberStore';

export default function Families() {
  const [families, setFamilies] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setFamilies(getFamilies());
  }, []);

  const filtered = families.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (f.phone || '').includes(q) ||
      f.members.some(m =>
        m.full_name?.toLowerCase().includes(q) ||
        m.mva_id?.toLowerCase().includes(q) ||
        (m.phone || '').includes(q)
      )
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">Family Groups</h1>
        <p className="text-gray-600 mt-1">
          Members are grouped as one family when they share a phone number or are linked as family
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">{families.length}</p>
          <p className="text-sm text-gray-600 mt-1">Families</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <p className="text-3xl font-bold text-navy">
            {families.reduce((s, f) => s + f.members.length, 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">Members in Families</p>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, MVA-ID or phone..."
        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          No family groups found. Families form when two or more members share a phone number, or when a member is linked to another via the "Family Member" field.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(f => (
            <div key={f.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-3">
                <div className="bg-navy/10 text-navy p-2 rounded-lg">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-navy flex items-center gap-1.5">
                    {f.phone
                      ? <><Phone size={12} /> {f.phone}</>
                      : <>👨‍👩‍👧 Linked family</>}
                  </p>
                  <p className="text-xs text-gray-500">{f.members.length} members</p>
                </div>
              </div>
              <div className="space-y-2">
                {f.members.map(m => (
                  <Link
                    key={m.id}
                    to={`/members/${m.id}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-card-blue transition"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.full_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{m.mva_id}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.status === 'active' ? 'bg-green-100 text-green-700' :
                      m.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {m.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
