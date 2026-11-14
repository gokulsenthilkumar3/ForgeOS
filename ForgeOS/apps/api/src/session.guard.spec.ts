import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { SessionGuard } from './session.guard';
import { PlatformService } from './platform.service';

describe('SessionGuard', () => {
  const previous = process.env.FORGEOS_SESSION_SECRET;
  const previousMode = process.env.FORGEOS_AUTH_MODE;
  const secret = 'forgeos-test-session-secret-longer-than-32-chars';
  const userId = '11111111-1111-4111-8111-111111111111';
  const platform = { actorForUser: jest.fn(async () => ({ kind: 'user', userId, email: 'owner@example.test' })) };
  const guard = new SessionGuard(platform as unknown as PlatformService);
  const context = (path: string, cookie?: string, method = 'GET') => ({
    switchToHttp: () => ({ getRequest: () => ({ path, method, headers: { cookie } }) }),
  }) as unknown as ExecutionContext;
  const keyCookie = (expires: string, authAt: string, signature?: string) =>
    `forgeos_session=w.${userId}.${authAt}.${expires}.${signature || createHmac('sha256', secret).update(`webauthn:${userId}:${authAt}:${expires}`).digest('hex')}`;
  const passwordCookie = (expires: string) =>
    `forgeos_session=u.${userId}.${expires}.${createHmac('sha256', secret).update(`user:${userId}:${expires}`).digest('hex')}`;

  beforeEach(() => { process.env.FORGEOS_SESSION_SECRET = secret; delete process.env.FORGEOS_AUTH_MODE; platform.actorForUser.mockClear(); });
  afterAll(() => {
    if (previousMode === undefined) delete process.env.FORGEOS_AUTH_MODE;
    else process.env.FORGEOS_AUTH_MODE = previousMode;
    if (previous === undefined) delete process.env.FORGEOS_SESSION_SECRET;
    else process.env.FORGEOS_SESSION_SECRET = previous;
  });

  it('leaves only explicit bootstrap and authentication endpoints public', async () => {
    expect(await guard.canActivate(context('/v1/health'))).toBe(true);
    expect(await guard.canActivate(context('/v1/auth/setup'))).toBe(true);
    expect(await guard.canActivate(context('/v1/auth/webauthn/authenticate/options', undefined, 'POST'))).toBe(true);
    await expect(guard.canActivate(context('/v1/workspaces'))).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a fresh signed physical-key session and rejects a changed signature', async () => {
    const authAt = String(Date.now());
    const expires = String(Date.now() + 60_000);
    expect(await guard.canActivate(context('/v1/projects', keyCookie(expires, authAt)))).toBe(true);
    await expect(guard.canActivate(context('/v1/projects', keyCookie(expires, authAt, '0'.repeat(64))))).rejects.toThrow(UnauthorizedException);
  });

  it('limits password sessions to key enrollment', async () => {
    const cookie = passwordCookie(String(Date.now() + 60_000));
    expect(await guard.canActivate(context('/v1/auth/webauthn/register/options', cookie, 'POST'))).toBe(true);
    await expect(guard.canActivate(context('/v1/projects', cookie))).rejects.toThrow('Physical-key sign-in required');
  });


  it('accepts password login only when explicitly enabled and does not upgrade enrollment sessions', async () => {
    const expires = String(Date.now() + 60000);
    const signature = createHmac('sha256', secret).update(`password:${userId}:${expires}`).digest('hex');
    const cookie = `forgeos_session=p.${userId}.${expires}.${signature}`;
    await expect(guard.canActivate(context('/v1/projects', cookie))).rejects.toThrow(UnauthorizedException);
    process.env.FORGEOS_AUTH_MODE = 'password';
    expect(await guard.canActivate(context('/v1/projects', cookie))).toBe(true);
    await expect(guard.canActivate(context('/v1/projects', passwordCookie(expires)))).rejects.toThrow('Physical-key sign-in required');
    await expect(guard.canActivate(context('/v1/projects', cookie.slice(0, -1) + (cookie.endsWith('0') ? '1' : '0')))).rejects.toThrow(UnauthorizedException);
    delete process.env.FORGEOS_AUTH_MODE;
    await expect(guard.canActivate(context('/v1/projects', cookie))).rejects.toThrow(UnauthorizedException);
  });

  it('exposes safe metadata for the verified current session', async () => {
    const expires = String(Date.now() + 60000), authAt = String(Date.now());
    const request: { path: string; method: string; headers: { cookie: string }; forgeosSession?: { method: string; expiresAt: string } } = { path: '/v1/auth/session', method: 'GET', headers: { cookie: keyCookie(expires, authAt) } };
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(request.forgeosSession).toEqual({ method: 'security-key', expiresAt: new Date(Number(expires)).toISOString() });
    expect(JSON.stringify(request.forgeosSession)).not.toContain('forgeos_session');
  });

  it('rejects expired, stale, and legacy shared-password sessions', async () => {
    const authAt = String(Date.now() - 16 * 60_000);
    const expires = String(Date.now() + 60_000);
    await expect(guard.canActivate(context('/v1/projects', keyCookie(expires, authAt)))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context('/v1/projects', `forgeos_session=${expires}.${createHmac('sha256', secret).update(expires).digest('hex')}`))).rejects.toThrow(UnauthorizedException);
  });
});
