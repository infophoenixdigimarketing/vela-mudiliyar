import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllMembers } from '../lib/memberStore';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    departed: 0,
    lifeMembers: 0,
    annualMembers: 0
  });
  const [bloodGroups, setBloodGroups] = useState({});
  const [ageGroups, setAgeGroups] = useState({ '18 to 30': 0, '30 to 60': 0, '60 and above': 0 });
  const [areas, setAreas] = useState({});
  const [cardStats, setCardStats] = useState({ draft: 0, sent: 0, approved: 0 });
  const [recentMembers, setRecentMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const members = getAllMembers();

    const statsData = {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      pending: members.filter(m => m.status === 'pending').length,
      departed: members.filter(m => m.status === 'departed').length,
      lifeMembers: members.filter(m => m.membership_type === 'life').length,
      annualMembers: members.filter(m => m.membership_type === 'annual').length,
    };
    setStats(statsData);

    const bg = {};
    members.forEach(m => {
      if (m.blood_group) bg[m.blood_group] = (bg[m.blood_group] || 0) + 1;
    });
    setBloodGroups(bg);

    const ag = { '18 to 30': 0, '30 to 60': 0, '60 and above': 0 };
    members.forEach(m => {
      if (!m.dob) return;
      const dob = new Date(m.dob);
      if (isNaN(dob)) return;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age >= 18 && age < 30) ag['18 to 30']++;
      else if (age >= 30 && age < 60) ag['30 to 60']++;
      else if (age >= 60) ag['60 and above']++;
    });
    setAgeGroups(ag);

    const ar = {};
    members.forEach(m => {
      if (m.area) ar[m.area] = (ar[m.area] || 0) + 1;
    });
    setAreas(ar);

    // Card approval pipeline
    setCardStats({
      draft: members.filter(m => !m.card_status || m.card_status === 'draft').length,
      sent: members.filter(m => m.card_status === 'sent').length,
      approved: members.filter(m => m.card_status === 'approved').length,
    });

    // Recently added members (real entries first)
    const recent = [...members]
      .filter(m => m.date_created)
      .sort((a, b) => new Date(b.date_created) - new Date(a.date_created))
      .slice(0, 5);
    setRecentMembers(recent);

    setLoading(false);
  }, []);

  const StatTile = ({ title, value, color, path }) => (
    <Link
      to={path}
      className={`rounded-lg p-6 text-white cursor-pointer hover:shadow-lg transition transform hover:scale-105 ${color}`}
    >
      <p className="text-sm font-medium opacity-90">{title}</p>
      <p className="text-4xl font-bold mt-2 tabular-figures">{value}</p>
    </Link>
  );

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatTile title="Total Members" value={stats.total} color="bg-navy" path="/members" />
        <StatTile title="Active Members" value={stats.active} color="bg-green" path="/members?status=active" />
        <StatTile title="Pending Applications" value={stats.pending} color="bg-saffron" path="/members?status=pending" />
        <StatTile title="Life Members" value={stats.lifeMembers} color="bg-blue-500" path="/members?membership_type=life" />
        <StatTile title="Annual Members" value={stats.annualMembers} color="bg-blue-600" path="/members?membership_type=annual" />
        <StatTile title="Departed" value={stats.departed} color="bg-gray-500" path="/members?status=departed" />
      </div>

      {/* ID Card Approval Pipeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-navy mb-4">ID Card Approval Pipeline (WhatsApp Verification)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{cardStats.draft}</p>
            <p className="text-sm font-medium text-gray-500 mt-1">Draft — not verified</p>
          </div>
          <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-700">{cardStats.sent}</p>
            <p className="text-sm font-medium text-yellow-700 mt-1">Sent — awaiting approval</p>
          </div>
          <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{cardStats.approved}</p>
            <p className="text-sm font-medium text-green-700 mt-1">Approved — ready to print</p>
          </div>
        </div>
      </div>

      {/* Recently Added Members */}
      {recentMembers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-navy mb-4">Recently Added / Updated</h3>
          <div className="divide-y divide-gray-100">
            {recentMembers.map(m => (
              <Link
                key={m.id}
                to={`/members/${m.id}`}
                className="flex items-center justify-between py-3 hover:bg-card-blue px-2 rounded transition"
              >
                <div>
                  <p className="font-medium text-sm">{m.full_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{m.mva_id}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  m.card_status === 'approved' ? 'bg-green-100 text-green-700' :
                  m.card_status === 'sent' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {m.card_status === 'approved' ? 'Approved' : m.card_status === 'sent' ? 'Awaiting' : 'Draft'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Data Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blood Groups */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-navy mb-4">Blood Group Distribution</h3>
          <div className="space-y-3">
            {Object.entries(bloodGroups)
              .sort((a, b) => b[1] - a[1])
              .map(([bg, count]) => (
                <div key={bg} className="flex items-center justify-between">
                  <span className="font-medium">{bg}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-green"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Age Groups */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-navy mb-4">Age Group Distribution</h3>
          <div className="space-y-3">
            {Object.entries(ageGroups).map(([range, count]) => {
              const ageTotal = Object.values(ageGroups).reduce((a, b) => a + b, 0);
              return (
                <div key={range} className="flex items-center justify-between">
                  <span className="font-medium">{range}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${ageTotal ? (count / ageTotal) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Areas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-navy mb-4">Members by Area</h3>
          <div className="space-y-3">
            {Object.entries(areas)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([area, count]) => (
                <Link
                  key={area}
                  to={`/members?area=${area}`}
                  className="flex items-center justify-between hover:bg-card-blue p-2 rounded transition"
                >
                  <span className="font-medium text-sm">{area}</span>
                  <span className="bg-navy text-white px-3 py-1 rounded-full text-sm tabular-figures">{count}</span>
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card-blue rounded-lg p-6">
        <h3 className="text-lg font-bold text-navy mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/members/new"
            className="bg-navy text-white py-3 px-4 rounded-lg hover:bg-navy-deep transition text-center font-medium"
          >
            + Add Member
          </Link>
          <Link
            to="/members"
            className="bg-green text-white py-3 px-4 rounded-lg hover:opacity-90 transition text-center font-medium"
          >
            View All Members
          </Link>
          <Link
            to="/cards"
            className="bg-blue-500 text-white py-3 px-4 rounded-lg hover:opacity-90 transition text-center font-medium"
          >
            Generate ID Cards
          </Link>
        </div>
      </div>
    </div>
  );
}
