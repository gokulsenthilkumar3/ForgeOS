'use client';

import React from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-page">
      <div className="error-content">
        <p className="icon">⚠️</p>
        <h2>Something went wrong</h2>
        <p className="message">{error.message || 'An unexpected error occurred.'}</p>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
      <style jsx>{`
        .error-page { display:flex; align-items:center; justify-content:center; min-height:60vh; }
        .error-content { text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px; }
        .icon { font-size:3rem; }
        h2 { font-size:1.4rem; font-weight:700; }
        .message { color:var(--text-secondary); max-width:40ch; }
      `}</style>
    </div>
  );
}
