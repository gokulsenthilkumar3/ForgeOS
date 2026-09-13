export interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  interval: number;
  timeout: number;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  latency: number | null;
  uptime24h: number;
  uptime90d: number;
  lastChecked: string | null;
}

export interface Incident {
  id: string;
  endpointId: string;
  endpointName: string;
  error: string;
  startedAt: string;
  resolvedAt: string | null;
  duration: number | null;
}

export interface Notification {
  id: string;
  type: 'UP' | 'DOWN';
  message: string;
  ts: string;
  read: boolean;
}

export interface Stats {
  total: number;
  up: number;
  down: number;
  uptime24h: number;
  checks24h: number;
  openIncidents: number;
}
