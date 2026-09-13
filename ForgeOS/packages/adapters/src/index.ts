export type Provider = 'github' | 'openai' | 'anthropic' | 'huggingface' | 'slack' | 'email' | 'webhook' | 'postgres' | 'mysql' | 's3';
export interface AdapterContext { workspaceId: string; secret: string; baseUrl?: string }
export interface ProviderAdapter { provider: Provider; verify(context: AdapterContext): Promise<{ account: string }>; }
export class AdapterRegistry { private adapters = new Map<Provider, ProviderAdapter>(); register(adapter: ProviderAdapter) { this.adapters.set(adapter.provider, adapter); } get(provider: Provider) { const adapter = this.adapters.get(provider); if (!adapter) throw new Error(`Adapter ${provider} is not configured`); return adapter; } }
export const webhookEventTypes = ['run.completed', 'alert.created', 'baseline.approved', 'incident.updated', 'audit.exported'] as const;
