import { NextRequest, NextResponse } from 'next/server';

const encoder = new TextEncoder();
async function validSession(value: string | undefined, secret: string) {
  if (!value) return false;
  const [expires, signature] = value.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(expires)));
  const expected = Array.from(signed, byte => byte.toString(16).padStart(2, '0')).join('');
  return expected.length === signature.length && [...expected].every((char, index) => char === signature[index]);
}

export async function middleware(request: NextRequest) {
  const secret = process.env.FORGEOS_SESSION_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'FORGEOS_SESSION_SECRET must be configured' }, { status: 503 });
  if (await validSession(request.cookies.get('forgeos_session')?.value, secret)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const login = new URL('/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(login);
}
export const config = { matcher: ['/', '/modules/:path*', '/api/v1/:path*', '/api/pulsewatch/:path*', '/api/llm/:path*'] };
