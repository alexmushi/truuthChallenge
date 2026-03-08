import { useNavigate } from 'react-router-dom';
import { User } from '../types';

export default function SelectionPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="selection-page-shell">
      <header className="upload-header">
        <div className="upload-header-inner">
          <button type="button" className="upload-header-logo-link" onClick={() => navigate('/selection')}>
            <img src="/logo-light.svg" alt="Truuth" className="upload-header-logo" />
          </button>
          <div className="upload-user-box">
            <div>
              <p className="upload-user-name">{user.username}</p>
              <button className="upload-logout-link" onClick={onLogout}>Logout</button>
            </div>
            <span className="upload-user-avatar" aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="selection-shell">
        <header className="selection-head">
          <img src="/logo-light.svg" alt="Truuth" className="selection-logo" />
          <p className="selection-portal-label">USER PORTAL</p>
          <h1>Welcome</h1>
          <p className="selection-subtitle">
            Complete the steps below to finish your onboarding and verification process.
          </p>
        </header>

        <section className="selection-timeline" aria-label="Onboarding steps">
          <article className="timeline-row timeline-completed">
            <div className="timeline-marker" aria-hidden="true">OK</div>
            <div className="timeline-card">
              <span className="timeline-tag">Step 1</span>
              <h2>Identity verification</h2>
              <p>Your identity has been successfully verified.</p>
              <p className="timeline-status success">Completed</p>
            </div>
          </article>

          <article className="timeline-row timeline-active">
            <div className="timeline-marker" aria-hidden="true">2</div>
            <div className="timeline-card">
              <span className="timeline-tag">Step 2</span>
              <h2>Upload your documents</h2>
              <p>Submit the documents required as part of your onboarding.</p>
              <p className="timeline-status pending">Not started</p>
              <button className="timeline-cta" onClick={() => navigate('/upload')}>
                Get started <span aria-hidden="true">{'>'}</span>
              </button>
            </div>
          </article>

          <article className="timeline-row timeline-locked">
            <div className="timeline-marker" aria-hidden="true">3</div>
            <div className="timeline-card">
              <span className="timeline-tag">Step 3</span>
              <h2>Verify your first day at PwC</h2>
              <p>Confirm your identity on your first day to complete your onboarding.</p>
              <p className="timeline-status">This step will be available once document upload is complete.</p>
              <button className="timeline-locked-btn" type="button" disabled>Locked</button>
            </div>
          </article>

          <article className="timeline-row timeline-locked">
            <div className="timeline-marker" aria-hidden="true">4</div>
            <div className="timeline-card">
              <span className="timeline-tag">Step 4</span>
              <h2>Ongoing identity verification</h2>
              <p>Complete periodic identity checks when requested.</p>
              <p className="timeline-status">Available after first day verification.</p>
              <button className="timeline-locked-btn" type="button" disabled>Locked</button>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
