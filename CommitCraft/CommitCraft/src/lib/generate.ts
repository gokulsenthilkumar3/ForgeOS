export async function generateCommitMessage(
  diff: string,
  type: string,
  scope: string,
  apiKey: string
): Promise<string> {
  const prompt = `You are an expert at writing Git commit messages following the Conventional Commits specification.

Given this git diff, generate a single commit message.
Type: ${type}
Scope: ${scope || 'none'}

Git diff:
${diff.slice(0, 3000)}

Respond with ONLY the commit message, nothing else.
Format: ${type}${scope ? `(${scope})` : ''}: <short description>`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
