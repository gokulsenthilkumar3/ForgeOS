import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PlatformService, type AuthActor } from './platform.service';

type SessionRequest = { path: string; method: string; headers: { cookie?: string }; forgeosAuth?: AuthActor };
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly platform: PlatformService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    if (request.path === '/v1/health' ||
      (request.path === '/v1/auth/setup' && ['GET', 'POST'].includes(request.method)) ||
      (request.method === 'POST' && ['/v1/auth/login', '/v1/auth/accept-invite'].includes(request.path))) return true;

    const secret = process.env.FORGEOS_SESSION_SECRET;
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('Session verification is not configured');
    const cookie = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('forgeos_session='));
    const parts = cookie?.slice('forgeos_session='.length).split('.') || [];
    let actor: AuthActor;
    let expires: string;
    let signature: string;
    let payload: string;
    if (parts[0] === 'u' && parts.length === 4 && userIdPattern.test(parts[1])) {
      [, , expires, signature] = parts;
      payload = `user:${parts[1]}:${expires}`;
      actor = await this.platform.actorForUser(parts[1]);
    } else if (parts[0] === 'b' && parts.length === 3) {
      [, expires, signature] = parts;
      payload = `bootstrap:${expires}`;
      actor = { kind: 'bootstrap' };
    } else if (parts.length === 2) {
      [expires, signature] = parts;
      payload = expires;
      actor = { kind: 'bootstrap' };
    } else throw new UnauthorizedException('Authentication required');

    if (!/^\d{13}$/.test(expires) || Number(expires) < Date.now() || !/^[a-f0-9]{64}$/.test(signature)) {
      throw new UnauthorizedException('Authentication required');
    }
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'hex');
    if (!timingSafeEqual(actual, expected)) throw new UnauthorizedException('Authentication required');
    if (actor.kind === 'bootstrap' && !await this.platform.ownerRequired()) throw new UnauthorizedException('Bootstrap access has ended');
    request.forgeosAuth = actor;
    return true;
  }
}
