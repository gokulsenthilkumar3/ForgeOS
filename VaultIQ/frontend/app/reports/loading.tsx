"use client";
export default function ReportsLoading() {
  return (
    <div className="reports-container">
      <header className="reports-header">
        <h1 className="page-title skeleton-text">Audit & Compliance Reports</h1>
        <p className="page-subtitle skeleton-text">Generating blockchain-anchored compliance reports.</p>
      </header>

      <div className="reports-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card glass report-card skeleton-box"></div>
        ))}
      </div>
      <style jsx>{`
        .report-card {
          height: 240px;
        }
      `}</style>
    </div>
  );
}
