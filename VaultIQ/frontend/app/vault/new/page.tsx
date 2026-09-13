'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVault } from '../../../context/VaultContext';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';
import { generatePassword } from '../../../lib/generator';
import { analyzePasswordStrength } from '../../../lib/passwordStrength';
import {
  Key, CreditCard, FileText, File, User, Lock, Globe, Eye, EyeOff,
  Wand2, Copy, Check, ArrowLeft, Save, Star,
} from 'lucide-react';
import Link from 'next/link';

type EntryType = 'PASSWORD' | 'CARD' | 'NOTE' | 'DOCUMENT' | 'IDENTITY';

const TYPES: Array<{ id: EntryType; label: string; icon: React.ReactNode }> = [
  { id: 'PASSWORD', label: 'Password', icon: <Key size={16} /> },
  { id: 'CARD', label: 'Card', icon: <CreditCard size={16} /> },
  { id: 'NOTE', label: 'Note', icon: <FileText size={16} /> },
  { id: 'DOCUMENT', label: 'Document', icon: <File size={16} /> },
  { id: 'IDENTITY', label: 'Identity', icon: <User size={16} /> },
];

export default function NewVaultEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addEntry, encryptionReady } = useVault();

  const [type, setType] = useState<EntryType>('PASSWORD');
  const [title, setTitle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(searchParams.get('password') || '');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasTwoFactor, setHasTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');

  const strength = password ? analyzePasswordStrength(password) : null;

  const handleGenerate = () => {
    const pw = generatePassword({ length: 16, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true, excludeAmbiguous: false });
    setPassword(pw);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (type === 'PASSWORD' && !password) { setError('Password is required'); return; }
    setSaving(true); setError('');

    const payload: any = { notes, hasTwoFactor };
    if (type === 'PASSWORD') { payload.password = password; }
    if (type === 'CARD') { payload.cardNumber = cardNumber; payload.cardholderName = cardholderName; payload.expirationDate = expirationDate; payload.cvv = cvv; }

    try {
      await addEntry({ type, title: title.trim(), websiteUrl: websiteUrl.trim() || undefined, username: username.trim() || undefined, payload, isFavorite });
      router.push('/vault');
    } catch (err: any) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (!encryptionReady) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Lock size={40} color="var(--text-muted)" />
        <h2>Vault is Locked</h2>
        <Link href="/dashboard" className="btn btn-teal">Unlock Vault</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <Link href="/vault" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Add New Entry</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>All data is encrypted before leaving your browser</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
          {TYPES.map((t) => (
            <button key={t.id} className={`tab ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>
              {t.icon} <span style={{ marginLeft: 5 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="card card-danger" style={{ marginBottom: 'var(--space-md)', fontSize: '0.83rem', color: 'var(--danger)' }}>{error}</div>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Common fields */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Title *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'PASSWORD' ? 'e.g. GitHub' : type === 'CARD' ? 'e.g. Visa Platinum' : 'Entry title'} required />
            </div>
            <button
              className={`btn btn-icon ${isFavorite ? '' : 'btn-ghost'}`}
              style={{ marginTop: 20, flexShrink: 0, color: isFavorite ? 'var(--warning)' : 'var(--text-muted)', background: isFavorite ? 'rgba(245,158,11,0.1)' : undefined }}
              onClick={() => setIsFavorite(!isFavorite)}
              title="Toggle favorite"
            >
              <Star size={16} fill={isFavorite ? 'var(--warning)' : 'none'} />
            </button>
          </div>

          {/* Password-specific fields */}
          {type === 'PASSWORD' && (
            <>
              <div className="input-group">
                <label className="input-label">Website URL</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input className="input" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://github.com" style={{ paddingLeft: 38 }} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Username / Email</label>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your@email.com" autoComplete="off" />
              </div>

              <div className="input-group">
                <label className="input-label">Password *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      className="input mono"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter or generate a password"
                      autoComplete="new-password"
                      style={{ paddingRight: 44 }}
                    />
                    <button className="btn btn-ghost btn-icon-sm" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setShowPassword(!showPassword)} type="button">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button className="btn btn-secondary btn-icon" onClick={handleCopy} type="button" title="Copy">
                    {copied ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
                  </button>
                  <button className="btn btn-secondary btn-icon" onClick={handleGenerate} type="button" title="Generate">
                    <Wand2 size={15} />
                  </button>
                </div>
                {password && <PasswordStrengthMeter password={password} />}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div onClick={() => setHasTwoFactor(!hasTwoFactor)} style={{ width: 40, height: 22, borderRadius: 11, background: hasTwoFactor ? 'var(--teal)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background var(--transition)', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: hasTwoFactor ? 21 : 3, transition: 'left var(--transition)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Two-Factor Authentication (2FA) Enabled</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mark this account as 2FA-protected</div>
                </div>
              </label>
            </>
          )}

          {/* Card-specific fields */}
          {type === 'CARD' && (
            <>
              <div className="input-group">
                <label className="input-label">Cardholder Name</label>
                <input className="input" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="input-group">
                <label className="input-label">Card Number</label>
                <input className="input mono" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="1234 5678 9012 3456" maxLength={16} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Expiry</label>
                  <input className="input mono" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} placeholder="MM/YY" maxLength={5} />
                </div>
                <div className="input-group">
                  <label className="input-label">CVV</label>
                  <input className="input mono" type="password" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="•••" maxLength={4} />
                </div>
              </div>
            </>
          )}

          {/* Notes (all types) */}
          <div className="input-group">
            <label className="input-label">Secure Notes</label>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (stored encrypted)"
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'var(--font-main)' }}
            />
          </div>

          {/* Save */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 'var(--space-sm)' }}>
            <Link href="/vault" className="btn btn-secondary" style={{ flex: 1 }}>Cancel</Link>
            <button className="btn btn-teal" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? (
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <><Save size={16} /> Save Entry</>
              )}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
