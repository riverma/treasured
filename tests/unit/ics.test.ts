// The calendar file.
//
// The shape matters more than it looks: a strict parser will reject an unfolded long line
// or an unescaped comma, and the failure mode is a calendar that silently declines to
// import rather than an error anyone sees.

import { describe, expect, it } from 'vitest';
import { buildIcs, planText, startOf } from '../../src/lib/core/ics';

const base = {
  personId: 'p1',
  fullName: 'Q R',
  title: 'Coffee',
  date: '2026-10-02',
  timeOfDay: 'afternoon' as const,
  uid: 'fixed-uid',
  now: new Date('2026-09-19T12:00:00.000Z')
};

describe('the event', () => {
  const ics = buildIcs(base);

  it('is a single well-formed VEVENT', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('uses CRLF, which the spec requires', () => {
    expect(ics).toContain('\r\n');
    expect(ics.split('\r\n').some((l) => l.includes('\n'))).toBe(false);
  });

  it('starts at the hour the time of day means, and lasts an hour', () => {
    const start = startOf('2026-10-02', 'afternoon');
    expect(start.getHours()).toBe(14);
    expect(startOf('2026-10-02', 'morning').getHours()).toBe(10);
    expect(startOf('2026-10-02', 'evening').getHours()).toBe(18);
    expect(startOf('2026-10-02', 'late').getHours()).toBe(21);

    const dt = /DTSTART:(\d{8}T\d{6}Z)/.exec(ics)?.[1];
    const dtEnd = /DTEND:(\d{8}T\d{6}Z)/.exec(ics)?.[1];
    expect(dt).toBeTruthy();
    const parse = (s: string) => Date.parse(
      s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')
    );
    expect(parse(dtEnd!) - parse(dt!)).toBe(3_600_000);
  });

  it('carries a one-hour alarm', () => {
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT1H');
  });

  it('says where it came from', () => {
    expect(ics).toContain('DESCRIPTION:From Treasured');
  });

  it('falls back to a title when none was typed', () => {
    expect(buildIcs({ ...base, title: '   ' })).toContain('SUMMARY:Time with Q R');
  });
});

describe('escaping and folding', () => {
  it('escapes commas and semicolons in a title', () => {
    const ics = buildIcs({ ...base, title: 'Lunch, then a walk; maybe' });
    expect(ics).toContain('SUMMARY:Lunch\\, then a walk\; maybe');
  });

  it('folds a long line with a leading space on continuations', () => {
    const ics = buildIcs({ ...base, title: 'x'.repeat(200) });
    const summaryBlock = ics.split('\r\n').filter((l) => l.startsWith('SUMMARY') || l.startsWith(' '));
    expect(summaryBlock.length).toBeGreaterThan(1);
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
  });

  it('turns a newline in the notes into the literal escape', () => {
    const ics = buildIcs({ ...base, notes: 'one\ntwo' });
    expect(ics).toContain('\\n');
  });
});

describe('the clipboard fallback', () => {
  it('reads as something you could paste to a person', () => {
    const text = planText(base);
    expect(text).toContain('Coffee');
    expect(text).toContain('With Q R');
  });
});
