'use client';
import { useState } from 'react';

export function useLlm() {
  const [provider, setProvider] = useState<'openai'|'anthropic'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(prompt: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/llm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider, apiKey, model, prompt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Model request failed');
      return String(data.text);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Model request failed'); throw cause; }
    finally { setBusy(false); }
  }
  return { provider, setProvider, apiKey, setApiKey, model, setModel, busy, error, run };
}
