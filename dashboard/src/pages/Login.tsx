import { useState } from 'react';

export default function LoginPage({ onLogin, useAuth0 }: { onLogin: () => void; useAuth0: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (useAuth0) {
    // Redirect to Auth0 login
    window.location.href = '/login';
    return (
      <div className="login-page">
        <div className="login-card">
          <img src="/logo.png" alt="ABB" className="login-logo" />
          <h1 className="login-title">AdsButBetter</h1>
          <p className="login-subtitle">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        setError('Wrong password');
      }
    } catch {
      setError('Connection failed');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png" alt="ABB" className="login-logo" />
        <h1 className="login-title">AdsButBetter</h1>
        <p className="login-subtitle">Enter password to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="login-input"
            autoFocus
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn btn-primary login-btn" disabled={loading || !password}>
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
