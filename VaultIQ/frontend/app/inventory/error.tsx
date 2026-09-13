'use client';

import { useEffect } from 'react';

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-container glass">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h2>Registry Desync Detected</h2>
        <p>VaultIQ lost connection to the primary asset database. This may be due to a temporary network partition.</p>
        <button className="btn btn-primary" onClick={() => reset()}>
          Re-establish Connection
        </button>
      </div>

      <style jsx>{`
        .error-container {
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 16px;
          border: 1px solid rgba(255, 77, 77, 0.2);
          background: rgba(255, 77, 77, 0.05);
          margin-top: 40px;
        }

        .error-content {
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 8px;
        }

        h2 {
          color: var(--accent-danger);
          font-weight: 800;
        }

        p {
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .btn {
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}
