import { previewShieldDecision, validateShieldPolicy } from '@forgeos/contracts';
const sandbox = { mode: 'sandbox', allowedOrigins: [], allowedActions: ['projects:read'], tokenBudget: 2000, cacheTtlSeconds: 300 } as const;
const policy = () => validateShieldPolicy(sandbox);
describe('AgentShield policy boundary', () => {
  it('denies unrequested actions and sandbox internet access', () => {
    expect(previewShieldDecision(policy(), { action: 'projects:delete', origin: 'https://example.com', tokens: 10, verifiedPeer: true }).reasons).toHaveLength(2);
    expect(previewShieldDecision(policy(), { action: 'projects:read', origin: '', tokens: 10, verifiedPeer: false }).allowed).toBe(true);
  });
  it('requires a verified community peer and an exact allowed origin', () => {
    const p = validateShieldPolicy({ ...sandbox, mode: 'community', allowedOrigins: ['https://example.com'] });
    expect(previewShieldDecision(p, { action: 'projects:read', origin: 'https://example.com', tokens: 10, verifiedPeer: false }).allowed).toBe(false);
    expect(previewShieldDecision(p, { action: 'projects:read', origin: 'https://evil.example.com', tokens: 10, verifiedPeer: true }).allowed).toBe(false);
    expect(previewShieldDecision(p, { action: 'projects:read', origin: 'https://example.com', tokens: 10, verifiedPeer: true }).allowed).toBe(true);
  });
  it.each(['http://example.com', 'https://127.0.0.1', 'https://[::1]', 'https://metadata.internal', 'https://user:pass@example.com', 'https://example.com/path', 'https://*.example.com'])('rejects unsafe origin %s', origin => {
    expect(() => validateShieldPolicy({ ...sandbox, mode: 'community', allowedOrigins: [origin] })).toThrow();
  });
  it('rejects sandbox allowlists, wildcard capabilities and unknown settings', () => {
    expect(() => validateShieldPolicy({ ...sandbox, allowedOrigins: ['https://example.com'] })).toThrow();
    expect(() => validateShieldPolicy({ ...sandbox, allowedActions: ['projects:*'] })).toThrow();
    expect(() => validateShieldPolicy({ ...sandbox, internet: true })).toThrow();
  });
  it.each([2001, -1, NaN, 1.5])('denies invalid token spend %s', tokens => {
    expect(previewShieldDecision(policy(), { action: 'projects:read', origin: '', tokens, verifiedPeer: true }).allowed).toBe(false);
  });
});
