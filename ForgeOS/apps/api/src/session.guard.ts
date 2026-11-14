import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PlatformService, type AuthActor } from './platform.service';

type SessionRequest = { path: string; method: string; headers: { cookie?: string }; forgeosAuth?: AuthActor; forgeosSession?: { expiresAt: string; method: string } };
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly platform: PlatformService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    if (request.path === '/v1/health' ||
      (request.path === '/v1/agent-access/projects' && request.method === 'GET') ||
      (request.path === '/v1/auth/setup' && ['GET', 'POST'].includes(request.method)) ||
      (request.path === '/v1/auth/setup/verify' && request.method === 'POST') ||
      (request.method === 'POST' && [
        '/v1/auth/login',
        '/v1/auth/accept-invite',
        '/v1/auth/webauthn/authenticate/options',
        '/v1/auth/webauthn/authenticate/verify',
      ].includes(request.path))) return true;

    const secret = process.env.FORGEOS_SESSION_SECRET;
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('Session verification is not configured');
    const cookie = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('forgeos_session='));
    const parts = cookie?.slice('forgeos_session='.length).split('.') || [];
    let userId: string;
    let expires: string;
    let signature: string;
    let payload: string;
    let enrollmentOnly = false;
    if (parts[0] === 'w' && parts.length === 5 && userIdPattern.test(parts[1]) && /^\d{13}$/.test(parts[2])) {
      [, userId, , expires, signature] = parts;
      if (Number(parts[2]) > Date.now() + 60_000 || Date.now() - Number(parts[2]) > 15 * 60_000) {
        throw new UnauthorizedException('Physical-key sign-in expired');
      }
      payload = `webauthn:${userId}:${parts[2]}:${expires}`;
    } else if (parts[0] === 'p' && parts.length === 4 && userIdPattern.test(parts[1]) && process.env.FORGEOS_AUTH_MODE === 'password') {
      [, userId, expires, signature] = parts;
      payload = `password:${userId}:${expires}`;
    } else if (parts[0] === 'u' && parts.length === 4 && userIdPattern.test(parts[1])) {
      [, userId, expires, signature] = parts;
      payload = `user:${userId}:${expires}`;
      enrollmentOnly = true;
    } else throw new UnauthorizedException('Authentication required');

    if (!/^\d{13}$/.test(expires) || Number(expires) < Date.now() || Number(expires) > Date.now() + 15 * 60_000 || !/^[a-f0-9]{64}$/.test(signature)) {
      throw new UnauthorizedException('Authentication required');
    }
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'hex');
    if (!timingSafeEqual(actual, expected)) throw new UnauthorizedException('Authentication required');
    if (enrollmentOnly && !(
      (request.method === 'GET' && ['/v1/auth/session', '/v1/auth/webauthn/credentials'].includes(request.path)) ||
      (request.method === 'POST' && [
        '/v1/auth/webauthn/register/options',
        '/v1/auth/webauthn/register/verify',
      ].includes(request.path))
    )) throw new UnauthorizedException('Physical-key sign-in required');
    request.forgeosAuth = await this.platform.actorForUser(userId);
    request.forgeosSession = { expiresAt: new Date(Number(expires)).toISOString(), method: parts[0] === 'w' ? 'security-key' : parts[0] === 'p' ? 'password' : 'enrollment' };
    return true;
  }
}
