'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '../../lib/api';
import { Plus, Search, User, Clock, Calendar, CheckCircle, FileText, Download, Target, Briefcase } from 'lucide-react';
import PremiumDatePicker from '../../components/PremiumDatePicker';
import PremiumSelect from '../../components/PremiumSelect';
import { useAuth } from '../../context/AuthContext';

// Reuse AddUserModal
function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    fullName: '', email: '', role: 'USER', department: '', employeeId: '', hireDate: '', performanceRating: 3
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) {
      setError('Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h2 className="modal-title">Add New Employee</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="modal-form">
          <label>Full Name
            <input className="input" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="e.g. Jane Doe" required />
          </label>
          <label>Email Address
            <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane.doe@example.com" required />
          </label>
          <label>Role
            <PremiumSelect 
              value={form.role} 
              onChange={val => setForm({...form, role: val})} 
              options={[
                { value: 'USER', label: 'General Staff' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'ADMIN', label: 'Administrator' }
              ]}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label>Department
              <input className="input" value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="e.g. Engineering" />
            </label>
            <label>Employee ID
              <input className="input" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} placeholder="EMP-001" />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label>Hire Date
              <PremiumDatePicker value={form.hireDate} onChange={date => setForm({...form, hireDate: date})} />
            </label>
            <label>Performance Rating (1-5)
              <input type="number" min="1" max="5" className="input" value={form.performanceRating} onChange={e => setForm({...form, performanceRating: parseInt(e.target.value)})} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Personnel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DIRECTORY' | 'LEAVE' | 'PAYROLL'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const { user } = useAuth();

  // SWR Fetches from real backend endpoints
  const { data: users, mutate: mutateUsers } = useSWR<any[]>('/users', apiFetch);
  const { data: updates } = useSWR<any[]>('/hr/updates', apiFetch);
  const { data: quote } = useSWR<any>('/hr/quotes/random', apiFetch, { revalidateOnFocus: false });
  const { data: attendance, mutate: mutateAttendance } = useSWR<any>('/hr/attendance/status', apiFetch);
  const { data: leaveRequests, mutate: mutateLeave } = useSWR<any[]>('/hr/leave-requests', apiFetch);
  const { data: payslips } = useSWR<any[]>('/hr/payslips', apiFetch);

  const handleClockInOut = async () => {
    if (!attendance?.isClockedIn) {
      if (!confirm('Allow VaultIQ to access your location for Geo-fencing validation?')) return;
    }
    await apiFetch('/hr/attendance/toggle', { method: 'POST' });
    mutateAttendance();
  };

  const handleLeaveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get('type'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
    };
    await apiFetch('/hr/leave-requests', { method: 'POST', body: JSON.stringify(data) });
    alert('Leave request submitted successfully!');
    mutateLeave();
  };

  // Generate dynamic birthdays based on hireDate/dateOfBirth
  const birthdays = (users || [])
    .filter(u => u.hireDate || u.dateOfBirth)
    .slice(0, 5)
    .map(u => ({
      name: u.fullName,
      role: u.role,
      date: new Date(u.hireDate || u.dateOfBirth).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
      avatar: u.fullName.substring(0, 2).toUpperCase()
    }));

  const renderOverviewTab = () => (
    <div className="tab-content overview-grid animate-fade-in">
      {/* Attendance & Geo-fencing Widget */}
      <div className="hr-widget glass">
        <h3 className="widget-title"><Clock size={16} /> Time & Attendance</h3>
        <div className="attendance-status">
          <div className={`status-indicator ${attendance?.isClockedIn ? 'active' : ''}`}>
            {attendance?.isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </div>
          <p className="status-time">
            {attendance?.clockTime ? `Last punch: ${new Date(attendance.clockTime).toLocaleTimeString()}` : 'Not punched in today'}
          </p>
        </div>
        <button 
          className={`btn-clock ${attendance?.isClockedIn ? 'clock-out' : 'clock-in'}`}
          onClick={handleClockInOut}
        >
          {attendance?.isClockedIn ? 'Clock Out' : 'Clock In (Geo-Tagged)'}
        </button>
      </div>

      {/* Quote & Announcements */}
      <div className="hr-widget glass span-2">
        <h3 className="widget-title"><Target size={16} /> Company Updates</h3>
        {quote && (
          <div className="quote-box">
            <i>{quote.content}</i>
          </div>
        )}
        <div className="updates-list mt-3">
          {(updates || []).map((update: any) => (
            <div key={update.id} className="update-item">
              <div className="update-meta">
                <span className={`update-badge ${update.type}`}>{update.type}</span>
                <span className="update-date">{new Date(update.date).toLocaleDateString()}</span>
              </div>
              <h4>{update.title}</h4>
              <p>{update.content}</p>
            </div>
          ))}
          {updates?.length === 0 && <p style={{color: 'var(--text-muted)'}}>No recent updates.</p>}
        </div>
      </div>

      {/* Birthdays Widget */}
      <div className="hr-widget glass">
        <h3 className="widget-title"><User size={16} /> Upcoming Birthdays / Anniversaries</h3>
        <div className="birthdays-list">
          {birthdays.map((b, i) => (
            <div key={i} className="birthday-item">
              <div className="b-avatar">{b.avatar}</div>
              <div className="b-details">
                <strong>{b.name}</strong>
                <span>{b.date} • {b.role}</span>
              </div>
            </div>
          ))}
          {birthdays.length === 0 && <p style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>No upcoming events.</p>}
        </div>
      </div>
    </div>
  );

  const renderDirectoryTab = () => {
    const filteredUsers = (users || []).filter((u) => 
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="tab-content animate-fade-in">
        <div className="directory-toolbar">
          <div className="search-bar glass">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search personnel..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {/* RBAC: Only ADMIN or MANAGER can add employees */}
          {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>
        
        <div className="user-grid">
          {filteredUsers.map((u: any) => {
            const initials = u.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
            return (
              <div key={u.id} className="user-card glass">
                <div className="user-avatar-wrapper">
                  <div className="user-avatar">{initials}</div>
                </div>
                <div className="user-details">
                  <div className="user-name">{u.fullName}</div>
                  <div className="user-email">{u.email}</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span className={`user-role badge-${u.role.toLowerCase()}`}>{u.role}</span>
                    {u.department && <span className="hr-badge">{u.department}</span>}
                  </div>
                  <div className="user-extra">
                    {u.employeeId && <span><Briefcase size={12}/> {u.employeeId}</span>}
                    {u.performanceRating && <span>⭐ {u.performanceRating}/5</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLeaveTab = () => (
    <div className="tab-content animate-fade-in">
      <div className="leave-header">
        <div className="leave-balance glass">
          <h3>Annual Leave Balance</h3>
          <div className="balance-val">14 <span>Days Remaining</span></div>
        </div>
        <div className="leave-actions glass">
          <h3>Apply for Leave</h3>
          <form className="leave-form" onSubmit={handleLeaveSubmit}>
            <div className="split-input">
              <label>Type
                <PremiumSelect
                  name="type"
                  value="Annual Leave"
                  options={[
                    { value: 'Annual Leave', label: 'Annual Leave' },
                    { value: 'Sick Leave', label: 'Sick Leave' },
                    { value: 'Outdoor Duty', label: 'Outdoor Duty' },
                    { value: 'Overtime Request', label: 'Overtime Request' }
                  ]}
                  required
                />
              </label>
              <label>Start Date <PremiumDatePicker name="startDate" required /></label>
              <label>End Date <PremiumDatePicker name="endDate" required /></label>
            </div>
            <button type="submit" className="btn btn-primary mt-2">Submit Request</button>
          </form>
        </div>
      </div>

      <div className="hr-widget glass mt-4">
        <h3 className="widget-title"><Calendar size={16} /> My Request History</h3>
        <table className="hr-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(leaveRequests || []).map((lv: any) => (
              <tr key={lv.id}>
                <td>{lv.id.substring(0, 8)}</td>
                <td>{lv.type}</td>
                <td>{new Date(lv.startDate).toLocaleDateString()} to {new Date(lv.endDate).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${lv.status.toLowerCase()}`}>
                    {lv.status}
                  </span>
                </td>
              </tr>
            ))}
            {leaveRequests?.length === 0 && <tr><td colSpan={4}>No leave requests found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayrollTab = () => (
    <div className="tab-content animate-fade-in">
      <div className="hr-widget glass">
        <h3 className="widget-title"><FileText size={16} /> Payslips & Tax Statements</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
          View and download your monthly financial documents. All files are securely encrypted.
        </p>
        <table className="hr-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Period</th>
              <th>Net Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(payslips || []).map((ps: any) => (
              <tr key={ps.id}>
                <td><strong>Payslip</strong></td>
                <td>{ps.period}</td>
                <td>{ps.amount}</td>
                <td>
                  <span className={`status-badge ${ps.status.toLowerCase()}`}>
                    <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {ps.status}
                  </span>
                </td>
                <td>
                  <button className="btn-sm btn-outline" onClick={() => alert(`Downloading ${ps.id}...`)}>
                    <Download size={14} /> Download PDF
                  </button>
                </td>
              </tr>
            ))}
            {payslips?.length === 0 && <tr><td colSpan={5}>No payslips found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="hr-container">
      <header className="hr-header">
        <div>
          <h1 className="page-title">HR Management Portal</h1>
          <p className="page-subtitle">Manage attendance, leave, payroll, and team directories.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="hr-tabs">
        {['OVERVIEW', 'DIRECTORY', 'LEAVE', 'PAYROLL'].map(tab => (
          <button 
            key={tab} 
            className={`hr-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && renderOverviewTab()}
      {activeTab === 'DIRECTORY' && renderDirectoryTab()}
      {activeTab === 'LEAVE' && renderLeaveTab()}
      {activeTab === 'PAYROLL' && renderPayrollTab()}

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); mutateUsers(); }}
        />
      )}

      <style>{`
        .hr-container { display: flex; flex-direction: column; gap: 24px; padding: 24px; max-width: 1200px; margin: 0 auto; }
        .hr-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-title { font-size: 1.6rem; font-weight: 800; margin: 0; }
        .page-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .mt-3 { margin-top: 12px; }
        .mt-4 { margin-top: 16px; }

        /* Tabs */
        .hr-tabs { display: flex; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 1px; }
        .hr-tab { background: transparent; border: none; color: var(--text-secondary); padding: 10px 16px; font-weight: 600; font-size: 0.95rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .hr-tab:hover { color: var(--text-primary); }
        .hr-tab.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }

        /* Overview Grid */
        .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .span-2 { grid-column: span 2; }
        @media (max-width: 900px) { .span-2 { grid-column: span 1; } }

        /* Widgets */
        .hr-widget { padding: 24px; border-radius: 12px; display: flex; flex-direction: column; }
        .widget-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--accent-primary); }
        
        /* Attendance */
        .attendance-status { background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.05); }
        .status-indicator { font-size: 1.2rem; font-weight: 800; color: var(--text-secondary); }
        .status-indicator.active { color: var(--accent-success); }
        .status-time { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }
        .btn-clock { width: 100%; padding: 14px; border-radius: 8px; border: none; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.2s; }
        .btn-clock.clock-in { background: var(--accent-primary); color: white; }
        .btn-clock.clock-in:hover { opacity: 0.9; }
        .btn-clock.clock-out { background: rgba(248,81,73,0.15); color: #ff7b78; border: 1px solid rgba(248,81,73,0.3); }
        .btn-clock.clock-out:hover { background: rgba(248,81,73,0.25); }

        /* Updates & Quotes */
        .quote-box { font-size: 0.95rem; color: var(--text-secondary); border-left: 3px solid var(--accent-primary); padding-left: 12px; background: rgba(88,166,255,0.05); padding: 12px; border-radius: 4px; }
        .updates-list { display: flex; flex-direction: column; gap: 16px; }
        .update-item { padding-bottom: 12px; border-bottom: 1px solid var(--border-color); }
        .update-item:last-child { border-bottom: none; padding-bottom: 0; }
        .update-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .update-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
        .update-badge.announcement { background: rgba(210,153,34,0.15); color: #d29922; }
        .update-badge.update { background: rgba(63,185,80,0.15); color: #3fb950; }
        .update-badge.news { background: rgba(88,166,255,0.15); color: #58a6ff; }
        .update-date { font-size: 0.75rem; color: var(--text-muted); }
        .update-item h4 { font-size: 0.95rem; margin-bottom: 4px; }
        .update-item p { font-size: 0.85rem; color: var(--text-secondary); }

        /* Birthdays */
        .birthdays-list { display: flex; flex-direction: column; gap: 12px; }
        .birthday-item { display: flex; align-items: center; gap: 12px; }
        .b-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #f85149, #d29922); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; }
        .b-details { display: flex; flex-direction: column; }
        .b-details strong { font-size: 0.9rem; }
        .b-details span { font-size: 0.75rem; color: var(--text-secondary); }

        /* Directory */
        .directory-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .search-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; flex: 1; max-width: 400px; }
        .search-icon { color: var(--text-secondary); flex-shrink: 0; }
        .search-bar input { background: transparent; border: none; color: var(--text-primary); outline: none; font-size: 0.9rem; width: 100%; }
        
        .user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .user-card { padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; transition: transform 0.2s; }
        .user-card:hover { transform: translateY(-2px); border-color: rgba(88,166,255,0.3); }
        .user-avatar-wrapper { flex-shrink: 0; }
        .user-avatar { width: 50px; height: 50px; border-radius: 50%; background: rgba(88,166,255,0.15); color: var(--accent-primary); border: 2px solid rgba(88,166,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 800; }
        .user-details { display: flex; flex-direction: column; gap: 4px; overflow: hidden; width: 100%; }
        .user-name { font-size: 1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-email { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; align-self: flex-start; margin-top: 2px; }
        .badge-admin { background: rgba(63, 185, 80, 0.15); color: #3fb950; }
        .badge-manager { background: rgba(210, 153, 34, 0.15); color: #d29922; }
        .badge-user { background: rgba(88, 166, 255, 0.15); color: #58a6ff; }
        .hr-badge { font-size: 0.65rem; background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); padding: 3px 6px; border-radius: 4px; }
        .user-extra { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; border-top: 1px dashed var(--border-color); padding-top: 6px; }

        /* Leave & Payroll Tables */
        .leave-header { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
        @media (max-width: 768px) { .leave-header { grid-template-columns: 1fr; } }
        .leave-balance { padding: 24px; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
        .balance-val { font-size: 3rem; font-weight: 800; color: var(--accent-primary); line-height: 1; margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }
        .balance-val span { font-size: 0.9rem; font-weight: 500; color: var(--text-secondary); }
        .leave-actions { padding: 24px; border-radius: 12px; }
        .split-input { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px; }
        .leave-form label { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
        
        .hr-table { width: 100%; border-collapse: collapse; text-align: left; }
        .hr-table th { padding: 12px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; }
        .hr-table td { padding: 14px 12px; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        .hr-table tr:last-child td { border-bottom: none; }
        .status-badge { font-size: 0.7rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
        .status-badge.approved, .status-badge.paid { background: rgba(63,185,80,0.15); color: #3fb950; }
        .status-badge.pending { background: rgba(210,153,34,0.15); color: #d29922; }

        /* Buttons & Forms */
        .btn-sm { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; cursor: pointer; border: none; font-weight: 600; transition: all 0.2s; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; text-decoration: none; transition: opacity 0.2s, background 0.2s; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: var(--accent-primary); color: white; }
        .btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
        .btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.05); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .modal-card { padding: 32px; border-radius: 16px; width: 100%; max-width: 420px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
        .modal-title { font-size: 1.2rem; font-weight: 700; margin: 0 0 20px; }
        .modal-form { display: flex; flex-direction: column; gap: 16px; }
        .modal-form label { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
        .input { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 12px; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; width: 100%; }
        .input:focus { border-color: var(--accent-primary); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
        .error-banner { background: rgba(255,77,77,0.1); border: 1px solid rgba(255,77,77,0.3); color: #ff7b78; padding: 10px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 16px; }

      `}</style>
    </div>
  );
}
