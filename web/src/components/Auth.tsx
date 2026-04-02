import React, { useState } from 'react';
import { useMail } from '../store';

export default function Auth() {
  const { login, register } = useMail();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('All fields are required.'); return; }
    if (mode === 'register') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirm) { setError('Passwords do not match.'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(username.trim(), password);
      else                   await register(username.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo" style={{ background: 'transparent' }}>
            <img src="/pigeon-logo.png" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} alt="Pigeon Mail" />
          </div>
          <div className="auth-card-title">Pigeon Mail</div>
          <div className="auth-card-sub">{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</div>
        </div>

        <div className="auth-card-body">
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="auth-field">
              <label className="auth-field-label">Username</label>
              <input className="auth-field-input" type="text" placeholder="e.g. alice"
                autoCapitalize="none" autoComplete="username" autoFocus
                value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-field-label">Password</label>
              <input className="auth-field-input" type="password" placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-field-label">Confirm Password</label>
                <input className="auth-field-input" type="password" placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
            )}
            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" style={{borderTopColor:'white',borderColor:'rgba(255,255,255,0.3)'}} /> : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button className="auth-switch-link" onClick={() => { setMode('register'); setError(''); }}>Register</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button className="auth-switch-link" onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
