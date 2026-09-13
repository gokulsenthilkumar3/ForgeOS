'use client';
import Link from 'next/link';
import { Shield, Key, Zap, Lock, Eye, EyeOff, RefreshCw, Check, Globe, Smartphone, ChevronRight } from 'lucide-react';

const FEATURES = [
  {
    icon: <Shield size={22} />,
    title: 'Zero-Knowledge Encryption',
    description: 'Your data is encrypted locally using AES-256-GCM before it ever touches our servers. Not even we can see your passwords.',
  },
  {
    icon: <Key size={22} />,
    title: 'Smart Password Generator',
    description: 'Generate cryptographically secure passwords, memorable passphrases, PINs, and usernames with a single click.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Breach Intelligence',
    description: 'Real-time monitoring against known breach databases. Get alerted the moment your credentials are compromised.',
  },
  {
    icon: <RefreshCw size={22} />,
    title: 'Security Score',
    description: 'Your personalized vault health score with detailed breakdowns of weak, reused, and stale passwords.',
  },
  {
    icon: <Globe size={22} />,
    title: 'Browser Extension',
    description: 'Auto-fill credentials on any website with our secure browser extension. Available for Chrome, Firefox, and Edge.',
  },
  {
    icon: <Smartphone size={22} />,
    title: 'Biometric Unlock',
    description: 'Use Face ID or fingerprint to unlock your vault instantly on supported devices, no master password needed.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: 0,
    items: ['Unlimited passwords', 'Basic security score', 'Password generator', '1 device sync'],
  },
  {
    name: 'Pro',
    price: 3,
    featured: true,
    items: ['Everything in Free', 'Breach monitoring', 'Advanced analytics', 'Unlimited device sync', 'Priority support'],
  },
  {
    name: 'Teams',
    price: 5,
    items: ['Everything in Pro', 'Team sharing', 'Admin console', 'Audit logs', 'SSO integration', 'SLA guarantee'],
  },
];

export default function LandingPage() {
  return (
    <div className="landing-container">
      {/* Nav */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, color: 'var(--teal)', fontSize: '1.1rem' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--navy), var(--teal))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={16} color="white" />
          </div>
          VaultIQ
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/login" className="btn btn-teal btn-sm">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="grid-pattern" />
        <div className="hero-content animate-slide-up">
          <div className="hero-badge">
            <Shield size={13} />
            Zero-Knowledge Encryption
          </div>
          <h1 className="hero-title">
            Every Credential<br />
            <span style={{ background: 'linear-gradient(90deg, var(--teal), var(--teal-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Counts. Secured.
            </span>
          </h1>
          <p className="hero-subtitle">
            VaultIQ gives you military-grade password protection with an interface you'll actually love. Zero-knowledge, zero-compromise, zero-friction.
          </p>
          <div className="hero-ctas">
            <Link href="/login" className="btn btn-teal btn-lg">
              Start Free — No Credit Card
              <ChevronRight size={18} />
            </Link>
            <Link href="#features" className="btn btn-secondary btn-lg">
              See Features
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            {[
              { value: '256-bit', label: 'AES-GCM Encryption' },
              { value: 'Zero', label: 'Knowledge Server' },
              { value: 'PBKDF2', label: '600k Iterations' },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--teal)' }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="hero-badge" style={{ margin: '0 auto 16px' }}>Built Different</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>Security You Can Trust</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>Everything you need to protect your digital life. Nothing you don't.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 40px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>How Zero-Knowledge Works</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Your master password is the only key. We never see it. No one does.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              { step: '01', title: 'You Enter Your Password', desc: 'Your master password is typed in your browser. It never leaves your device unencrypted.' },
              { step: '02', title: 'Local Key Derivation', desc: 'PBKDF2-SHA256 with 600k iterations derives a secure encryption key from your password + salt.' },
              { step: '03', title: 'AES-256-GCM Encryption', desc: 'Every vault entry is encrypted with AES-256-GCM using a unique IV. Ciphertext is what gets stored.' },
              { step: '04', title: 'Server Stores Only Ciphertext', desc: 'Our servers see only encrypted blobs. Without your master password, they\'re useless noise.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ position: 'relative' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'rgba(0,168,181,0.12)', lineHeight: 1, marginBottom: 12, fontFamily: 'var(--font-mono)' }}>{step}</div>
                <h4 style={{ fontWeight: 700, marginBottom: 8 }}>{title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>Simple, Honest Pricing</h2>
          <p style={{ color: 'var(--text-secondary)' }}>No surprises. No dark patterns. Cancel anytime.</p>
        </div>
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
              <h3 style={{ marginBottom: 8 }}>{plan.name}</h3>
              <div className="pricing-price">
                ${plan.price}
                <span>/month</span>
              </div>
              <div className="divider" style={{ margin: '16px 0' }} />
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.items.map((item) => (
                  <li key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className={`btn ${plan.featured ? 'btn-teal' : 'btn-secondary'}`} style={{ width: '100%', marginTop: 20 }}>
                {plan.price === 0 ? 'Get Started Free' : `Start ${plan.name} Trial`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 16 }}>
            Start protecting your
            <br /><span style={{ color: 'var(--teal)' }}>digital identity today.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1rem' }}>
            Join thousands of users who trust VaultIQ with their most sensitive credentials.
          </p>
          <Link href="/login" className="btn btn-teal btn-lg" style={{ marginRight: 12 }}>
            Create Free Account <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 40px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--teal)' }}>
          <Lock size={16} /> VaultIQ
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} VaultIQ. Zero-Knowledge. Open Architecture.
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Privacy', 'Terms', 'Security'].map((l) => (
            <a key={l} href="#" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
