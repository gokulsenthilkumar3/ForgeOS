'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ConnectionTree } from '@/components/ConnectionTree';
import { EventFeed } from '@/components/EventFeed';
import { DiffViewer } from '@/components/DiffViewer';
import { StatsPanel } from '@/components/StatsPanel';
import { AlertRulesPanel } from '@/components/AlertRulesPanel';
import { useAuditStream } from '@/hooks/useAuditStream';
import type { AuditEvent } from '@dbpulse/shared';

type Tab = 'events' | 'stats' | 'alerts';

const TAB_ICONS: Record<Tab, string> = {
  events: '⚡',
  stats: '📊',
  alerts: '🔔',
};

const TAB_LABELS: Record<Tab, string> = {
  events: 'Live Events',
  stats: 'Statistics',
  alerts: 'Alert Rules',
};

export default function HomePage() {
  const { isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('events');
  const { events, connected, clearEvents } = useAuditStream(activeConnectionId);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-surface text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-surface-border flex flex-col bg-surface">
        {/* Brand header */}
        <div className="px-4 py-4 border-b border-surface-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center text-sm">
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-slate-100 font-semibold text-sm tracking-tight block">DBPulse</span>
            <span className="text-slate-500 text-xs">Activity Intelligence</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
              connected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
            }`}
            title={connected ? 'Stream live' : 'Stream disconnected'}
          />
        </div>

        {/* Connection tree */}
        <div className="flex-1 overflow-y-auto">
          <ConnectionTree
            onSelectConnection={(id) => {
              setActiveConnectionId(id);
              setSelectedEvent(null);
              clearEvents();
              setTab('events');
            }}
            activeId={activeConnectionId}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border space-y-1">
          <div className="text-xs text-slate-600 mb-2 font-medium uppercase tracking-widest">Account</div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-400/5 transition-all px-2 py-1.5 rounded-md group"
          >
            <span className="text-base leading-none group-hover:scale-110 transition-transform">⎋</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-surface-border px-4 bg-surface shrink-0">
          <div className="flex items-center gap-1">
            {(['events', 'stats', 'alerts'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3.5 py-3.5 text-xs font-medium transition-all border-b-2 ${
                  tab === t
                    ? 'border-brand text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-sm">{TAB_ICONS[t]}</span>
                {TAB_LABELS[t]}
                {t === 'events' && events.length > 0 && (
                  <span className="ml-0.5 bg-brand/20 text-brand text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                    {events.length > 99 ? '99+' : events.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab toolbar */}
          <div className="ml-auto flex items-center gap-2">
            {tab === 'events' && (
              <>
                {!activeConnectionId && (
                  <span className="text-xs text-slate-600 italic">← Select a connection to start streaming</span>
                )}
                {activeConnectionId && events.length > 0 && (
                  <button
                    onClick={clearEvents}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded hover:bg-surface-card"
                  >
                    Clear feed
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* No connection placeholder */}
        {!activeConnectionId && tab === 'events' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center text-3xl">
              🔌
            </div>
            <div>
              <p className="text-slate-300 font-medium text-sm">No connection selected</p>
              <p className="text-slate-600 text-xs mt-1">Pick a database connection from the sidebar to begin streaming live events.</p>
            </div>
          </div>
        )}

        {/* Events tab */}
        {tab === 'events' && activeConnectionId && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Event feed */}
            <div className="flex-1 border-r border-surface-border flex flex-col min-w-0 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Live Feed</span>
                {connected && (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Streaming
                  </span>
                )}
              </div>
              <EventFeed events={events} onSelect={setSelectedEvent} selectedId={selectedEvent?.id} />
            </div>

            {/* Diff viewer panel */}
            <aside className="w-96 shrink-0 flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-surface-border flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Event Detail</span>
                {selectedEvent && (
                  <span className="ml-auto text-xs text-slate-600 font-mono truncate max-w-[120px]" title={selectedEvent.id}>
                    #{selectedEvent.id?.slice(-6)}
                  </span>
                )}
              </div>
              {!selectedEvent ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
                  <div className="text-3xl opacity-30">↔</div>
                  <p className="text-slate-600 text-xs">Click any event in the feed to inspect the before/after diff.</p>
                </div>
              ) : (
                <DiffViewer event={selectedEvent} />
              )}
            </aside>
          </div>
        )}

        {/* Stats tab */}
        {tab === 'stats' && (
          <div className="flex-1 overflow-y-auto">
            {!activeConnectionId ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                <div className="text-3xl opacity-30">📊</div>
                <p className="text-slate-500 text-sm">Select a connection to view statistics.</p>
              </div>
            ) : (
              <StatsPanel connectionId={activeConnectionId} />
            )}
          </div>
        )}

        {/* Alerts tab */}
        {tab === 'alerts' && (
          <div className="flex-1 overflow-y-auto">
            {!activeConnectionId ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                <div className="text-3xl opacity-30">🔔</div>
                <p className="text-slate-500 text-sm">Select a connection to manage alert rules.</p>
              </div>
            ) : (
              <AlertRulesPanel connectionId={activeConnectionId} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
