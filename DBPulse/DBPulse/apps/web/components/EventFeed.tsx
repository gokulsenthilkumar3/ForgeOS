'use client';

import clsx from 'clsx';
import type { AuditEvent } from '@dbpulse/shared';

const OP_COLOR: Record<string, string> = {
  INSERT: 'text-emerald-400',
  UPDATE: 'text-amber-400',
  DELETE: 'text-rose-400',
  TRUNCATE: 'text-purple-400',
};

interface Props {
  events: AuditEvent[];
  onSelect: (event: AuditEvent) => void;
  selectedId?: string;
}

export function EventFeed({ events, onSelect, selectedId }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
        Waiting for events…
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-surface-border">
      {events.map((event) => (
        <li
          key={event.id}
          onClick={() => onSelect(event)}
          className={clsx(
            'px-4 py-3 cursor-pointer hover:bg-surface-card transition-colors grid grid-cols-[auto_1fr_auto] gap-x-3 items-start',
            selectedId === event.id && 'bg-surface-card border-l-2 border-brand',
          )}
        >
          {/* Operation badge */}
          <span className={clsx('font-bold w-16 shrink-0', OP_COLOR[event.operation] ?? 'text-slate-300')}>
            {event.operation}
          </span>

          {/* Table + actor */}
          <div className="min-w-0">
            <p className="truncate text-slate-100">
              {event.schemaName ? `${event.schemaName}.` : ''}{event.tableName}
            </p>
            <p className="text-slate-500 text-xs truncate">by {event.actor}</p>
          </div>

          {/* Timestamp */}
          <span className="text-slate-600 text-xs whitespace-nowrap">
            {new Date(event.createdAt).toLocaleTimeString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
