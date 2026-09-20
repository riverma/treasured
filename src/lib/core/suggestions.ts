// The (relation × sentiment) suggestion matrix. Ported verbatim — this table IS the
// product's voice; docs/05_BUSINESS_LOGIC.md is explicit that it stays a lookup.
//
// The core decision tree. (Relation × Sentiment) → one-line suggestion.
// Drawn from: Aron (novelty / self-expansion), Gable (active constructive
// responding), Denworth (frequency, vocal warmth), Gottman (bids, soft
// startup), attachment theory, Waldinger (Harvard Adult Development Study).
//
// Keep these lines under ~120 chars each so they fit on a phone screen
// without wrapping awkwardly.

import type { RelationKey, SentimentKey } from './types';

type RelationMatrix = Partial<Record<SentimentKey, string>> & { default: string };

export const suggestions: Record<RelationKey, RelationMatrix> = {
  friend: {
    warm:       "Plan something new together — novelty deepens bonds more than the usual coffee.",
    treasured:  "Tell them they're treasured. Specific praise outlasts generic warmth.",
    grateful:   "Tell them what specifically you're grateful for — not 'thanks', the specifics.",
    seen:       "Reciprocate. Tell them something you've noticed in them lately.",
    distant:    "Send a voice memo with no agenda. Vocal warmth re-establishes presence faster than text.",
    rooted:     "These are the ones that don't need maintenance — a check-in still surprises.",
    wistful:    "Recall a specific memory together. Naming it makes them feel known.",
    at_ease:    "Make low-stakes plans. The best friendships don't need an occasion.",
    heavy:      "Ask 'how are you, really?' — and wait through the first answer.",
    light:      "Share something small that made you think of them today.",
    foggy:      "A short voice memo will tell you more than five texts.",
    conflicted: "Wait until you can lead with care, not heat.",
    default:    "Fifteen minutes counts. Don't wait for an hour.",
  },
  family: {
    warm:       "Share a memory they don't know you've kept. It says you've been paying attention.",
    grateful:   "Express it explicitly — family rarely hears the gratitude out loud.",
    loving:     "Say it. Family assumes; assumptions corrode.",
    rooted:     "Send a photo of something that reminded you of growing up.",
    wistful:    "Call instead of text. Voice across distance lands deeper.",
    foggy:      "Ask one question about their life you don't know the answer to.",
    conflicted: "Ask one curious question without a position. Curiosity de-escalates.",
    heavy:      "Sometimes presence is the gift. Suggest a low-stakes plan, no agenda.",
    distant:    "Reach with a small update about you, not a question for them.",
    cautious:   "Lead with something small and true. Bigger truths come after.",
    default:    "A short check-in beats a long silence.",
  },
  romantic: {
    loving:     "Speak the love today. Specifically. About one thing, not in general.",
    warm:       "Notice one thing they did this week. Specificity is the highest form of attention.",
    grateful:   "Tell them one thing you'd miss most if it ended. The specific is what lands.",
    treasured:  "Hold their face when you say it. Specifics over volume.",
    energized:  "Tell them how being with them changes who you are.",
    cautious:   "Name what you're feeling without making it their problem yet.",
    distant:    "Reach for them physically before reaching with words.",
    conflicted: "Soften the start. The first 30 seconds set the next 30 minutes.",
    heavy:      "Sit beside, not across. Side-by-side reduces stakes.",
    at_ease:    "Plan something restful together. Sometimes peace deepens more than novelty.",
    default:    "Bid for connection in small moments. Tiny turns predict the long arc.",
  },
  professional: {
    warm:       "Share a relevant article with one personal note attached. Bridge work and human.",
    curious:    "Suggest a 20-min walk-and-talk. Side-by-side reduces formality.",
    distant:    "Re-open with a specific reference to your last conversation — not just 'how are you'.",
    energized:  "Make the small ask now while the warmth is real.",
    seen:       "Tell them you noticed. Recognition from peers outweighs recognition from above.",
    rooted:     "Suggest a longer coffee, not a quick one. Steadiness is rare.",
    cautious:   "Be specific in your trust. Vague reassurance reads as polite.",
    grateful:   "Send the note in writing. Spoken praise fades; written praise lives in their inbox.",
    default:    "Brief is fine. Frequency builds the trust that big asks need.",
  },
};
