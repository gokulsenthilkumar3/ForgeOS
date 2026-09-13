'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { analyzePasswordStrength, getStrengthColor, getStrengthLabel } from '../../lib/passwordStrength';
import { Lock, Eye, EyeOff, Shield, AlertCircle, CheckCircle, Key, ArrowRight } from 'lucide-react';

type Mode = 'login' | 'register' | 'recover';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { initializeEncryption } = useVault();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [recoveryCodeDisplay, setRecoveryCodeDisplay] = useState('');

  const strength = mode === 'register' ? analyzePasswordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const userProfile = await login(email, password);
        await initializeEncryption(password, userProfile.salt).catch(() => {});
      } else if (mode === 'register') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (!strength || strength.score < 40) throw new Error('Please use a stronger master password');
        const result = await register(email, fullName, password);
        await initializeEncryption(password, result.user.salt).catch(() => {});
        if (result.recoveryCode) setRecoveryCodeDisplay(result.recoveryCode);
      } else {
        // recover
        setSuccessMessage('Recovery successful. Please save your new recovery code.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-lg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(27,58,107,0.25) 0%, transparent 70%)',
      }} />
      <div className="grid-pattern" />

      {/* Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        width: '100%',
        maxWidth: 440,
        boxShadow: 'var(--shadow-xl)',
        position: 'relative',
        zIndex: 1,
        animation: 'slideUpModal 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--navy) 0%, var(--teal) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: 'var(--glow-teal)',
          }}>
            <Lock size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>VaultIQ</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {mode === 'login' ? 'Sign in to your vault' :
             mode === 'register' ? 'Create your secure vault' :
             'Recover your account'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Sign In</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>Create Account</button>
          <button className={`tab ${mode === 'recover' ? 'active' : ''}`} onClick={() => { setMode('recover'); setError(''); }}>Recover</button>
        </div>

        {/* Recovery code display */}
        {recoveryCodeDisplay && (
          <div className="card card-warning" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Key size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '0.85rem', marginBottom: 6 }}>Save Your Recovery Code!</div>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, display: 'block', userSelect: 'all' }}>
                  {recoveryCodeDisplay}
                </code>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  This is shown once. Store it in a safe place. You'll need it if you forget your master password.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card card-danger" style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.83rem', color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Full name (register only) */}
          {mode === 'register' && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                className="input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                autoComplete="name"
              />
            </div>
          )}

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Recovery code (recover only) */}
          {mode === 'recover' && (
            <div className="input-group">
              <label className="input-label">Recovery Code</label>
              <input
                className="input mono"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXXXXXXXXXXXXXX"
                required
                maxLength={20}
              />
            </div>
          )}

          {/* Password */}
          {mode !== 'recover' && (
            <div className="input-group">
              <label className="input-label">Master Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your master password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon-sm"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar for register */}
              {mode === 'register' && password && strength && (
                <div style={{ marginTop: 8 }}>
                  <div className="strength-bar-container">
                    <div className="strength-bar-track">
                      <div className={`strength-bar-fill ${strength.level}`} style={{ width: `${strength.score}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`strength-label ${strength.level}`}>{getStrengthLabel(strength.level)}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>~{strength.crackTime} to crack</span>
                    </div>
                  </div>
                  {strength.suggestions.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {strength.suggestions.map((s, i) => (
                        <div key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
                          <span style={{ color: 'var(--warning)' }}>•</span> {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New password (recover) */}
          {mode === 'recover' && (
            <div className="input-group">
              <label className="input-label">New Master Password</label>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Confirm password (register) */}
          {mode === 'register' && (
            <div className="input-group">
              <label className="input-label">Confirm Master Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className={`input ${confirmPassword && confirmPassword !== password ? 'error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your master password"
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                {confirmPassword && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    {confirmPassword === password
                      ? <CheckCircle size={16} color="var(--success)" />
                      : <AlertCircle size={16} color="var(--danger)" />}
                  </div>
                )}
              </div>
              {confirmPassword && confirmPassword !== password && (
                <span className="input-hint error">Passwords do not match</span>
              )}
            </div>
          )}

          {/* Zero-knowledge notice (register) */}
          {mode === 'register' && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(0,168,181,0.06)', border: '1px solid rgba(0,168,181,0.15)', borderRadius: 'var(--radius-md)' }}>
              <Shield size={14} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                <strong style={{ color: 'var(--teal)' }}>Zero-knowledge encryption.</strong> Your master password is never sent to our servers. All vault data is encrypted locally in your browser.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-teal"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? (
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                {mode === 'login' ? 'Unlock Vault' : mode === 'register' ? 'Create Vault' : 'Recover Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
