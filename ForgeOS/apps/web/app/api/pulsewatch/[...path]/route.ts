import { NextRequest, NextResponse } from 'next/server';

const upstream = process.env.FORGEOS_PULSEWATCH_INTERNAL_URL || 'http://127.0.0.1:4002';
const api = process.env.FORGEOS_API_INTERNAL_URL || 'http://127.0.0.1:4000';
const endpointId = '[0-9a-f-]{36}';
const allowed = new Map<string, RegExp>([
  ['GET', new RegExp(`^(endpoints|endpoints/${endpointId}|incidents|notifications|stats)$`)],
  ['POST', new RegExp(`^(endpoints|endpoints/${endpointId}/check|notifications/read-all)$`)],
  ['PUT', new RegExp(`^endpoints/${endpointId}$`)],
  ['DELETE', new RegExp(`^endpoints/${endpointId}$`)],
]);

async function forward(request: NextRequest, method: string, path: string[]) {
  const relative = path.join('/');
  if (!allowed.get(method)?.test(relative)) return NextResponse.json({ error: 'Unknown PulseWatch operation' }, { status: 404 });
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  const cookie = request.headers.get('cookie') || '';
  try {
    const overview = await fetch(`${api}/v1/overview?workspaceId=${encodeURIComponent(workspaceId)}`, {
      headers: { cookie }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!overview.ok) return NextResponse.json({ error: 'Workspace unavailable' }, { status: overview.status === 401 ? 401 : 404 });
    const data = await overview.json() as { workspace?: { moduleIds?: string[]; role?: string } };
    if (!data.workspace?.moduleIds?.includes('pulsewatch')) return NextResponse.json({ error: 'PulseWatch is disabled for this workspace' }, { status: 404 });
    if (method !== 'GET' && !['owner', 'admin', 'member'].includes(data.workspace.role || '')) {
      return NextResponse.json({ error: 'Insufficient workspace permissions' }, { status: 403 });
    }
    const target = `${upstream}/api/${relative}?workspaceId=${encodeURIComponent(workspaceId)}`;
    const body = method === 'POST' || method === 'PUT' ? await request.text() : undefined;
    if (body && body.length > 20_000) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const response = await fetch(target, {
      method, body, headers: body ? { 'content-type': 'application/json' } : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(20_000),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Monitoring service is unavailable' }, { status: 502 });
  }
}

type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: Context) { return forward(request, 'GET', (await context.params).path); }
export async function POST(request: NextRequest, context: Context) { return forward(request, 'POST', (await context.params).path); }
export async function PUT(request: NextRequest, context: Context) { return forward(request, 'PUT', (await context.params).path); }
export async function DELETE(request: NextRequest, context: Context) { return forward(request, 'DELETE', (await context.params).path); }
