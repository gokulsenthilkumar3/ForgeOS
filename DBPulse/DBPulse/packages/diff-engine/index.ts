// ─── Diff Engine ─────────────────────────────────────────────────────────────
// Compares before/after row snapshots and returns structured change info.

export type FieldValue = string | number | boolean | null | undefined;

export interface FieldDiff {
  column: string;
  before: FieldValue;
  after: FieldValue;
}

export interface DiffResult {
  changedColumns: string[];
  diffs: FieldDiff[];
  hasChanges: boolean;
}

/**
 * Compute a column-level diff between two row snapshots.
 * Works for UPDATE operations; pass null for before (INSERT) or after (DELETE).
 */
export function computeDiff(
  before: Record<string, FieldValue> | null,
  after: Record<string, FieldValue> | null
): DiffResult {
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  const diffs: FieldDiff[] = [];

  for (const column of allKeys) {
    const beforeVal = before?.[column] ?? null;
    const afterVal = after?.[column] ?? null;

    // Strict equality; JSON-serialize objects/arrays for deep compare
    const bStr = typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : beforeVal;
    const aStr = typeof afterVal === 'object' ? JSON.stringify(afterVal) : afterVal;

    if (bStr !== aStr) {
      diffs.push({ column, before: beforeVal, after: afterVal });
    }
  }

  return {
    changedColumns: diffs.map((d) => d.column),
    diffs,
    hasChanges: diffs.length > 0,
  };
}

/**
 * Render a human-readable diff summary for logging / UI tooltips.
 */
export function formatDiff(result: DiffResult): string {
  if (!result.hasChanges) return 'No changes detected.';
  return result.diffs
    .map((d) => `${d.column}: ${JSON.stringify(d.before)} → ${JSON.stringify(d.after)}`)
    .join('\n');
}
