// Reaching someone, on a platform that will not tell us what they have installed.
//
// The native app could ask `canOpenURL` and hide what was not there. The web cannot, at
// all, by design. So the roster is fixed and every row is shown — and the honest way to do
// that is to prefer `https://` universal links, which open the native app when it is
// installed and the vendor's own web page when it is not. Never a dead end.
//
// Custom schemes are used only where the app cannot be missing: sms:, tel: and facetime:
// are Apple's own and are not removable from an iPhone. A custom scheme for an app someone
// does not have produces Safari's "Cannot Open Page", which is exactly the sharp edge
// Ahimsa refuses to build.

import type { CallApp, ChannelKey, ContactInfo, MessagingApp } from './types';

export interface Channel {
  key: ChannelKey;
  label: string;
  /** Rendered as a real anchor. See the note on `href` below. */
  href: string;
  /**
   * True for `https://` links, which are safe — and correct — to open in a new tab.
   * Custom schemes must not: in an installed PWA a new tab can be left stranded and blank.
   */
  external: boolean;
}

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  imessage: 'Messages',
  whatsapp: 'WhatsApp',
  signal: 'Signal',
  telegram: 'Telegram',
  email: 'Email',
  phone: 'Phone',
  facetime: 'FaceTime',
  facetime_audio: 'FaceTime Audio',
  whatsapp_call: 'WhatsApp',
  signal_call: 'Signal'
};

/**
 * Normalise to E.164 — a leading plus, country code, then digits.
 *
 * A number written the local way has to reach WhatsApp as bare digits, or the link opens a
 * conversation with nobody. `countryCode` is the default set once in settings; a number
 * already written with a `+` keeps its own.
 */
export function toE164(raw: string | undefined, countryCode = '1'): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (hasPlus) return '+' + digits;
  // a bare number long enough to already carry a country code is trusted as-is
  if (digits.length > 10) return '+' + digits;
  return '+' + countryCode + digits;
}

/** Digits only, no leading `+`. What wa.me and t.me want. */
export function toDigits(e164: string): string {
  return e164.replace(/\D/g, '');
}

const MESSAGE_ORDER: MessagingApp[] = ['imessage', 'whatsapp', 'signal', 'telegram', 'email'];
const CALL_ORDER: CallApp[] = ['phone', 'facetime', 'facetime_audio', 'whatsapp_call', 'signal_call'];

function build(key: ChannelKey, e164: string | null, email: string | undefined): Channel | null {
  const digits = e164 ? toDigits(e164) : '';
  switch (key) {
    // Apple's own, and not removable. No body parameter: the scaffold's `sms:{n}&body=` was
    // malformed anyway, and the screens spec asks for no pre-filled message.
    case 'imessage': return e164 ? { key, label: CHANNEL_LABELS[key], href: `sms:${e164}`, external: false } : null;
    case 'phone': return e164 ? { key, label: CHANNEL_LABELS[key], href: `tel:${e164}`, external: false } : null;
    case 'facetime': return e164 ? { key, label: CHANNEL_LABELS[key], href: `facetime://${e164}`, external: false } : null;
    case 'facetime_audio': return e164 ? { key, label: CHANNEL_LABELS[key], href: `facetime-audio://${e164}`, external: false } : null;

    // Universal links: the app if you have it, the website if you don't.
    case 'whatsapp':
    case 'whatsapp_call': return e164 ? { key, label: CHANNEL_LABELS[key], href: `https://wa.me/${digits}`, external: true } : null;
    case 'signal':
    case 'signal_call': return e164 ? { key, label: CHANNEL_LABELS[key], href: `https://signal.me/#p/${e164}`, external: true } : null;
    case 'telegram': return e164 ? { key, label: CHANNEL_LABELS[key], href: `https://t.me/+${digits}`, external: true } : null;

    case 'email': return email ? { key, label: CHANNEL_LABELS[key], href: `mailto:${email}`, external: false } : null;
    default: return null;
  }
}

function roster(order: ChannelKey[], contact: ContactInfo, countryCode: string): Channel[] {
  const e164 = toE164(contact.phone, countryCode);
  const built = order
    .map((key) => build(key, e164, contact.email))
    .filter((c): c is Channel => c !== null);

  // The channel that worked last time floats to the top. This is the whole of what install
  // detection would have bought us, recovered from local behaviour instead — we remember
  // what you chose rather than inspecting what you own.
  const preferred = contact.preferredChannel;
  if (!preferred) return built;
  const hit = built.find((c) => c.key === preferred);
  return hit ? [hit, ...built.filter((c) => c !== hit)] : built;
}

export function messageChannels(contact: ContactInfo, countryCode = '1'): Channel[] {
  return roster(MESSAGE_ORDER, contact, countryCode);
}

export function callChannels(contact: ContactInfo, countryCode = '1'): Channel[] {
  return roster(CALL_ORDER, contact, countryCode);
}

/**
 * The line under the roster.
 *
 * The mockup said "Available on your device for {name}", which we cannot know and therefore
 * must not say — Ahimsa's rule is that we never state what we cannot support. This is the
 * same reassurance, made true.
 */
export const ROSTER_NOTE = "Opens the app if you have it — the website if you don't.";
