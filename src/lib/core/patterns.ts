// Detects "weather patterns" in a person's sentiment history and produces the single
// italic line that sits below the weather strip on the card back.
//
// Ported from the prototype scaffold (lib/suggestions/patterns.ts). The algorithm and
// every caption are unchanged; the only edits are the warmthOf() guards (defect 2) and
// the index guards that `noUncheckedIndexedAccess` insists on.
//
// CONTRACT: `history` is oldest-first. `slice(-3)` must be the three most recent
// readings. Feeding it newest-first inverts `trend` and turns every cooling
// relationship into a warming one — see tests/unit/patterns.test.ts.

import { warmthOf } from './sentiments';
import type { SentimentReading } from './types';

export type Pattern =
  | 'too_few'
  | 'steady_warm'
  | 'steady_cool'
  | 'cooling'
  | 'warming'
  | 'volatile'
  | 'shifting';

export interface PatternResult {
  pattern: Pattern;
  /** The italic one-liner shown below the weather strip. */
  caption: string;
  /** When true, the Today suggestion escalates. See engine.ts. */
  escalate: boolean;
}

export const detectPattern = (history: SentimentReading[]): PatternResult => {
  if (history.length < 3) {
    return {
      pattern: 'too_few',
      caption: 'Too few readings yet — keep noticing.',
      escalate: false
    };
  }

  const last3 = history.slice(-3);
  const w = last3.map((r) => warmthOf(r.key));
  const [first = 0, , third = 0] = w;

  const warmthAvg = w.reduce((sum, n) => sum + n, 0) / 3;
  const trend = third - first;
  const samePolarity = w.every((n) => n >= 1) || w.every((n) => n <= -1);

  // Steady positive
  if (samePolarity && warmthAvg >= 1) {
    return {
      pattern: 'steady_warm',
      caption: 'Steady warmth. The kind of relationship that protects you.',
      escalate: false
    };
  }

  // Steady cool — three negative readings running. Escalate the suggestion.
  if (samePolarity && warmthAvg <= -1) {
    return {
      pattern: 'steady_cool',
      caption: 'A drift, three readings now. Worth one real conversation.',
      escalate: true
    };
  }

  if (trend <= -2) {
    return {
      pattern: 'cooling',
      caption: 'Cooling. Not broken — but reach out before it sets.',
      escalate: false
    };
  }

  if (trend >= 2) {
    return {
      pattern: 'warming',
      caption: "Warming. Whatever you're doing — do more of it.",
      escalate: false
    };
  }

  // Swinging between warm and cool
  if (Math.max(...w) - Math.min(...w) >= 3) {
    return {
      pattern: 'volatile',
      caption: "Swinging. Worth asking what's changing for them.",
      escalate: false
    };
  }

  return {
    pattern: 'shifting',
    caption: "Shifting. That's most relationships, most of the time.",
    escalate: false
  };
};
