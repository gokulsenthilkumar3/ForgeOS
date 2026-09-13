'use client';

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>Synchronizing with VaultIQ Core...</p>
      
      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          gap: 20px;
        }
        
        .loader {
          width: 48px;
          height: 48px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        p {
          color: var(--text-secondary);
          font-weight: 500;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}
