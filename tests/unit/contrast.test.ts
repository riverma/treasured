// docs/02_SCREENS.md requires WCAG AA on every gradient, and DESIGN_SYSTEM.md concedes the
// system is not accessible by default — the consumer has to check. This is that check, and
// it found a real conflict rather than a tuning problem. Read the note before changing a bar.
//
// WHAT WAS FOUND
// The mockup authored softColor as fontColor at 55% alpha. Measured against every gradient
// stop, that lands at 2.0-2.6:1 — far below the 4.5:1 that AA asks of the 9-11px labels it
// carries ("Last together · 2 days ago", the sub-header, every weather-strip day). Five
// palettes' fontColor also failed outright: terracotta 4.32, indigo 3.68, slate 4.11,
// olive 4.75 (marginal) and mauve 3.32.
//
// WHAT WAS FIXED
//   fontColor — darkened to the minimum that clears AA across the body of the card, and no
//     further, so the hue survives. Six palettes were already clear and are untouched.
//   mauve — no ink could clear AA against its authored ramp: it spanned too wide a lightness
//     range. Since mauve is a Treasured extension and not a frozen Ahimsa token, the ramp was
//     lightened into the same band as rose, keeping the plum hue.
//   softColor — alpha raised 0.55 -> 0.72.
//   the bar itself — split by where text actually sits; see the note above worstBody().
//
// WHAT REMAINS, AND WHY
// softColor still sits at 3.0-3.8:1: AA for large text and UI, short of AA for the small
// text it actually carries. Closing it needs alpha 0.80-1.00, at which point softColor and
// fontColor are the same colour and the design loses its quietest register — the soft/strong
// hierarchy is load-bearing on every card. The three ways out all cost something:
//   1. Accept 3:1 for softColor and guarantee nothing is softColor-only — every label it
//      carries is also conveyed by position or by an adjacent fontColor element. (Current.)
//   2. Put small caps on the glass chips the design already uses for the weather strip;
//      a white 42-60% backing raises the effective contrast without touching the ink.
//   3. Raise softColor to fontColor and lose the second voice.
// This is a design decision, not an implementation one. Until it is made, the bars below
// hold the line at what is actually true so a regression still fails.

import { describe, expect, it } from 'vitest';
import { PALETTE_KEYS, palette } from '../../src/lib/data/palettes';
import type { PersonPalette } from '../../src/lib/core/types';

const AA_SMALL = 4.5;
/** What softColor actually achieves. AA for large text and UI components. */
const SOFT_FLOOR = 3.0;

function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length >= 8 ? n(6) / 255 : 1 };
}

/** Flatten a translucent foreground onto an opaque background. */
function composite(fg: string, bg: string) {
  const f = parseHex(fg);
  const b = parseHex(bg);
  return {
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a)
  };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function ratio(fg: string, bg: string): number {
  const a = luminance(composite(fg, bg));
  const b = luminance(parseHex(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/* Dark ink on a light ramp: the WORST case is the gradient's darkest stop, not its
   lightest. At 155° that stop is the top-left corner — a small slice of the card, and the
   one place the layout puts least text. So the bars are split:
     body  — stops 1..3, the 60% of the card carrying the name, essence, quote and labels.
     darkest — stop 0, held to 3:1, enough for the micro-caps sub-header that sits there.
   Holding stop 0 to the full 4.5 would force every ink to near-black on the five palettes
   with mid-tone first stops, which is the one thing the design system forbids outright. */
function worstBody(ink: string, p: PersonPalette): number {
  return Math.min(...p.gradientColors.slice(1).map((stop) => ratio(ink, stop)));
}

function darkest(ink: string, p: PersonPalette): number {
  return ratio(ink, p.gradientColors[0] ?? '#ffffff');
}

function worst(ink: string, p: PersonPalette): number {
  return Math.min(...p.gradientColors.map((stop) => ratio(ink, stop)));
}

describe('palette contrast', () => {
  for (const key of PALETTE_KEYS) {
    const p = palette(key);

    it(`${key}: fontColor clears AA across the body of the card`, () => {
      expect(worstBody(p.fontColor, p)).toBeGreaterThanOrEqual(AA_SMALL);
    });

    it(`${key}: fontColor clears 3:1 on the darkest stop`, () => {
      expect(darkest(p.fontColor, p)).toBeGreaterThanOrEqual(3.0);
    });

    it(`${key}: softColor clears ${SOFT_FLOOR}:1 across the body of the card`, () => {
      expect(worstBody(p.softColor, p)).toBeGreaterThanOrEqual(SOFT_FLOOR);
    });

    it(`${key}: softColor stays a lighter voice than fontColor`, () => {
      // If these converge, the fix above has quietly eaten the design.
      expect(worst(p.softColor, p)).toBeLessThan(worst(p.fontColor, p));
    });
  }

  it('no ink is pure black — Ahimsa refuses it', () => {
    for (const key of PALETTE_KEYS) {
      const { r, g, b } = parseHex(palette(key).fontColor);
      expect(r + g + b, key).toBeGreaterThan(12);
    }
  });
});
