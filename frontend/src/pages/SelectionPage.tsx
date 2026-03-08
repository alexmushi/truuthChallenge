import { useNavigate } from 'react-router-dom';
import { User } from '../types';

export default function SelectionPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h2>Welcome, {user.username}</h2>
          <p>Select your next action.</p>
        </div>
        <button className="secondary" onClick={onLogout}>Logout</button>
      </header>
      <main className="card selection-card">
        <h3>Selection Page</h3>
        <p>Begin document submission and track verification status in real time.</p>
        <button onClick={() => navigate('/upload')}>Upload Documents</button>
      </main>
    </div>
  );
}
