export const commitTypes = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'perf', 'style'];

export function formatCommit({ kind, scope = '', summary = '' }) {
  if (!commitTypes.includes(kind)) throw new Error('Choose a valid commit type.');
  const cleanScope = scope.trim();
  if (cleanScope && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(cleanScope)) throw new Error('Scope must be 1–40 lowercase letters, numbers, or hyphens.');
  const subject = summary.trim();
  if (!subject || subject.length > 120 || /[\r\n\x00-\x1f]/.test(subject)) throw new Error('Summary must be one line of 1–120 characters.');
  return `${kind}${cleanScope ? `(${cleanScope})` : ''}: ${subject.charAt(0).toLowerCase()}${subject.slice(1)}`;
}

export function validateGeneratedCommit(message) {
  const clean = message.trim();
  if (clean.length > 160 || !/^(feat|fix|docs|refactor|test|chore|perf|style)(\([a-z0-9-]{1,40}\))?: [^\r\n]+$/.test(clean)) {
    throw new Error('The model did not return a single Conventional Commit line. Edit the summary or try again.');
  }
  return clean;
}
