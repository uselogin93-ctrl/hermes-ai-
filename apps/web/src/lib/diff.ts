export type DiffLine = {
  type: "same" | "added" | "removed";
  value: string;
};

/**
 * Line based diff between two versions of a draft.
 *
 * Uses a classic longest common subsequence so the review screen can show
 * exactly what changed between regenerations.
 */
export function diffLines(previous: string, next: string): DiffLine[] {
  const a = previous.split("\n");
  const b = next.split("\n");

  const lengths: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i]![j] =
        a[i] === b[j]
          ? lengths[i + 1]![j + 1]! + 1
          : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: "same", value: a[i]! });
      i += 1;
      j += 1;
    } else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) {
      result.push({ type: "removed", value: a[i]! });
      i += 1;
    } else {
      result.push({ type: "added", value: b[j]! });
      j += 1;
    }
  }

  while (i < a.length) {
    result.push({ type: "removed", value: a[i]! });
    i += 1;
  }
  while (j < b.length) {
    result.push({ type: "added", value: b[j]! });
    j += 1;
  }

  return result;
}

/** Counts words in a draft body. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
