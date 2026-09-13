'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Connection {
  id: string;
  name: string;
  engine: 'postgres' | 'mysql';
  host: string;
  database_name: string;
  status: 'connected' | 'disconnected';
}

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    api.listConnections()
      .then(setConnections)
      .finally(() => setLoading(false));
  };

  const toggle = async (id: string, currentStatus: string) => {
    if (currentStatus === 'connected') {
      await api.disconnectDb(id);
    } else {
      await api.connectDb(id);
    }
    await refresh();
  };

  useEffect(() => { refresh(); }, []);
  return { connections, loading, refresh, toggle };
}
