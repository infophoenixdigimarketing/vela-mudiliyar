import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/members', label: 'Members', icon: '👥' },
    { path: '/cards', label: 'ID Cards', icon: '🎫' },
    { path: '/announcements', label: 'Announcements', icon: '📢' },
    { path: '/renewals', label: 'Renewals', icon: '🔄' },
    { path: '/receipts', label: 'Receipts', icon: '🧾' },
    { path: '/families', label: 'Families', icon: '👨‍👩‍👧' },
    { path: '/departures', label: 'Departures', icon: '🕊️' },
    { path: '/history', label: 'Print History', icon: '🖨️' },
    ...(user?.role === 'superadmin' ? [{ path: '/settings', label: 'Settings', icon: '⚙️' }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const canEdit = user?.role === 'superadmin' || user?.role === 'operator';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-20'} bg-navy-deep text-white flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-navy/30">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h1 className="font-bold text-sm">MVA</h1>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-navy/30 rounded">
              <Menu size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(item.path)
                  ? 'bg-navy text-white'
                  : 'hover:bg-navy/30 text-gray-300'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-navy/30 space-y-3">
          {sidebarOpen && (
            <>
              <div className="text-xs text-gray-400 px-2">
                <p className="font-semibold text-gray-300">{user?.full_name}</p>
                <p className="capitalize text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-navy/30 rounded-lg transition text-gray-300"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 shadow-sm">
          <h2 className="text-xl md:text-2xl font-bold text-navy">Mysore Vellala Association®</h2>
          <p className="text-xs md:text-sm text-gray-600">Membership Management System</p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
