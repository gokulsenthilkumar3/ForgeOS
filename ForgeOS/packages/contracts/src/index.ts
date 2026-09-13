export type Role = 'owner' | 'admin' | 'member' | 'auditor' | 'service_account';
export type ModuleId =
  | 'commitcraft' | 'stackforge' | 'snapdiff' | 'comparer' | 'regexforge' | 'loadlab'
  | 'promptvault' | 'probeai' | 'pulsewatch' | 'dbpulse' | 'glbviewer' | 'craftcv' | 'vaultiq';

export interface Workspace { id: string; name: string; slug: string; plan: 'cloud' | 'self-hosted'; createdAt: string }
export interface Project { id: string; workspaceId: string; name: string; moduleIds: ModuleId[]; createdAt: string }
export interface Secret { id: string; workspaceId: string; name: string; provider?: string; createdAt: string }
export interface Artifact { id: string; projectId: string; name: string; mediaType: string; signedUrl?: string; expiresAt?: string }
export interface Integration { id: string; workspaceId: string; provider: string; status: 'connected' | 'pending' | 'error'; scopes: string[] }
export interface Run { id: string; projectId: string; moduleId: ModuleId; status: 'queued' | 'running' | 'passed' | 'failed'; startedAt?: string; finishedAt?: string }
export interface Alert { id: string; workspaceId: string; severity: 'info' | 'warning' | 'critical'; title: string; acknowledged: boolean }
export interface Incident { id: string; projectId: string; status: 'open' | 'resolved'; title: string; startedAt: string; resolvedAt?: string }
export interface AuditEvent { id: string; workspaceId: string; actorId: string; action: string; target: string; createdAt: string; hash: string }
export interface Notification { id: string; workspaceId: string; channel: 'in-app' | 'email' | 'slack' | 'webhook'; title: string; readAt?: string }
export interface ApiEnvelope<T> { data: T; requestId: string }
export interface WebhookEvent<T = unknown> { id: string; type: 'run.completed' | 'alert.created' | 'baseline.approved' | 'incident.updated' | 'audit.exported'; createdAt: string; data: T }

export const modules: Array<{ id: ModuleId; name: string; category: string; description: string }> = [
  { id: 'commitcraft', name: 'CommitCraft', category: 'Delivery', description: 'AI commit and PR drafting' },
  { id: 'stackforge', name: 'StackForge', category: 'Delivery', description: 'Production project scaffolding' },
  { id: 'snapdiff', name: 'SnapDiff', category: 'Delivery', description: 'Visual regression and baselines' },
  { id: 'comparer', name: 'Comparer', category: 'Quality', description: 'Structured and file comparison' },
  { id: 'regexforge', name: 'RegexForge', category: 'Quality', description: 'Regex testing and explanation' },
  { id: 'loadlab', name: 'Load Lab', category: 'Quality', description: 'K6 performance test runs' },
  { id: 'promptvault', name: 'PromptVault', category: 'AI', description: 'Prompt versioning and experiments' },
  { id: 'probeai', name: 'ProbeAI', category: 'AI', description: 'LLM evaluation and regression' },
  { id: 'pulsewatch', name: 'PulseWatch', category: 'Operations', description: 'Uptime monitoring and incidents' },
  { id: 'dbpulse', name: 'DBPulse', category: 'Operations', description: 'Database activity intelligence' },
  { id: 'glbviewer', name: 'GLBViewer', category: 'Assets', description: '3D asset viewing and sharing' },
  { id: 'craftcv', name: 'CraftCV', category: 'Assets', description: 'Private CV authoring and export' },
  { id: 'vaultiq', name: 'VaultIQ', category: 'Assets', description: 'Zero-knowledge credential vault' }
];
