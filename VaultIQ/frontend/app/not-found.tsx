'use client';

import React from 'react';

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-content">
        <p className="code">404</p>
        <h1>Page not found</h1>
        <p className="message">The page you’re looking for doesn’t exist or has been moved.</p>
        <a href="/dashboard" className="btn btn-primary">Back to Dashboard</a>
      </div>
      <style jsx>{`
        .not-found {
          display: flex; align-items: center; justify-content: center;
          min-height: 60vh;
        }
        .not-found-content {
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .code {
          font-size: 6rem; font-weight: 900;
          color: var(--text-muted); line-height: 1;
        }
        h1 { font-size: 1.5rem; font-weight: 700; }
        .message { color: var(--text-secondary); max-width: 36ch; }
      `}</style>
    </div>
  );
}
