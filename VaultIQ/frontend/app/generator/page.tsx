'use client';
import React, { useState, useCallback } from 'react';
import { generatePassword, generatePassphrase, generatePin, generateUsername, PasswordOptions, PassphraseOptions } from '../../lib/generator';
import { analyzePasswordStrength } from '../../lib/passwordStrength';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { Wand2, Copy, RefreshCw, Check, Dice5, BookOpen, Hash, User } from 'lucide-react';
import Link from 'next/link';

type GenMode = 'password' | 'passphrase' | 'pin' | 'username';

export default function GeneratorPage() {
  const [mode, setMode] = useState<GenMode>('password');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Password options
  const [pwLength, setPwLength] = useState(16);
  const [pwUppercase, setPwUppercase] = useState(true);
  const [pwLowercase, setPwLowercase] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);
  const [pwExcludeAmbiguous, setPwExcludeAmbiguous] = useState(false);

  // Passphrase options
  const [ppWordCount, setPpWordCount] = useState(4);
  const [ppSeparator, setPpSeparator] = useState<PassphraseOptions['separator']>('-');
  const [ppCapitalize, setPpCapitalize] = useState(true);
  const [ppIncludeNumber, setPpIncludeNumber] = useState(true);

  // PIN options
  const [pinLength, setPinLength] = useState(6);

  const generate = useCallback(() => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 620);

    let result = '';
    if (mode === 'password') {
      result = generatePassword({
        length: pwLength,
        includeUppercase: pwUppercase,
        includeLowercase: pwLowercase,
        includeNumbers: pwNumbers,
        includeSymbols: pwSymbols,
        excludeAmbiguous: pwExcludeAmbiguous,
      });
    } else if (mode === 'passphrase') {
      result = generatePassphrase({ wordCount: ppWordCount, separator: ppSeparator, capitalize: ppCapitalize, includeNumber: ppIncludeNumber });
    } else if (mode === 'pin') {
      result = generatePin(pinLength);
    } else {
      result = generateUsername();
    }

    setGenerated(result);
    setHistory((prev) => [result, ...prev].slice(0, 10));
  }, [mode, pwLength, pwUppercase, pwLowercase, pwNumbers, pwSymbols, pwExcludeAmbiguous, ppWordCount, ppSeparator, ppCapitalize, ppIncludeNumber, pinLength]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = mode === 'password' && generated ? analyzePasswordStrength(generated) : null;

  const MODES = [
    { id: 'password' as const, label: 'Password', icon: <Wand2 size={15} /> },
    { id: 'passphrase' as const, label: 'Passphrase', icon: <BookOpen size={15} /> },
    { id: 'pin' as const, label: 'PIN', icon: <Hash size={15} /> },
    { id: 'username' as const, label: 'Username', icon: <User size={15} /> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🎲 Password Generator</h1>
        <p className="page-subtitle">Generate cryptographically secure passwords, passphrases, PINs, and usernames</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 'var(--space-xl)', alignItems: 'start' }}>
        {/* Left: generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* Mode tabs */}
          <div className="tabs">
            {MODES.map((m) => (
              <button key={m.id} className={`tab ${mode === m.id ? 'active' : ''}`} onClick={() => { setMode(m.id); setGenerated(''); }}>
                {m.icon} <span style={{ marginLeft: 5 }}>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Generated value display */}
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            {generated ? (
              <>
                <div
                  className={`mono ${animating ? 'animate-dice' : ''}`}
                  style={{
                    fontSize: mode === 'password' ? '1.1rem' : '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    wordBreak: 'break-all',
                    lineHeight: 1.6,
                    minHeight: 64,
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    marginBottom: 'var(--space-md)',
                    letterSpacing: mode === 'pin' ? '0.3em' : '0.02em',
                    userSelect: 'all',
                  }}
                >
                  {generated}
                </div>

                {strength && <PasswordStrengthMeter password={generated} />}

                <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-md)' }}>
                  <button className="btn btn-teal" style={{ flex: 1 }} onClick={() => copyToClipboard(generated)}>
                    {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy</>}
                  </button>
                  <button className="btn btn-secondary" onClick={generate}>
                    <RefreshCw size={15} className={animating ? 'animate-sync' : ''} /> Regenerate
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                <div className="animate-float" style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎲</div>
                <p style={{ fontSize: '0.85rem' }}>Click Generate to create a secure {mode}</p>
              </div>
            )}
          </div>

          {/* Generate button */}
          <button className="btn btn-teal btn-lg" style={{ width: '100%' }} onClick={generate}>
            <Dice5 size={20} className={animating ? 'animate-dice' : ''} />
            Generate {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>

          {/* Options */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>⚙️ Options</h3>

            {mode === 'password' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Length slider */}
                <div className="input-group">
                  <label className="input-label">
                    Length
                    <span style={{ marginLeft: 8, color: 'var(--teal)', fontWeight: 700, fontSize: '1rem' }}>{pwLength}</span>
                  </label>
                  <input
                    type="range" min={8} max={128} value={pwLength}
                    onChange={(e) => setPwLength(+e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--teal)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>8</span><span>128</span>
                  </div>
                </div>

                {/* Toggles */}
                {[
                  { label: 'Uppercase (A-Z)', value: pwUppercase, set: setPwUppercase },
                  { label: 'Lowercase (a-z)', value: pwLowercase, set: setPwLowercase },
                  { label: 'Numbers (0-9)', value: pwNumbers, set: setPwNumbers },
                  { label: 'Symbols (!@#$%)', value: pwSymbols, set: setPwSymbols },
                  { label: 'Exclude ambiguous (0, O, l, 1)', value: pwExcludeAmbiguous, set: setPwExcludeAmbiguous },
                ].map(({ label, value, set }) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                    <div
                      onClick={() => set(!value)}
                      style={{
                        width: 40, height: 22, borderRadius: 11,
                        background: value ? 'var(--teal)' : 'var(--border)',
                        position: 'relative', cursor: 'pointer', transition: 'background var(--transition)', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3, left: value ? 21 : 3,
                        transition: 'left var(--transition)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
                  </label>
                ))}
              </div>
            )}

            {mode === 'passphrase' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Words: <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{ppWordCount}</span></label>
                  <input type="range" min={3} max={8} value={ppWordCount} onChange={(e) => setPpWordCount(+e.target.value)} style={{ width: '100%', accentColor: 'var(--teal)' }} />
                </div>
                <div className="input-group">
                  <label className="input-label">Separator</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['-', ' ', '.', '_'] as const).map((sep) => (
                      <button key={sep} className={`btn btn-sm ${ppSeparator === sep ? 'btn-teal' : 'btn-secondary'}`} onClick={() => setPpSeparator(sep)}>
                        <code style={{ fontFamily: 'var(--font-mono)' }}>"{sep === ' ' ? 'space' : sep}"</code>
                      </button>
                    ))}
                  </div>
                </div>
                {[
                  { label: 'Capitalize words', value: ppCapitalize, set: setPpCapitalize },
                  { label: 'Include number', value: ppIncludeNumber, set: setPpIncludeNumber },
                ].map(({ label, value, set }) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div onClick={() => set(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? 'var(--teal)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background var(--transition)', flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left var(--transition)' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
                  </label>
                ))}
              </div>
            )}

            {mode === 'pin' && (
              <div className="input-group">
                <label className="input-label">PIN Length: <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{pinLength} digits</span></label>
                <input type="range" min={4} max={12} value={pinLength} onChange={(e) => setPinLength(+e.target.value)} style={{ width: '100%', accentColor: 'var(--teal)' }} />
              </div>
            )}

            {mode === 'username' && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Generates a memorable username using adjective + noun + 4-digit number (e.g. SwiftHawk2891). Cryptographically random selection.
              </p>
            )}
          </div>
        </div>

        {/* Right: history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* Tips card */}
          <div className="card card-info">
            <h4 style={{ fontSize: '0.85rem', marginBottom: 8 }}>💡 Password Tips</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Use at least 16 characters for maximum security',
                'Passphrases are easier to remember and just as secure',
                'Never reuse passwords across different sites',
                'Use a unique password for every account',
              ].map((tip, i) => (
                <li key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--info)' }}>→</span> {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>📋 Recent Generations</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>Session only — cleared on logout</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <code style={{ flex: 1, fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</code>
                    <button className="btn btn-ghost btn-icon-sm" onClick={() => copyToClipboard(h)} title="Copy">
                      <Copy size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save to vault CTA */}
          {generated && (
            <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(0,168,181,0.3)' }}>
              <h4 style={{ marginBottom: 8 }}>Like this one?</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                Save it directly to your vault with a single click.
              </p>
              <Link href={`/vault/new?password=${encodeURIComponent(generated)}`} className="btn btn-teal btn-sm" style={{ width: '100%' }}>
                Save to Vault
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
