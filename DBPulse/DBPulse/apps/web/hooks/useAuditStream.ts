'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import type { AuditEvent } from '@dbpulse/shared';

const MAX_EVENTS = 200;

export function useAuditStream(connectionId: string | null) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const prevConnId = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onEvent = (event: AuditEvent) => {
      if (connectionId && event.connectionId !== connectionId) return;
      setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('audit_event', onEvent);
    if (socket.connected) setConnected(true);

    // Leave previous room, join new
    if (prevConnId.current && prevConnId.current !== connectionId) {
      socket.emit('unsubscribe', prevConnId.current);
    }
    if (connectionId) {
      socket.emit('subscribe', connectionId);
      prevConnId.current = connectionId;
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('audit_event', onEvent);
    };
  }, [connectionId]);

  const clearEvents = () => setEvents([]);
  return { events, connected, clearEvents };
}
