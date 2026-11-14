export type ShieldPolicy = { mode: 'sandbox' | 'community'; allowedOrigins: string[]; allowedActions: string[]; tokenBudget: number; cacheTtlSeconds: number };
export const shieldProtocols = [
  ['HTTPS / HTTP caching', 'Policy preview', 'Exact origins, tenant cache partitioning, TTL and revalidation'],
  ['Ed25519 signed requests', 'Existing agent access', 'Read-only project access with nonce replay protection'],
  ['WebAuthn', 'Existing administrator access', 'Physical-key authentication and sensitive-action approval'],
  ['A2A / JSON-RPC', 'Planned adapter', 'Explicit task capabilities, cancellation and bounded delegation'],
  ['MCP', 'Planned adapter', 'Scoped tool and resource access through the same policy gate'],
  ['OAuth 2.0 / OIDC', 'Planned adapter', 'Short-lived audience-bound agent identities'],
  ['mTLS / SPIFFE', 'Planned adapter', 'Workload identity for private workers'],
  ['SSE / WebSocket', 'Planned adapter', 'Authenticated streaming with cancellation and backpressure'],
  ['OpenTelemetry / W3C Trace Context', 'Planned adapter', 'Redacted latency, token and decision traces'],
] as const;
export function normalizeShieldOrigin(value: string): string {
  const u = new URL(value), h = u.hostname.toLowerCase();
  // No network request is made. A real gateway must additionally check resolved
  // IPs on every connection and redirect against DNS rebinding and SSRF.
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || u.pathname !== '/' || !h.includes('.') || !/^[a-z0-9.-]+$/.test(h) || /^[\d.]+$/.test(h) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(h)) throw new Error('Use a public HTTPS origin without credentials, paths, IP addresses or wildcards');
  return u.origin;
}
export function validateShieldPolicy(input: unknown): ShieldPolicy {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Policy must be an object');
  const p = input as Record<string, unknown>;
  if (Object.keys(p).some(k => !['mode','allowedOrigins','allowedActions','tokenBudget','cacheTtlSeconds'].includes(k))) throw new Error('Unknown policy field');
  if (p.mode !== 'sandbox' && p.mode !== 'community') throw new Error('Choose sandbox or community');
  if (!Array.isArray(p.allowedOrigins) || p.allowedOrigins.length > 32 || !p.allowedOrigins.every(x => typeof x === 'string' && x.length <= 255)) throw new Error('Up to 32 exact origins are allowed');
  if (!Array.isArray(p.allowedActions) || p.allowedActions.length > 32 || !p.allowedActions.every(x => typeof x === 'string' && /^[a-z][a-z0-9.-]*:[a-z][a-z0-9.-]*$/.test(x) && x.length <= 80)) throw new Error('Use exact resource:action capabilities without wildcards');
  if (!Number.isInteger(p.tokenBudget) || Number(p.tokenBudget) < 1 || Number(p.tokenBudget) > 100000) throw new Error('Token budget must be 1–100000');
  if (!Number.isInteger(p.cacheTtlSeconds) || Number(p.cacheTtlSeconds) < 0 || Number(p.cacheTtlSeconds) > 86400) throw new Error('Cache TTL must be 0–86400 seconds');
  const allowedOrigins = [...new Set((p.allowedOrigins as string[]).map(normalizeShieldOrigin))];
  if (p.mode === 'sandbox' && allowedOrigins.length) throw new Error('Sandbox cannot permit internet origins');
  return { mode: p.mode, allowedOrigins, allowedActions: [...new Set(p.allowedActions as string[])], tokenBudget: Number(p.tokenBudget), cacheTtlSeconds: Number(p.cacheTtlSeconds) };
}
export function previewShieldDecision(policy: ShieldPolicy, r: { action: string; origin: string; tokens: number; verifiedPeer: boolean }) {
  const p = validateShieldPolicy(policy), reasons: string[] = [];
  if (!p.allowedActions.includes(r.action)) reasons.push('Action was not explicitly permitted');
  if (!Number.isInteger(r.tokens) || r.tokens < 0 || r.tokens > p.tokenBudget) reasons.push('Token budget exceeded or invalid');
  if (r.origin) {
    if (p.mode === 'sandbox') reasons.push('Sandbox internet access is denied');
    else { try { if (!p.allowedOrigins.includes(normalizeShieldOrigin(r.origin))) reasons.push('Origin is not allowlisted'); } catch { reasons.push('Invalid public HTTPS origin'); } }
  }
  if (p.mode === 'community' && r.verifiedPeer !== true) reasons.push('Community peer identity must be verified');
  return { allowed: reasons.length === 0, reasons, previewOnly: true, cache: 'Public immutable assets only; never credentials, private responses or agent actions' };
}
