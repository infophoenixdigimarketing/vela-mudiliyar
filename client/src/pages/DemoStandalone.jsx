import { useState, useEffect } from 'react';
import { LogOut, Search } from 'lucide-react';

// Mock data - all in memory
const DEMO_USERS = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Admin', role: 'superadmin' },
  { id: 2, username: 'operator', password: 'oper123', name: 'Operator', role: 'operator' },
  { id: 3, username: 'viewer', password: 'view123', name: 'Viewer', role: 'viewer' }
];

const DEMO_MEMBERS = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  mva_id: `MVA-ID-${String(i + 1).padStart(3, '0')}`,
  full_name: `Member ${i + 1}`,
  phone: `9999${String(90000 + i).padStart(5, '0')}`,
  blood_group: ['A+', 'B+', 'O+', 'AB+'][i % 4],
  area: ['Ittigegudu', 'J P Nagar', 'Medar Block', 'Hunsur Town'][i % 4],
  status: i < 48 ? 'active' : (i < 56 ? 'pending' : 'departed'),
  membership_type: i % 5 === 0 ? 'annual' : 'life',
  email: `member${i}@example.com`,
}));

export default function DemoStandalone() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [members, setMembers] = useState(DEMO_MEMBERS);

  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = DEMO_USERS.find(u => u.username === username && u.password === password);
    if (foundUser) {
      setUser(foundUser);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search) || m.mva_id.includes(search);
    const matchesStatus = !status || m.status === status;
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy to-navy-deep flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-navy text-center mb-2">Mudaliar Sangham</h1>
          <p className="text-center text-gray-600">Mysore Vellala Association</p>
          <p className="text-center text-gray-500 text-sm mt-1">Membership Management System</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-navy text-white font-medium py-2 rounded-lg hover:bg-navy-deep transition"
            >
              Login
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4 font-semibold">Demo Accounts</p>
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded"><p className="font-medium">Admin</p><p className="text-gray-600">admin / admin123</p></div>
              <div className="bg-blue-50 p-3 rounded"><p className="font-medium">Operator</p><p className="text-gray-600">operator / oper123</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 bg-navy-deep text-white flex flex-col">
        <div className="p-4 border-b border-navy/30">
          <h1 className="font-bold text-sm">MVA System</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-3 rounded-lg bg-navy">Members</div>
        </nav>
        <div className="p-4 border-t border-navy/30">
          <p className="text-xs text-gray-400 mb-3">
            <p className="font-semibold text-gray-300">{user.name}</p>
            <p className="capitalize">{user.role}</p>
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-navy/30 rounded-lg transition text-gray-300"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
          <h2 className="text-2xl font-bold text-navy">Mysore Vellala Association</h2>
          <p className="text-sm text-gray-600">Membership Management System</p>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-navy">Members</h1>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, phone or MVA-ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="departed">Departed</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Showing {filteredMembers.length} of {DEMO_MEMBERS.length} members
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-navy text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">MVA-ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Area</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Blood</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMembers.slice(0, 25).map(member => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
