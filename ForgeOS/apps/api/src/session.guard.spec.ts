import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { SessionGuard } from './session.guard';

describe('SessionGuard', () => {
  const previous = process.env.FORGEOS_SESSION_SECRET;
  const secret = 'forgeos-test-session-secret-longer-than-32-chars';
  const guard = new SessionGuard();
  const context = (path: string, cookie?: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ path, headers: { cookie } }) }),
  }) as unknown as ExecutionContext;

  beforeEach(() => { process.env.FORGEOS_SESSION_SECRET = secret; });
  afterAll(() => {
    if (previous === undefined) delete process.env.FORGEOS_SESSION_SECRET;
    else process.env.FORGEOS_SESSION_SECRET = previous;
  });

  it('leaves only the internal health check public', () => {
    expect(guard.canActivate(context('/v1/health'))).toBe(true);
    expect(() => guard.canActivate(context('/v1/workspaces'))).toThrow(UnauthorizedException);
  });

  it('accepts the signed web session and rejects a changed signature', () => {
    const expires = String(Date.now() + 60_000);
    const signature = createHmac('sha256', secret).update(expires).digest('hex');
    expect(guard.canActivate(context('/v1/projects', `forgeos_session=${expires}.${signature}`))).toBe(true);
    expect(() => guard.canActivate(context('/v1/projects', `forgeos_session=${expires}.${'0'.repeat(64)}`))).toThrow(UnauthorizedException);
  });

  it('rejects expired sessions', () => {
    const expires = String(Date.now() - 1000);
    const signature = createHmac('sha256', secret).update(expires).digest('hex');
    expect(() => guard.canActivate(context('/v1/projects', `forgeos_session=${expires}.${signature}`))).toThrow(UnauthorizedException);
  });
});
