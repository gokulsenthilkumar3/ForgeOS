import { useState } from 'react';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [form, setForm]   = useState({ email: '', webhook: '', slack: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">⚙ SETTINGS</div>
          <div className="page-subtitle">Notification channels & preferences</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-title">Alert Channels</div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="alerts@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Webhook URL</label>
          <input className="form-input" value={form.webhook}
            onChange={e => set('webhook', e.target.value)} placeholder="https://hooks.example.com/..." />
        </div>
        <div className="form-group">
          <label className="form-label">Slack Webhook</label>
          <input className="form-input" value={form.slack}
            onChange={e => set('slack', e.target.value)} placeholder="https://hooks.slack.com/services/..." />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={save}>Save Settings</button>
          {saved && <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ Saved</span>}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520, marginTop: 16 }}>
        <div className="card-title">Keyboard Shortcuts</div>
        <table style={{ fontSize: 12 }}>
          <tbody>
            {[['Alt + T', 'Toggle alerts panel'], ['Alt + E', 'Go to Endpoints'], ['Alt + D', 'Go to Dashboard']].map(([k, v]) => (
              <tr key={k}>
                <td style={{ paddingRight: 24, color: 'var(--accent)', fontWeight: 'bold' }}>{k}</td>
                <td style={{ color: 'var(--text-dim)' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
