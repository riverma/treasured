// The reach-out roster.
//
// The rules under test are the ones that fail silently: a number that reaches WhatsApp
// unnormalised opens a chat with nobody, and a custom scheme marked "external" would be
// opened in a new tab that an installed PWA can strand blank.

import { describe, expect, it } from 'vitest';
import {
  callChannels, CHANNEL_LABELS, messageChannels, toDigits, toE164
} from '../../src/lib/core/channels';
import type { ContactInfo } from '../../src/lib/core/types';

const full: ContactInfo = { hasContact: true, phone: '(555) 010-1234', email: 'friend@example.com' };

describe('E.164', () => {
  it('adds the default country code to a local number', () => {
    expect(toE164('(555) 010-1234')).toBe('+15550101234');
  });

  it('keeps a number that already declares its own country', () => {
    expect(toE164('+44 7700 900123')).toBe('+447700900123');
    expect(toE164('(555) 010-1234', '44')).toBe('+445550101234');
  });

  it('trusts a long bare number as already carrying a country code', () => {
    expect(toE164('447700900123')).toBe('+447700900123');
  });

  it('returns null rather than a broken link when there is nothing to dial', () => {
    expect(toE164(undefined)).toBeNull();
    expect(toE164('')).toBeNull();
    expect(toE164('not a number')).toBeNull();
  });

  it('strips the plus for the hosts that want bare digits', () => {
    expect(toDigits('+15550101234')).toBe('15550101234');
  });
});

describe('message roster', () => {
  const rows = messageChannels(full);

  it('offers every channel, because the web cannot know what is installed', () => {
    expect(rows.map((r) => r.key)).toEqual(['imessage', 'whatsapp', 'signal', 'telegram', 'email']);
  });

  it('builds the URLs each vendor actually expects', () => {
    const href = (k: string) => rows.find((r) => r.key === k)!.href;
    expect(href('imessage')).toBe('sms:+15550101234');
    expect(href('whatsapp')).toBe('https://wa.me/15550101234');
    expect(href('signal')).toBe('https://signal.me/#p/+15550101234');
    expect(href('telegram')).toBe('https://t.me/+15550101234');
    expect(href('email')).toBe('mailto:friend@example.com');
  });

  it('never puts a body parameter on the sms link', () => {
    // the scaffold's `sms:{n}&body=` was malformed, and the screens spec asks for no
    // pre-filled message anyway: what you say should be yours
    expect(rows.find((r) => r.key === 'imessage')!.href).not.toContain('body');
  });

  it('marks only https links as safe to open in a new tab', () => {
    for (const row of rows) {
      expect(row.external).toBe(row.href.startsWith('https://'));
    }
  });

  it('drops email when there is no address, and everything when there is no number', () => {
    expect(messageChannels({ hasContact: true, phone: '5550101234' }).map((r) => r.key))
      .not.toContain('email');
    expect(messageChannels({ hasContact: false })).toEqual([]);
  });
});

describe('call roster', () => {
  it('offers the five ways to call', () => {
    expect(callChannels(full).map((r) => r.key))
      .toEqual(['phone', 'facetime', 'facetime_audio', 'whatsapp_call', 'signal_call']);
  });

  it("uses Apple's own schemes, which cannot be missing from an iPhone", () => {
    const rows = callChannels(full);
    expect(rows.find((r) => r.key === 'phone')!.href).toBe('tel:+15550101234');
    expect(rows.find((r) => r.key === 'facetime')!.href).toBe('facetime://+15550101234');
    expect(rows.find((r) => r.key === 'facetime_audio')!.href).toBe('facetime-audio://+15550101234');
  });

  it('labels both WhatsApp rows the same way the person thinks of the app', () => {
    expect(CHANNEL_LABELS.whatsapp_call).toBe('WhatsApp');
    expect(CHANNEL_LABELS.signal_call).toBe('Signal');
  });
});

describe('learned preference', () => {
  it('floats the channel that worked last time to the top', () => {
    const rows = messageChannels({ ...full, preferredChannel: 'signal' });
    expect(rows[0]?.key).toBe('signal');
    // and keeps the rest, in order, exactly once
    expect(rows.map((r) => r.key)).toEqual(['signal', 'imessage', 'whatsapp', 'telegram', 'email']);
  });

  it('ignores a preference that no longer has a link to offer', () => {
    // remembered email, then the address was removed
    const rows = messageChannels({ hasContact: true, phone: '5550101234', preferredChannel: 'email' });
    expect(rows[0]?.key).toBe('imessage');
    expect(rows.some((r) => r.key === 'email')).toBe(false);
  });

  it('does not reorder a call roster by a messaging preference', () => {
    const rows = callChannels({ ...full, preferredChannel: 'telegram' });
    expect(rows[0]?.key).toBe('phone');
  });
});
