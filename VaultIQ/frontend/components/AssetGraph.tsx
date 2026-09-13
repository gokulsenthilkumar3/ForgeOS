'use client';

import React from 'react';
import useSWR from 'swr';
import { apiFetch } from '../lib/api';

/**
 * Visualizes the relationship between assets and employees in a 'Git-style' branch view.
 * Shows which employees are currently anchored to which hardware.
 */
export default function AssetGraph() {
  const { data: users, isLoading } = useSWR<any[]>('/users', apiFetch);
  const { data: assets } = useSWR<any[]>('/assets', apiFetch);

  if (isLoading) return <div className="loading">Mapping Digital Relationships...</div>;

  return (
    <div className="graph-container card glass">
      <h3 className="section-title">Custody Network Graph</h3>
      <div className="graph-scroll">
        <div className="git-tree">
          {users?.map((user: any, uIdx: number) => {
            const userAssets = assets?.filter((a: any) => a.assignments?.some((as: any) => as.userId === user.id && !as.returnedAt));
            
            return (
              <div key={user.id} className="tree-row">
                <div className="branch-line">
                  <div className="main-stem"></div>
                  <div className="node-dot"></div>
                </div>
                <div className="node-content">
                  <div className="user-node">
                    <span className="node-icon">👤</span>
                    <span className="node-label">{user.fullName}</span>
                    <span className="node-meta">{user.role}</span>
                  </div>
                  
                  <div className="asset-branches">
                    {userAssets?.map((asset: any, aIdx: number) => (
                      <div key={asset.id} className="asset-node">
                        <div className="connector-line"></div>
                        <div className="asset-leaf">
                          <span className="leaf-tag">#{asset.tagId}</span>
                          <span className="leaf-name">{asset.modelName}</span>
                        </div>
                      </div>
                    ))}
                    {(!userAssets || userAssets.length === 0) && (
                      <div className="asset-node empty">
                         <div className="connector-line"></div>
                         <span className="empty-text">No active deployments</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .graph-container {
          padding: 32px;
          min-height: 400px;
        }

        .graph-scroll {
          margin-top: 24px;
          overflow-x: auto;
        }

        .git-tree {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .tree-row {
          display: flex;
          gap: 20px;
        }

        .branch-line {
          position: relative;
          width: 20px;
        }

        .main-stem {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--border-color);
          transform: translateX(-50%);
        }

        .node-dot {
          position: absolute;
          left: 50%;
          top: 15px;
          width: 10px;
          height: 10px;
          background: var(--accent-primary);
          border-radius: 50%;
          transform: translateX(-50%);
          box-shadow: 0 0 10px var(--accent-primary);
          z-index: 2;
        }

        .node-content {
          padding-bottom: 32px;
          flex: 1;
        }

        .user-node {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          width: fit-content;
          margin-bottom: 12px;
        }

        .node-label { font-weight: 700; font-size: 0.9rem; }
        .node-meta { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; }

        .asset-branches {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-left: 20px;
        }

        .asset-node {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .connector-line {
          width: 20px;
          height: 2px;
          background: var(--border-color);
        }

        .asset-leaf {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .leaf-tag {
          font-family: var(--font-mono);
          background: rgba(88, 166, 255, 0.1);
          color: var(--accent-primary);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .empty-text {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
