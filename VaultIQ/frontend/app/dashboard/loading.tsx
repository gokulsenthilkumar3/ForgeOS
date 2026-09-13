"use client";
export default function Loading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton-header">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
      </div>
      <div className="skeleton-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <style>{`
        .skeleton-page { display:flex; flex-direction:column; gap:32px; }
        .skeleton-header { display:flex; flex-direction:column; gap:12px; }
        .skeleton-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:24px; }
        .skeleton { background:linear-gradient(90deg,var(--bg-secondary) 25%,var(--bg-tertiary) 50%,var(--bg-secondary) 75%); background-size:200% 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:12px; }
        .skeleton-heading { height:2rem; width:50%; }
        .skeleton-text { height:1rem; }
        .skeleton-card { height:140px; }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>
    </div>
  );
}
