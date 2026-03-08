import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import { User } from './types';
import LoginPage from './pages/LoginPage';
import SelectionPage from './pages/SelectionPage';
import UploadPage from './pages/UploadPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then((res) => setUser(res.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigate('/login');
  };

  if (loading) return <div className="center-screen">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/selection" element={user ? <SelectionPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
      <Route path="/upload" element={user ? <UploadPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? '/selection' : '/login'} replace />} />
    </Routes>
  );
}
