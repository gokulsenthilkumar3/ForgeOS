import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => ({}));
  const { provider, apiKey, model, prompt } = input as Record<string, unknown>;
  if (!['openai', 'anthropic'].includes(String(provider)) || typeof apiKey !== 'string' || !apiKey || typeof model !== 'string' || !model || typeof prompt !== 'string' || !prompt || prompt.length > 20000) return NextResponse.json({ error: 'Provider, key, model, and a prompt under 20,000 characters are required' }, { status: 400 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const isAnthropic = provider === 'anthropic';
    const response = await fetch(isAnthropic ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: isAnthropic ? { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(isAnthropic ? { model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] } : { model, messages: [{ role: 'user', content: prompt }] }),
      signal: controller.signal,
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data.error?.message || `Provider returned ${response.status}` }, { status: 502 });
    const text = isAnthropic ? data.content?.filter((part: { type: string }) => part.type === 'text').map((part: { text: string }) => part.text).join('\n') : data.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return NextResponse.json({ error: 'Provider returned no text' }, { status: 502 });
    return NextResponse.json({ text });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Provider request failed' }, { status: 502 }); }
  finally { clearTimeout(timeout); }
}
