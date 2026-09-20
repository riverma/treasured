// The single function the UI consumes: getSuggestion(person). Combines the
// (relation × sentiment) matrix with weather-pattern escalation — when someone has read
// cool for three readings running, the engine promotes a deeper suggestion than the
// matrix default would give.
//
// Ported from the prototype scaffold (lib/suggestions/engine.ts). Two edits, both noted
// inline: primaryRelation() replaces relations[0] (defect 3), and the ranking tie-break
// the spec asked for is actually implemented.

import { primaryRelation } from './types';
import type { Person, RelationKey } from './types';
import { suggestions } from './suggestions';
import { detectPattern } from './patterns';

/** Used when a person has been consistently cool. */
const escalations: Record<RelationKey, string> = {
  friend: 'Three quiet readings in a row. A real call — even 15 minutes — does more here than another text.',
  family: "This pattern has held for weeks. Make it a visit, or a long call. Texts won't reach this.",
  romantic: "You've been reading distance for a while now. A 'state of us' conversation is overdue, gently.",
  professional: 'Multiple cool readings — the relationship is drifting. Suggest a longer in-person, not another Slack.'
};

export const getSuggestion = (person: Person): string => {
  // Defect 3: the scaffold took relations[0], so a ['friend','romantic'] person got
  // coached as a friend purely because of array order.
  const rel = primaryRelation(person.relations);

  if (detectPattern(person.sentimentHistory).escalate) return escalations[rel];

  const forRelation = suggestions[rel];
  return forRelation[person.recentSentiment] ?? forRelation.default;
};

/**
 * For the Connections (weekly review) screen: who most needs attention.
 *   1. escalated patterns (cool drift)
 *   2. cooling, then volatile
 *   3. time since last seen, capped at 90 days
 */
export const rankForConnections = (people: Person[], limit = 3): Person[] => {
  const now = Date.now();

  const scored = people.map((person) => {
    const { escalate, pattern } = detectPattern(person.sentimentHistory);
    // A person never marked as seen scores as long-neglected. Math.max keeps a
    // future-dated lastSeenAt (a clock change, an imported file) from scoring negative.
    const days = person.lastSeenAt
      ? Math.max(0, Math.floor((now - new Date(person.lastSeenAt).getTime()) / 86_400_000))
      : 999;

    let score = 0;
    if (escalate) score += 100;
    if (pattern === 'cooling') score += 50;
    if (pattern === 'volatile') score += 30;
    score += Math.min(days, 90);

    return { person, score };
  });

  // docs/05_BUSINESS_LOGIC.md asks for a stable tie-break on updated_at descending.
  // The scaffold sorted on score alone, which left ties resolved by whatever order the
  // caller happened to pass — so the same data could produce a different weekly three.
  scored.sort((a, b) =>
    b.score - a.score ||
    Date.parse(b.person.updatedAt) - Date.parse(a.person.updatedAt) ||
    a.person.id.localeCompare(b.person.id)
  );

  return scored.slice(0, limit).map((s) => s.person);
};
