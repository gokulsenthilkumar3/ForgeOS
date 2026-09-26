import { NextRequest, NextResponse } from 'next/server';

type SessionKind = 'human' | 'enrollment' | 'bootstrap';
const encoder = new TextEncoder();
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sessionKind(value: string | undefined, secret: string): Promise<SessionKind | null> {
  if (!value) return null;
  const parts = value.split('.');
  let payload: string;
  let signature: string;
  let expires: string;
  let kind: SessionKind;
  if (parts[0] === 'w' && parts.length === 5 && userIdPattern.test(parts[1]) && /^\d{13}$/.test(parts[2])) {
    [, , , expires, signature] = parts;
    if (Date.now() - Number(parts[2]) > 15 * 60_000 || Number(parts[2]) > Date.now() + 60_000) return null;
    payload = `webauthn:${parts[1]}:${parts[2]}:${expires}`;
    kind = 'human';
  } else if (parts[0] === 'u' && parts.length === 4 && userIdPattern.test(parts[1])) {
    [, , expires, signature] = parts;
    payload = `user:${parts[1]}:${expires}`;
    kind = 'enrollment';
  } else if (parts[0] === 'b' && parts.length === 3) {
    [, expires, signature] = parts;
    payload = `bootstrap:${expires}`;
    kind = 'bootstrap';
  } else return null;
  if (!/^\d{13}$/.test(expires) || Number(expires) < Date.now() || Number(expires) > Date.now() + 15 * 60_000 || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = new Uint8Array(signature.match(/../g)!.map(byte => parseInt(byte, 16)));
  return await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(payload)) ? kind : null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');
  const publicApi = pathname === '/api/v1/health' ||
    (pathname === '/api/v1/agent-access/projects' && request.method === 'GET') ||
    pathname === '/api/v1/auth/setup' ||
    (request.method === 'POST' && [
      '/api/v1/auth/login',
      '/api/v1/auth/accept-invite',
      '/api/v1/auth/webauthn/authenticate/options',
      '/api/v1/auth/webauthn/authenticate/verify',
    ].includes(pathname));
  if (publicApi) return NextResponse.next();

  const secret = process.env.FORGEOS_SESSION_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'ForgeOS session verification is not configured' }, { status: 503 });
  const kind = await sessionKind(request.cookies.get('forgeos_session')?.value, secret);
  if (kind === 'human') return NextResponse.next();
  if (kind === 'enrollment' && (pathname === '/enroll-key' ||
    pathname === '/api/v1/auth/session' ||
    pathname.startsWith('/api/v1/auth/webauthn/register/'))) return NextResponse.next();
  if (isApi) return NextResponse.json({ error: kind === 'enrollment' ? 'Physical-key sign-in required' : 'Authentication required' }, { status: kind === 'enrollment' ? 403 : 401 });
  const login = new URL(kind === 'enrollment' ? '/enroll-key' : '/login', request.url);
  if (kind !== 'enrollment') login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/', '/enroll-key', '/settings/:path*', '/modules/:path*', '/api/v1/:path*', '/api/pulsewatch/:path*', '/api/llm/:path*'] };
