import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';

const sessionMinutes = 15;
const internalApi = process.env.FORGEOS_API_INTERNAL_URL || 'http://127.0.0.1:4000';

function setSession(response: NextResponse, value: string, request: NextRequest) {
  response.cookies.set('forgeos_session', value, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.FORGEOS_SECURE_COOKIES === 'true' || request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: sessionMinutes * 60,
  });
  return response;
}

async function apiLogin(path: string, body: unknown) {
  const response = await fetch(new URL(path, internalApi), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function POST(request: NextRequest) {
  const secret = process.env.FORGEOS_SESSION_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'Login is not configured' }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const expires = String(Date.now() + sessionMinutes * 60_000);

  try {
    if (body.action === 'webauthn') {
      const { response, data } = await apiLogin('/v1/auth/webauthn/authenticate/verify', {
        challengeId: body.challengeId,
        response: body.response,
      });
      if (!response.ok || typeof data.userId !== 'string' || !/^\d{13}$/.test(String(data.authenticatedAt))) {
        return NextResponse.json({ error: data.message || 'Security key verification failed' }, { status: response.ok ? 401 : response.status });
      }
      const authAt = String(data.authenticatedAt);
      const signature = createHmac('sha256', secret).update(`webauthn:${data.userId}:${authAt}:${expires}`).digest('hex');
      return setSession(NextResponse.json({ ok: true, method: 'webauthn' }), `w.${data.userId}.${authAt}.${expires}.${signature}`, request);
    }

    if (body.action === 'password') {
      const { response, data } = await apiLogin('/v1/auth/login', { email: body.email, password: body.password });
      if (!response.ok || typeof data.userId !== 'string') {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const passwordLogin = process.env.FORGEOS_AUTH_MODE === 'password';
      const signature = createHmac('sha256', secret).update(`${passwordLogin ? 'password' : 'user'}:${data.userId}:${expires}`).digest('hex');
      return setSession(NextResponse.json({ ok: true, enrollmentOnly: !passwordLogin }), `${passwordLogin ? 'p' : 'u'}.${data.userId}.${expires}.${signature}`, request);
    }

    if (body.action === 'bootstrap') {
      const configured = process.env.FORGEOS_ADMIN_PASSWORD;
      if (!configured) return NextResponse.json({ error: 'Owner setup is not configured' }, { status: 503 });
      const setup = await fetch(new URL('/v1/auth/setup', internalApi), { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      if (!setup.ok || !(await setup.json()).ownerRequired) return NextResponse.json({ error: 'Owner setup has ended' }, { status: 403 });
      const { response, data } = await apiLogin('/v1/auth/setup/verify', { bootstrapPassword: body.password });
      if (!response.ok || data.ok !== true) return NextResponse.json({ error: data.message || 'Invalid credentials' }, { status: response.status || 401 });
      const signature = createHmac('sha256', secret).update(`bootstrap:${expires}`).digest('hex');
      return setSession(NextResponse.json({ ok: true, setupOnly: true }), `b.${expires}.${signature}`, request);
    }
    return NextResponse.json({ error: 'Choose an authentication method' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('forgeos_session', '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
