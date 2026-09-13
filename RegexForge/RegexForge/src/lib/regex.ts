export interface MatchResult {
  match: string;
  index: number;
  groups?: Record<string, string>;
}

export function runRegex(pattern: string, flags: string, input: string): MatchResult[] {
  try {
    const re = new RegExp(pattern, flags);
    const results: MatchResult[] = [];
    let m;
    const globalRe = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    while ((m = globalRe.exec(input)) !== null) {
      results.push({ match: m[0], index: m.index, groups: m.groups });
    }
    return results;
  } catch {
    return [];
  }
}
