import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, LogOut, LayoutDashboard, Users, CreditCard, Megaphone,
  Globe, RefreshCw, Receipt, UsersRound, Bird, Printer, Settings as SettingsIcon,
} from 'lucide-react';
import { useState } from 'react';

const GOLD = '#E8C874';

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const menuItems = [
    { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
    { path: '/members', label: 'Members', Icon: Users },
    { path: '/cards', label: 'ID Cards', Icon: CreditCard },
    { path: '/announcements', label: 'Announcements', Icon: Megaphone },
    { path: '/site-content', label: 'Brochure Website', Icon: Globe },
    { path: '/renewals', label: 'Renewals', Icon: RefreshCw },
    { path: '/receipts', label: 'Receipts', Icon: Receipt },
    { path: '/families', label: 'Families', Icon: UsersRound },
    { path: '/departures', label: 'Departures', Icon: Bird },
    { path: '/history', label: 'Print History', Icon: Printer },
    ...(user?.role === 'superadmin' ? [{ path: '/settings', label: 'Settings', Icon: SettingsIcon }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const canEdit = user?.role === 'superadmin' || user?.role === 'operator';

  return (
    <div className="flex h-screen bg-cream">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-20'} bg-navy-deep flex flex-col transition-all duration-300`} style={{ color: GOLD }}>
        <div className="p-4 border-b border-navy/30">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h1 className="font-bold text-sm">MVA</h1>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-navy/30 rounded">
              <Menu size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map(({ path, label, Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(path) ? 'bg-navy' : 'hover:bg-navy/30'
              }`}
              style={{ color: GOLD, opacity: isActive(path) ? 1 : 0.8 }}
            >
              <Icon size={20} className="flex-none" />
              {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-navy/30 space-y-3">
          {sidebarOpen && (
            <>
              <div className="text-xs px-2" style={{ color: GOLD, opacity: 0.85 }}>
                <p className="font-semibold">{user?.full_name}</p>
                <p className="capitalize" style={{ opacity: 0.75 }}>{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-navy/30 rounded-lg transition"
                style={{ color: GOLD, opacity: 0.85 }}
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
        <header
          className="border-b border-[#E8D2A8] px-4 md:px-8 py-4 flex items-center gap-3 relative z-10"
          style={{ backgroundColor: '#FAEBD2' }}
        >
          <img src="/mva-assets/logo.png" alt="Mysore Vellala Association seal" className="w-11 h-11 md:w-14 md:h-14 object-contain flex-none" />
          <div>
            <h2
              className="text-lg md:text-2xl font-bold text-[#8A6A14] leading-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Mysore Vellala Association (R.)
            </h2>
            <p className="text-xs md:text-sm text-gray-600">(Mudaliar Sangam)</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
