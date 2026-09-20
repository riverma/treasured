// Per-person palettes.
//
// Each person carries a gradient and an ink colour. Checked against all eleven people in
// the mockup, softColor is always fontColor at 55% and lineColor at 18% — so only the
// gradient and the ink are authored here and the other two are derived. One source of
// truth, and the contrast fix below is then a single number per palette.

import type { PaletteKey, PersonPalette } from '$lib/core/types';

/** Ahimsa gradients are 155°; only --gradient-cream is 170°. */
const ANGLE = 155;

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

interface PaletteSpec {
  /** Stops, darkest first, matching the token gradients. */
  colors: [string, string, string, string];
  /** An opaque very dark tint of the hue, used for all text on the card. */
  fontColor: string;
  /** Alpha for softColor. See SOFT_ALPHA. */
  soft?: number;
}

/* The eleven the mockup authored, plus the three extensions it invented without a token.
   Stops are the Ahimsa gradient values; indigoSoft/mauve/olive have no token and are
   declared alongside --gradient-* in styles/tokens.css. */
const SPECS: Record<PaletteKey, PaletteSpec> = {
  dawn:       { colors: ['#f4a578', '#f5be8e', '#f6d3a8', '#fae7c6'], fontColor: '#4a2410' },
  amber:      { colors: ['#d4a574', '#e0b888', '#ecc99c', '#f5dcb3'], fontColor: '#3f2a12' },
  rose:       { colors: ['#e08591', '#ed9fa5', '#f4bdbf', '#fadcd9'], fontColor: '#3a0e16' },
  coral:      { colors: ['#e88b6a', '#efa181', '#f5b89c', '#fad0bb'], fontColor: '#45170a' },
  terracotta: { colors: ['#b87859', '#c89178', '#d6aa95', '#e3c3b3'], fontColor: '#36190d' },
  sage:       { colors: ['#7a9d7f', '#9ab5a0', '#b9cdc0', '#d7e3da'], fontColor: '#0c2418' },
  teal:       { colors: ['#5db8a8', '#82c8bb', '#a8d8cd', '#cee8e0'], fontColor: '#0a2a26' },
  indigo:     { colors: ['#6571b8', '#8590cf', '#b0b6df', '#d3cce6'], fontColor: '#161a3f' },
  violet:     { colors: ['#a692c4', '#bba8d2', '#cebede', '#e0d4ea'], fontColor: '#241a38' },
  slate:      { colors: ['#6781a3', '#8499b5', '#a5b3c7', '#c5cdd8'], fontColor: '#0e1721' },
  cream:      { colors: ['#fdf6e8', '#f9ebcf', '#f3deb3', '#f3deb3'], fontColor: '#2a1f18' },
  indigoSoft: { colors: ['#6571b8', '#8590cf', '#a8b1de', '#c8cee9'], fontColor: '#161a3f' },
  // Lightened from the mockup's ramp, which no ink could clear AA against at both ends.
  // Same plum hue, same lightness band as rose. See tests/unit/contrast.test.ts.
  mauve:      { colors: ['#c4799a', '#d494b0', '#e5b5c6', '#f2d7dd'], fontColor: '#2b1019' },
  olive:      { colors: ['#7d9963', '#97ae82', '#b0c29c', '#c7d0b5'], fontColor: '#1d2a10' }
};

/* The mockup authored softColor at 0.55. On these gradients that lands near 2:1 for the
   9-11px labels it carries ("Last together", the weather-strip days), which is far below
   AA. 0.72 is the highest value that still reads as a *soft* second voice rather than a
   duplicate of the ink, and it clears 3:1 on all fourteen palettes.

   It does NOT clear 4.5:1, the AA bar for text this small. Getting there needs alpha
   0.80-1.00, at which point softColor and fontColor are the same colour and the design
   loses its quietest register. See tests/unit/contrast.test.ts for the measured shortfall
   per palette and the three ways out, none of which is free. */
const SOFT_ALPHA = 0.72;

const LOCATIONS = [0, 0.3, 0.6, 1];

export const PALETTE_KEYS = Object.keys(SPECS) as PaletteKey[];

export function palette(key: PaletteKey): PersonPalette {
  const spec = SPECS[key];
  return {
    key,
    gradientColors: [...spec.colors],
    gradientLocations: [...LOCATIONS],
    angle: key === 'cream' ? 170 : ANGLE,
    fontColor: spec.fontColor,
    softColor: withAlpha(spec.fontColor, spec.soft ?? SOFT_ALPHA),
    lineColor: withAlpha(spec.fontColor, 0.18)
  };
}

/** The CSS the card paints. Matches the token gradients exactly. */
export function gradientCss(p: PersonPalette): string {
  const stops = p.gradientColors
    .map((c, i) => `${c} ${Math.round((p.gradientLocations[i] ?? 0) * 100)}%`)
    .join(', ');
  return `linear-gradient(${p.angle}deg, ${stops})`;
}

/**
 * Pick a palette for a newly created person.
 *
 * The mockup hard-codes rose for everyone it creates, so this logic did not exist.
 * Least-used first, ties broken by a hash of the id: deterministic (so tests and seeds
 * are reproducible), never repeats until all fourteen are spent, and never hands two
 * consecutive new people the same gradient.
 */
export function paletteForNewPerson(usedKeys: readonly PaletteKey[], personId: string): PaletteKey {
  // 'cream' is the app's own canvas, not a person's identity — never auto-assigned.
  const pool = PALETTE_KEYS.filter((k) => k !== 'cream');
  const counts = new Map<PaletteKey, number>(pool.map((k) => [k, 0]));
  for (const k of usedKeys) if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);

  const fewest = Math.min(...counts.values());
  const candidates = pool.filter((k) => counts.get(k) === fewest);

  let hash = 0;
  for (let i = 0; i < personId.length; i++) hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  return candidates[hash % candidates.length] ?? 'rose';
}
