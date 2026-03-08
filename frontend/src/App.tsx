import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import { User } from './types';
import LoginPage from './pages/LoginPage';
import SelectionPage from './pages/SelectionPage';
import UploadPage from './pages/UploadPage';
import Footer from './components/Footer';
import ErrorModal from './components/ErrorModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Session bootstrap: check if the auth cookie already maps to a valid user.
    api.me().then((res) => setUser(res.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Last-resort UI safety net so unexpected runtime/rejection errors are surfaced to users.
    const onUnhandledError = (event: ErrorEvent) => {
      setError(event.error?.message || event.message || 'An unexpected error occurred.');
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason instanceof Error) {
        setError(reason.message);
        return;
      }
      if (typeof reason === 'string') {
        setError(reason);
        return;
      }
      setError('An unexpected error occurred.');
    };

    window.addEventListener('error', onUnhandledError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onUnhandledError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      // Clear local auth state immediately after backend session is invalidated.
      setUser(null);
      navigate('/login');
    } catch (err) {
      setError((err as Error).message || 'Could not log out right now.');
    }
  };

  if (loading) return <div className="center-screen">Loading...</div>;

  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/selection" element={user ? <SelectionPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
          <Route path="/upload" element={user ? <UploadPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={user ? '/selection' : '/login'} replace />} />
        </Routes>
      </main>
      <ErrorModal open={Boolean(error)} message={error} onClose={() => setError('')} />
      <Footer />
    </div>
  );
}
