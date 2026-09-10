import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin } from '../lib/api';
import { syncFromServer } from '../lib/memberStore';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1) Real server login (Hostinger PHP API)
      try {
        const { token, user } = await apiLogin(username, password);
        localStorage.setItem('apiToken', token);
        await syncFromServer();
        onLogin(token, user);
        navigate('/');
        return;
      } catch (apiErr) {
        // Wrong password on a live server must NOT fall through to demo users
        if (apiErr.message.includes('Invalid username or password') || apiErr.message.includes('Viewers')) {
          throw apiErr;
        }
        // Server unreachable — fall back to offline/demo accounts below
      }

      // 2) Offline/demo fallback (no server available)
      const users = [
        { id: 1, username: 'admin', password: 'admin123', name: 'Administrator', role: 'superadmin' },
        { id: 2, username: 'operator', password: 'oper123', name: 'Operator', role: 'operator' },
        { id: 3, username: 'viewer', password: 'view123', name: 'Viewer', role: 'viewer' }
      ];

      const user = users.find(u => u.username === username && u.password === password);
      if (!user) throw new Error('Invalid credentials');

      localStorage.setItem('serverConnected', '0');
      onLogin('demo-token', { id: user.id, username: user.username, full_name: user.name, role: user.role });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-navy-deep flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">Mudaliar Sangham</h1>
          <p className="text-gray-600">Mysore Vellala Association</p>
          <p className="text-sm text-gray-500 mt-2">Membership Management System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white font-medium py-2 rounded-lg hover:bg-navy-deep transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4 font-semibold">Login Accounts</p>
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-medium text-navy">Admin</p>
              <p className="text-gray-600">admin / admin123</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-medium text-navy">Operator</p>
              <p className="text-gray-600">operator / oper123</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-medium text-navy">Viewer</p>
              <p className="text-gray-600">viewer / view123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
