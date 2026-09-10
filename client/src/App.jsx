import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MemberList from './pages/MemberList';
import MemberForm from './pages/MemberForm';
import MemberView from './pages/MemberView';
import IdCards from './pages/IdCards';
import Announcements from './pages/Announcements';
import AdminSettings from './pages/AdminSettings';
import Renewals from './pages/Renewals';
import Receipts from './pages/Receipts';
import Families from './pages/Families';
import Departures from './pages/Departures';
import PrintHistory from './pages/PrintHistory';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from local storage, then refresh data from the server in background
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('currentUser');
    if (token && storedUser) {
      try {
        setUser({ ...JSON.parse(storedUser), token });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);

    // Background sync (no-op if the server isn't reachable — demo mode continues)
    import('./lib/memberStore').then(({ syncFromServer }) => syncFromServer());
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setUser({ ...userData, token });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('apiToken');
    setUser(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-card-blue">Loading...</div>;

  return (
    <ErrorBoundary>
    <BrowserRouter basename="/admin">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<MemberList />} />
            <Route path="/members/new" element={<MemberForm />} />
            <Route path="/members/:id" element={<MemberView />} />
            <Route path="/members/:id/edit" element={<MemberForm />} />
            <Route path="/cards" element={<IdCards />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/renewals" element={<Renewals />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/families" element={<Families />} />
            <Route path="/departures" element={<Departures />} />
            <Route path="/history" element={<PrintHistory />} />
            <Route path="/settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
