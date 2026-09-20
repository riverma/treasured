// The 16 sentiments. Ported verbatim from the prototype scaffold.
import type { Sentiment, SentimentKey } from './types';

/**
 * The 16 sentiments shown in the SentimentSheet (4×4 grid).
 * `warmth` is used by the weather pattern detector — keep the values stable.
 *  +2 = unambiguously warm   (warm, treasured, loving, grateful, energized)
 *  +1 = positive but quieter (seen, light, at_ease, rooted, curious)
 *   0 = neutral / transitional (wistful, cautious)
 *  -1 = cooling              (distant, foggy)
 *  -2 = cold / negative      (heavy, conflicted)
 */
/* Hue by warmth band, not by sentiment. Five warm words share amber because the word is
   what distinguishes them; the colour only says roughly where the reading sits. The two
   cool bands are indigo and terracotta — Ahimsa has no red, and an alarm colour would turn
   noticing distance into being told off for it. */
export const sentiments: Record<SentimentKey, Sentiment> = {
  warm:        { label: 'Warm',        warmth: 2,  tint: 'amber' },
  treasured:   { label: 'Treasured',   warmth: 2,  tint: 'amber' },
  loving:      { label: 'Loving',      warmth: 2,  tint: 'rose' },
  grateful:    { label: 'Grateful',    warmth: 2,  tint: 'amber' },
  energized:   { label: 'Energized',   warmth: 2,  tint: 'amber' },

  seen:        { label: 'Seen',        warmth: 1,  tint: 'sage' },
  light:       { label: 'Light',       warmth: 1,  tint: 'sage' },
  curious:     { label: 'Curious',     warmth: 1,  tint: 'sage' },
  at_ease:     { label: 'At ease',     warmth: 1,  tint: 'sage' },
  rooted:      { label: 'Rooted',      warmth: 1,  tint: 'sage' },

  wistful:     { label: 'Wistful',     warmth: 0,  tint: 'violet' },
  cautious:    { label: 'Cautious',    warmth: 0,  tint: 'slate' },

  distant:     { label: 'Distant',     warmth: -1, tint: 'slate' },
  foggy:       { label: 'Foggy',       warmth: -1, tint: 'slate' },

  heavy:       { label: 'Heavy',       warmth: -2, tint: 'indigo' },
  conflicted:  { label: 'Conflicted',  warmth: -2, tint: 'terracotta' }
};

/** The CSS custom property a chip paints with. */
export function tintVar(key: SentimentKey, step: 300 | 400 | 500 | 600 | 700 = 500): string {
  return `var(--${sentiments[key]?.tint ?? 'slate'}-${step})`;
}

export const sentimentKeys = Object.keys(sentiments) as SentimentKey[];

/** Fix for defect 2: `sentiments[key].warmth` threw on any key the vocabulary no
 *  longer contains, and detectPattern is the first thing getSuggestion calls — so
 *  one stale row anywhere took the whole Today screen down. Unknown reads as
 *  neutral, which degrades the pattern rather than the app. */
export function warmthOf(key: SentimentKey): number {
  return sentiments[key]?.warmth ?? 0;
}

export function isSentimentKey(v: unknown): v is SentimentKey {
  return typeof v === 'string' && v in sentiments;
}
