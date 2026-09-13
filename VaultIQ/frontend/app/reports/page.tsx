'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '../../lib/api';
import { Download, BarChart2, Shield, Wrench, TrendingDown } from 'lucide-react';

function exportJSON(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCSV(filename: string, data: any[]) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return val;
    }).join(',')
  );
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReportsPage() {
  const { data: assetsData } = useSWR('/assets?limit=1000', url => apiFetch(url));
  const { data: tickets } = useSWR('/maintenance', url => apiFetch(url));
  const { data: summary } = useSWR('/assets/summary', url => apiFetch(url));
  
  const [exported, setExported] = useState<string | null>(null);

  const assets = assetsData?.data || [];
  const validTickets = tickets || [];
  const validSummary = summary || { stats: { utilization: 0, assigned: 0 }, assetsByType: [] };

  const generateReport = (type: string, format: 'json' | 'csv' = 'json') => {
    let data: any;
    let csvData: any[] = [];
    let filename: string;

    if (type === 'AUDIT') {
      csvData = assets.map((a: any) => ({
        tagId: a.tagId,
        modelName: a.modelName,
        type: a.type.name,
        status: a.status,
        location: a.location.name,
        assignedTo: a.assignedTo || '',
        purchaseDate: a.purchaseDate,
        purchasePrice: a.purchasePrice,
      }));
      data = {
        generatedAt: new Date().toISOString(),
        totalAssets: assets.length,
        assets: csvData,
      };
      filename = format === 'csv' ? 'audit-report.csv' : 'audit-report.json';
    } else if (type === 'FINANCE') {
      const totalValue = assets.reduce((s: number, a: any) => s + a.purchasePrice, 0);
      data = {
        generatedAt: new Date().toISOString(),
        totalAssetValue: totalValue,
        monthlyDepreciation: Math.round(totalValue * 0.02),
        utilizationRate: validSummary.stats.utilization,
        breakdown: validSummary.assetsByType,
      };
      csvData = validSummary.assetsByType;
      filename = format === 'csv' ? 'finance-report.csv' : 'finance-report.json';
    } else if (type === 'MAINTENANCE') {
      data = {
        generatedAt: new Date().toISOString(),
        totalTickets: validTickets.length,
        open: validTickets.filter((t: any) => t.status === 'OPEN').length,
        inProgress: validTickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
        resolved: validTickets.filter((t: any) => t.status === 'COMPLETED').length,
        tickets: validTickets,
      };
      csvData = validTickets;
      filename = format === 'csv' ? 'maintenance-report.csv' : 'maintenance-report.json';
    } else {
      data = { ...validSummary, generatedAt: new Date().toISOString() };
      csvData = [validSummary.stats];
      filename = format === 'csv' ? 'operations-report.csv' : 'operations-report.json';
    }

    if (format === 'csv') {
      exportCSV(filename, csvData);
    } else {
      exportJSON(filename, data);
    }
    
    setExported(filename);
    setTimeout(() => setExported(null), 3000);
  };

  const totalValue = assets.reduce((s: number, a: any) => s + a.purchasePrice, 0);
  const openTickets = validTickets.filter((t: any) => t.status === 'OPEN').length;
  const resolvedTickets = validTickets.filter((t: any) => t.status === 'COMPLETED').length;

  const reportCards = [
    {
      type: 'AUDIT',
      icon: <Shield size={22} />,
      title: 'Compliance Audit Trail',
      description: 'Full asset registry with location, assignment, and status for all assets.',
      stat: `${assets.length} assets`,
      color: '#58a6ff',
    },
    {
      type: 'FINANCE',
      icon: <TrendingDown size={22} />,
      title: 'Asset Depreciation Schedule',
      description: `Total asset value ₹${totalValue.toLocaleString()} with ${validSummary.stats.utilization}% utilization rate.`,
      stat: `₹${Math.round(totalValue * 0.02).toLocaleString()}/mo`,
      color: '#d29922',
    },
    {
      type: 'MAINTENANCE',
      icon: <Wrench size={22} />,
      title: 'Maintenance Efficiency',
      description: `${openTickets} open tickets, ${resolvedTickets} resolved. Tracks repair SLA performance.`,
      stat: `${validTickets.length} tickets`,
      color: '#ff7b78',
    },
    {
      type: 'OPERATIONS',
      icon: <BarChart2 size={22} />,
      title: 'Operations Summary',
      description: 'Complete operational dashboard snapshot including activity log and type breakdown.',
      stat: `${validSummary.stats.assigned} assigned`,
      color: '#3fb950',
    },
  ];

  if (!assetsData || !tickets || !summary) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="reports-container">
      <header className="reports-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Export intelligence reports as JSON for stakeholder review.</p>
      </header>

      {exported && (
        <div className="export-toast">
          <Download size={14} /> Downloaded: <strong>{exported}</strong>
        </div>
      )}

      <div className="reports-grid">
        {reportCards.map(card => (
          <div key={card.type} className="report-card glass">
            <div className="report-icon" style={{ color: card.color }}>{card.icon}</div>
            <div className="report-content">
              <h3 className="report-title">{card.title}</h3>
              <p className="report-desc">{card.description}</p>
              <div className="report-footer">
                <span className="report-stat" style={{ color: card.color }}>{card.stat}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-export"
                    style={{ borderColor: card.color, color: card.color }}
                    onClick={() => generateReport(card.type, 'json')}
                  >
                    <Download size={13} /> JSON
                  </button>
                  <button
                    className="btn btn-export"
                    style={{ borderColor: card.color, color: card.color }}
                    onClick={() => generateReport(card.type, 'csv')}
                  >
                    <Download size={13} /> CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .reports-container { display: flex; flex-direction: column; gap: 24px; padding: 24px; }
        .reports-header { margin-bottom: 4px; }
        .page-title { font-size: 1.6rem; font-weight: 800; margin: 0; }
        .page-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
        .export-toast { display: flex; align-items: center; gap: 8px; background: rgba(63,185,80,0.12); border: 1px solid rgba(63,185,80,0.3); color: #3fb950; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; }
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .report-card { padding: 24px; border-radius: 12px; display: flex; gap: 16px; align-items: flex-start; }
        .report-icon { flex-shrink: 0; margin-top: 2px; }
        .report-content { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .report-title { font-size: 1rem; font-weight: 700; margin: 0; }
        .report-desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
        .report-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .report-stat { font-size: 0.9rem; font-weight: 700; }
        .btn-export { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 7px; background: transparent; border: 1px solid; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .btn-export:hover { opacity: 0.75; }
      `}</style>
    </div>
  );
}
