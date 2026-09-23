import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

export async function POST(request: NextRequest) {
  const configured = process.env.FORGEOS_ADMIN_PASSWORD;
  const secret = process.env.FORGEOS_SESSION_SECRET;
  if (!configured || !secret || secret.length < 32) return NextResponse.json({ error: 'Login not configured' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const actual = createHmac('sha256', secret).update(String(body.password || '')).digest();
  const expected = createHmac('sha256', secret).update(configured).digest();
  if (!timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  const signature = createHmac('sha256', secret).update(expires).digest('hex');
  const response = NextResponse.json({ ok: true });
  response.cookies.set('forgeos_session', `${expires}.${signature}`, { httpOnly: true, sameSite: 'lax', secure: process.env.FORGEOS_SECURE_COOKIES === 'true' || request.nextUrl.protocol === 'https:', path: '/', maxAge: 8 * 60 * 60 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('forgeos_session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
