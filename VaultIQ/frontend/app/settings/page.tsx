"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import RoleGuard from "@/components/RoleGuard";

export default function SettingsPage() {
  return (
    <RoleGuard roles={['ADMIN', 'USER']}>
      <Shell>
        <div className="page-header">
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your account preferences and billing</p>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Preferences</h3>
          <div className="input-group">
            <label className="input-label">Auto-lock Vault (Minutes)</label>
            <input type="number" className="input" defaultValue={15} />
          </div>
          <div className="input-group" style={{ marginTop: "1rem" }}>
            <label className="input-label">Theme</label>
            <select className="input">
              <option value="dark">Dark Theme (Default)</option>
              <option value="light">Light Theme</option>
              <option value="system">System Preference</option>
            </select>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <button className="btn btn-primary">Save Changes</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: "2rem", borderColor: "var(--danger)" }}>
          <h3 style={{ color: "var(--danger)", marginBottom: "1rem" }}>Danger Zone</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Deleting your account is permanent. All encrypted data will be irretrievably destroyed.
          </p>
          <button className="btn btn-danger">Delete Account</button>
        </div>
      </Shell>
    </RoleGuard>
  );
}
