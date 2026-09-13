'use client';
import React from 'react';
import { analyzePasswordStrength, getStrengthLabel, getStrengthColor } from '../lib/passwordStrength';
import { Clock, Zap } from 'lucide-react';

interface Props {
  password: string;
  showDetails?: boolean;
}

export default function PasswordStrengthMeter({ password, showDetails = true }: Props) {
  if (!password) return null;

  const result = analyzePasswordStrength(password);
  const { score, level, crackTime, entropy, suggestions } = result;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Bar */}
      <div className="strength-bar-container">
        <div className="strength-bar-track">
          <div className={`strength-bar-fill ${level}`} style={{ width: `${score}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`strength-label ${level}`}>{getStrengthLabel(level)}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={10} />
            {Math.round(entropy)} bits
          </span>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Crack time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Clock size={11} />
            <span>Estimated crack time: <strong style={{ color: 'var(--text-secondary)' }}>{crackTime}</strong></span>
          </div>

          {/* Character type indicators */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: 'A-Z', active: result.hasUppercase },
              { label: 'a-z', active: result.hasLowercase },
              { label: '0-9', active: result.hasNumbers },
              { label: '!@#', active: result.hasSymbols },
              { label: `${result.length} chars`, active: result.length >= 12 },
            ].map(({ label, active }) => (
              <span
                key={label}
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono)',
                  background: active ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.1)',
                  color: active ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${active ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {suggestions.map((s, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'flex-start', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }}>→</span>
                  {s}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
