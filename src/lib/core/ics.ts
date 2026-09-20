// Handing an event to the calendar.
//
// The native app would have written to EventKit and kept the event id, so it could update
// or remove the event later. The web cannot: we hand over a file and never learn what
// happened to it. That is a real loss and the copy says so rather than implying otherwise —
// "Ready for your calendar" and not "Added to your calendar".

import { TIME_OF_DAY_HOURS } from './types';
import type { PlanProposal, TimeOfDay } from './types';

/** RFC 5545 wants UTC stamps as YYYYMMDDTHHMMSSZ. */
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Long lines must be folded at 75 octets with a leading space on continuations, or strict
 * parsers reject the file. A name with an em dash in it is enough to cross that.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(' ' + rest);
  return parts.join('\r\n');
}

/** Commas, semicolons and backslashes are structural in iCalendar text values. */
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export interface IcsInput extends PlanProposal {
  fullName: string;
  /** Injectable for tests. */
  uid?: string;
  now?: Date;
}

/** The local wall-clock start, from the chosen day and time of day. */
export function startOf(date: string, timeOfDay: TimeOfDay): Date {
  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  start.setHours(TIME_OF_DAY_HOURS[timeOfDay] ?? 18, 0, 0, 0);
  return start;
}

export function buildIcs(input: IcsInput): string {
  const now = input.now ?? new Date();
  const start = startOf(input.date, input.timeOfDay);
  const end = new Date(start.getTime() + 3_600_000);
  const title = input.title.trim() || 'Time with ' + input.fullName;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Treasured//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + (input.uid ?? crypto.randomUUID()) + '@treasured',
    'DTSTAMP:' + stamp(now),
    'DTSTART:' + stamp(start),
    'DTEND:' + stamp(end),
    'SUMMARY:' + esc(title),
    'DESCRIPTION:' + esc('From Treasured · with ' + input.fullName + (input.notes ? '\n' + input.notes : '')),
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + esc(title),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Plain text for the clipboard, for when the file hand-off is refused or ignored. */
export function planText(input: IcsInput): string {
  const start = startOf(input.date, input.timeOfDay);
  const when = start.toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
  const title = input.title.trim() || 'Time with ' + input.fullName;
  return `${title}\n${when}\nWith ${input.fullName}${input.notes ? '\n' + input.notes : ''}`;
}

/*
 * A note on the content security policy, since it looks like it ought to matter here.
 *
 * `default-src 'none'` governs what the page *fetches*. Clicking an anchor is a navigation,
 * which is governed by `navigate-to` — a directive that never shipped widely — so none of
 * the three hand-offs below needs the policy loosened, and it has deliberately not been.
 * Weakening the strongest part of the privacy story on speculation would be a poor trade.
 * The spike's third question confirms this against the real policy on real hardware.
 */
export type IcsMethod = 'data-url' | 'blob-download' | 'web-share';

/**
 * Hand the file over, best method first.
 *
 * Which of these iOS actually honours is the Phase 0 spike's second question and is not yet
 * answered, so all three ship and are tried in order. When the spike settles it, the winner
 * becomes the first element of ORDER and nothing else changes.
 */
export const ORDER: IcsMethod[] = ['web-share', 'data-url', 'blob-download'];

export async function deliver(ics: string, filename = 'plan.ics'): Promise<IcsMethod | null> {
  for (const method of ORDER) {
    try {
      if (method === 'web-share') {
        if (typeof navigator.share !== 'function' || typeof File === 'undefined') continue;
        const file = new File([ics], filename, { type: 'text/calendar' });
        if (navigator.canShare && !navigator.canShare({ files: [file] })) continue;
        await navigator.share({ files: [file] });
        return method;
      }

      if (method === 'data-url') {
        // No download attribute: on iOS that is what opens the Calendar import sheet
        // rather than dropping a file into Files.
        const a = document.createElement('a');
        a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return method;
      }

      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return method;
    } catch {
      // A refused share is not a failure worth reporting — the person simply changed their
      // mind. Fall through to the next method and, if all of them decline, to the clipboard.
      continue;
    }
  }
  return null;
}
