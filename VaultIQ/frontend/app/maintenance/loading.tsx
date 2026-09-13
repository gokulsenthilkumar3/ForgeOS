"use client";
export default function Loading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading maintenance queue">
      <div className="skeleton skeleton-heading" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
      <style>{`
        .skeleton-page { display:flex; flex-direction:column; gap:20px; }
        .skeleton { background:linear-gradient(90deg,var(--bg-secondary) 25%,var(--bg-tertiary) 50%,var(--bg-secondary) 75%); background-size:200% 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:8px; }
        .skeleton-heading { height:2rem; width:35%; }
        .skeleton-row { height:80px; }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>
    </div>
  );
}
