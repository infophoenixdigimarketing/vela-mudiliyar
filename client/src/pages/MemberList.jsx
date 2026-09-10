import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Edit, Eye, Download, Upload } from 'lucide-react';
import { getAllMembers, canEdit } from '../lib/memberStore';

export default function MemberList() {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [sortField, setSortField] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const limit = 25;

  const filters = {
    status: searchParams.get('status'),
    membership_type: searchParams.get('membership_type'),
    blood_group: searchParams.get('blood_group'),
    area: searchParams.get('area'),
  };

  useEffect(() => {
    loadMembers();
  }, [page, search, sortField, sortDir, searchParams]);

  const loadMembers = async () => {
    try {
      setLoading(true);

      const allMembers = getAllMembers();

      // Apply search filter
      let filtered = allMembers;
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(m =>
          m.full_name.toLowerCase().includes(query) ||
          m.phone.includes(query) ||
          m.mva_id.includes(query)
        );
      }

      // Apply status filter
      if (filters.status) {
        filtered = filtered.filter(m => m.status === filters.status);
      }

      // Apply other filters
      if (filters.membership_type) {
        filtered = filtered.filter(m => m.membership_type === filters.membership_type);
      }
      if (filters.blood_group) {
        filtered = filtered.filter(m => m.blood_group === filters.blood_group);
      }
      if (filters.area) {
        filtered = filtered.filter(m => m.area === filters.area);
      }

      // Sort
      filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });

      // Paginate
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);

      setMembers(paginated);
      setTotal(filtered.length);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchParams({});
    setPage(1);
  };

  const exportToCSV = () => {
    // Export ALL members (not just the visible page)
    const allMembers = getAllMembers();
    if (allMembers.length === 0) {
      alert('No members to export');
      return;
    }

    const headers = ['MVA-ID', 'Name', 'DOB', 'Phone', 'Blood Group', 'Area', 'Membership Type', 'Status', 'Address'];
    const rows = allMembers.map(m => [
      m.mva_id,
      m.full_name,
      m.dob,
      m.phone,
      m.blood_group,
      m.area,
      m.membership_type,
      m.status,
      m.residence_address
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MVA_Members_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const template = `MVA-ID,Name of the Member,S/o Late Sridewappa,Address,Phone Number,DOB,B-group
MVA-ID-001,Rajesh Kumar,S/O Krishnan,123 Main St Ittigegudu Mysore 570010,9845104414,15-06-1980,A+
MVA-ID-002,Priya Sharma,W/O Vikram Singh,"456 JP Nagar, Mysore 570010",9876543210,22-03-1985,B+
MVA-ID-003,Arun Patel,S/O Ramesh Patel,"789 Medar Block, Mysore 570001",9765432109,10-12-1975,O+
MVA-ID-004,Divya Nair,D/O Suresh Nair,"321 Hunsur Town, Mysore 570018",9654321098,28-07-1990,AB+
MVA-ID-005,Srinivas Reddy,S/O Hari Reddy,"654 New Bamboo Bazaar, Mysore 570021",9543210987,14-01-1982,A-`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MVA_Members_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const importFromCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      const newMembers = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        const member = {
          id: Date.now() + i,
          mva_id: row['MVA-ID'] || `MVA-ID-${String(1000 + Math.floor(Math.random() * 9000))}`,
          full_name: row['Name of the Member'] || row['Name'] || '',
          relation_name: row['S/o Late Sridewappa'] || row['Relationship'] || '',
          residence_address: row['Address'] || '',
          phone: row['Phone Number'] || row['Phone'] || '',
          dob: row['DOB'] || '',
          blood_group: row['B-group'] || row['Blood Group'] || '',
          status: 'active',
          membership_type: 'life',
          card_status: 'draft',
          date_created: new Date().toISOString(),
        };

        if (member.full_name) {
          newMembers.push(member);
        }
      }

      if (newMembers.length === 0) {
        alert('No valid members found in file');
        return;
      }

      // Save into the same store all pages read from
      const existingMembers = JSON.parse(localStorage.getItem('appMembers') || '[]');
      localStorage.setItem('appMembers', JSON.stringify([...existingMembers, ...newMembers]));

      alert(`✓ ${newMembers.length} members imported successfully!`);
      e.target.value = '';
      loadMembers();
    } catch (err) {
      alert(`Error importing file: ${err.message}`);
      console.error(err);
    }
  };

  const FilterChip = ({ label, value }) => (
    <span className="inline-flex items-center gap-2 bg-navy text-white px-3 py-1 rounded-full text-sm">
      {label}: <strong>{value}</strong>
      <button
        onClick={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete(label.toLowerCase().replace(' ', '_'));
          setSearchParams(newParams);
          setPage(1);
        }}
        className="hover:opacity-70"
      >
        ✕
      </button>
    </span>
  );

  const pages = Math.ceil(total / limit);
  const sortIcon = sortDir === 'asc' ? '↑' : '↓';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-navy">Members</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={downloadTemplate}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:opacity-90 transition font-medium flex items-center gap-2"
          >
            <Download size={18} /> Download Template
          </button>
          {canEdit() && (
          <label className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:opacity-90 transition font-medium flex items-center gap-2 cursor-pointer">
            <Upload size={18} /> Import Excel
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={importFromCSV}
              className="hidden"
            />
          </label>
          )}
          <button
            onClick={exportToCSV}
            className="bg-green text-white px-6 py-2 rounded-lg hover:opacity-90 transition font-medium flex items-center gap-2"
          >
            <Download size={18} /> Export to Excel
          </button>
          {canEdit() && (
          <Link
            to="/members/new"
            className="bg-navy text-white px-6 py-2 rounded-lg hover:bg-navy-deep transition font-medium"
          >
            + Add Member
          </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, MVA-ID, phone or address..."
              value={search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        {/* Active Filters */}
        {(search || Object.values(filters).some(v => v)) && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {search && <FilterChip label="Search" value={search} />}
              {filters.status && <FilterChip label="Status" value={filters.status} />}
              {filters.membership_type && <FilterChip label="Type" value={filters.membership_type} />}
              {filters.blood_group && <FilterChip label="Blood" value={filters.blood_group} />}
              {filters.area && <FilterChip label="Area" value={filters.area} />}
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-navy hover:underline font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        <div className="text-sm text-gray-600">
          Showing {members.length} of {total} members
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No members match this filter. <button onClick={clearFilters} className="text-navy hover:underline">Clear filters</button> or <Link to="/members/new" className="text-navy hover:underline">add a member</Link>.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-navy-deep" onClick={() => handleSort('mva_id')}>
                    MVA-ID {sortField === 'mva_id' && sortIcon}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-navy-deep" onClick={() => handleSort('full_name')}>
                    Name {sortField === 'full_name' && sortIcon}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-navy-deep" onClick={() => handleSort('phone')}>
                    Phone {sortField === 'phone' && sortIcon}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Area</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Blood</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-navy-deep" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' && sortIcon}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Card</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-card-blue transition h-11">
                    <td className="px-6 py-4 text-sm font-mono text-navy">{member.mva_id}</td>
                    <td className="px-6 py-4 text-sm font-medium">{member.full_name}</td>
                    <td className="px-6 py-4 text-sm">{member.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{member.area}</td>
                    <td className="px-6 py-4 text-sm font-medium">{member.blood_group}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-2 ${
                        member.status === 'active' ? 'text-green' :
                        member.status === 'pending' ? 'text-saffron' :
                        'text-gray-500'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        member.card_status === 'approved' ? 'bg-green-100 text-green-700' :
                        member.card_status === 'sent' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {member.card_status === 'approved' ? '✓ Approved' : member.card_status === 'sent' ? 'Awaiting' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2 flex">
                      <Link to={`/members/${member.id}`} className="text-navy hover:bg-navy/10 p-2 rounded">
                        <Eye size={16} />
                      </Link>
                      {canEdit() && (
                      <Link to={`/members/${member.id}/edit`} className="text-blue-600 hover:bg-blue-50 p-2 rounded">
                        <Edit size={16} />
                      </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
              <div className="text-sm text-gray-600">
                Page {page} of {pages}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
