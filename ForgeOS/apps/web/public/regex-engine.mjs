export const MAX_PATTERN_LENGTH = 1000;
export const MAX_SAMPLE_LENGTH = 100_000;
export const MAX_MATCHES = 100;

// Called inside a disposable worker. The parent terminates it if a pattern
// causes excessive backtracking, so no untrusted regex runs on the UI thread.
export function evaluateRegex(pattern, flags, sample) {
  if (typeof pattern !== 'string' || typeof flags !== 'string' || typeof sample !== 'string') {
    throw new Error('Pattern, flags, and sample must be text.');
  }
  if (pattern.length > MAX_PATTERN_LENGTH) throw new Error('Pattern is too long (1,000 characters maximum).');
  if (sample.length > MAX_SAMPLE_LENGTH) throw new Error('Sample is too long (100,000 characters maximum).');
  if (!/^[dgimsuvy]*$/.test(flags)) throw new Error('Use only JavaScript regular-expression flags: d, g, i, m, s, u, v, or y.');
  const expression = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  if (!pattern) return { matches: [], truncated: false };
  const matches = [];
  let match;
  while ((match = expression.exec(sample)) !== null) {
    matches.push({ value: match[0], index: match.index, groups: match.groups || null });
    if (matches.length >= MAX_MATCHES) return { matches, truncated: true };
    if (match[0] === '') {
      // AdvanceStringIndex, including surrogate pairs in Unicode mode.
      const position = expression.lastIndex;
      const point = sample.codePointAt(position);
      expression.lastIndex += (flags.includes('u') || flags.includes('v')) && point !== undefined && point > 0xffff ? 2 : 1;
    }
  }
  return { matches, truncated: false };
}
