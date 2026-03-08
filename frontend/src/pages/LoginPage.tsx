import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { User } from '../types';

export default function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username, password);
      onLogin(res.user);
      navigate('/selection');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen login-shell">
      <div className="login-header">
        <img className="login-logo" src="/logo-light.svg" alt="Truuth" />
        <p className="login-portal-label">USER PORTAL</p>
      </div>

      <h1 className="login-title">Sign in to your account</h1>
      <p className="login-subtitle">Enter your credentials to access the portal</p>

      <form className="login-card" onSubmit={handleSubmit}>
        <label className="login-field">
          <span>Username or Email</span>
          <div className="login-input-wrap">
            <span className="login-input-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              placeholder="Enter your username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </label>

        <label className="login-field">
          <span>Password</span>
          <div className="login-input-wrap">
            <span className="login-input-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="login-icon-btn"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
          </div>
        </label>

        <div className="login-options">
          <label className="login-remember">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <span>Remember me</span>
          </label>
          <button type="button" className="login-link-btn">Forgot password?</button>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="login-submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="login-alt-divider"><span>Alternative access</span></div>
        <p className="login-alt-copy">Submitting documents on behalf of an applicant?</p>
        <button type="button" className="login-alt-link">Sign in as a submitter <span aria-hidden="true">→</span></button>
      </form>

      <p className="login-security">◌ Your connection is secure and encrypted</p>

      <section className="login-bottom-info">
        <article className="login-info-card">
          <div className="login-info-head">
            <span className="login-info-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3 4.5 6v5.3c0 4.6 3.2 8.8 7.5 9.9 4.3-1.1 7.5-5.3 7.5-9.9V6L12 3Z"
                  fill="currentColor"
                  opacity="0.2"
                />
                <path d="M12 3 4.5 6v5.3c0 4.6 3.2 8.8 7.5 9.9 4.3-1.1 7.5-5.3 7.5-9.9V6L12 3Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <h2>How does the BioPass MFA Work?</h2>
          </div>
          <p className="login-info-lead">Our biometric verification process is designed to be simple, secure, and fast</p>

          <div className="login-step">
            <span>1</span>
            <div>
              <h3>Scan the QR Code</h3>
              <p>Scan the QR code shown on the screen (if done through desktop/laptop)</p>
            </div>
          </div>

          <div className="login-step">
            <span>2</span>
            <div>
              <h3>Capture</h3>
              <p>Allow camera access and follow on-screen instructions for facial capture</p>
            </div>
          </div>

          <div className="login-step">
            <span>3</span>
            <div>
              <h3>Verify</h3>
              <p>Receive instant confirmation once your identity has been successfully verified</p>
            </div>
          </div>
        </article>

        <article className="login-info-card login-support-card">
          <span className="login-support-icon" aria-hidden="true">✉</span>
          <h2>Need Additional Help?</h2>
          <p>Our support team is ready to assist you with any questions or concerns</p>
          <h3>Email Support</h3>
          <p>Get detailed assistance via email from our dedicated support team</p>
          <a href="mailto:help@truuth.id">help@truuth.id</a>
          <p className="login-support-time">
            <span className="login-support-time-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Response within 24 hours
          </p>
        </article>
      </section>
    </div>
  );
}
