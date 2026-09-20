<script lang="ts">
  // Today: one person, their gradient, the coaching line, and three ways to reach them.
  //
  // The card is the whole screen. Everything else on it is quiet — small caps for the
  // factual lines, italic serif for the one line that carries feeling. That split is the
  // tone, not a decoration.

  import CardBack from '$lib/screens/CardBack.svelte';
  import FlipCard from '$lib/ui/FlipCard.svelte';
  import PlanSheet from '$lib/sheets/Plan.svelte';
  import Reach from '$lib/sheets/Reach.svelte';
  import SentimentSheet from '$lib/sheets/Sentiment.svelte';
  import { data } from '$lib/store/data.svelte';
  import { getSuggestion, rankForConnections } from '$lib/core/engine';
  import { gradientCss } from '$lib/data/palettes';
  import { sinceText } from '$lib/core/time';
  import { sentiments } from '$lib/core/sentiments';

  // Whoever you picked from the deck, if they are still in the ring you are browsing.
  // Otherwise whoever most needs attention — which is what Today is for when you have not
  // asked for anyone in particular.
  const inRing = $derived(data.peopleInRing(data.slice.activeRingId));
  const chosen = $derived(inRing.find((p) => p.id === data.activePersonId));
  const person = $derived(
    chosen
      ?? rankForConnections(inRing.filter((p) => !data.isSuppressed(p.id)), 1)[0]
      ?? inRing[0]
  );

  let sheet = $state<'message' | 'call' | null>(null);
  let planning = $state(false);
  let feeling = $state(false);
  let flipped = $state(false);

  const palette = $derived(person?.palette);

  // Turning to a different person should not leave you looking at the back of their card.
  $effect(() => {
    void person?.id;
    flipped = false;
  });
</script>

<div class="screen">
  {#if !data.ready}
    <div class="centre"><span class="ah-caption soft">Opening…</span></div>
  {:else if !person}
    <div class="centre">
      <p class="ah-body-serif soft">Nobody here yet. Add someone whenever you're ready.</p>
    </div>
  {:else}
    <div class="scroll tight" style="--scroll-tail: 24px">
      <FlipCard {flipped} onflip={() => (flipped = !flipped)} label={flipped ? 'Front' : 'More about them'}>
        {#snippet front()}
      <div
        class="face"
        style="background: {gradientCss(palette!)}; color: {palette!.fontColor}"
      >
        <span class="ah-micro-caps" style="color: {palette!.softColor}">On your mind today</span>

        <div class="mono ah-display-l" style="color: {palette!.fontColor}">{person.initial}</div>

        <h1 class="ah-display-l name">{person.fullName}</h1>
        <p class="ah-caption essence" style="color: {palette!.softColor}">{person.essence}</p>

        <span class="ah-micro-caps" style="color: {palette!.softColor}">
          Last together · {sinceText(person.lastSeenAt)}
        </span>

        <div class="rule" style="background: {palette!.softColor}"></div>

        <!-- The one line that carries feeling, so the one line set in italic serif. -->
        <p class="ah-pull-quote suggestion">{getSuggestion(person)}</p>

        <div class="actions">
          <button class="act" onclick={() => (sheet = 'message')}>
            <span class="orb ah-title-l" style="color: {palette!.fontColor}">M</span>
            <span class="ah-small-caps" style="color: {palette!.softColor}">Message</span>
          </button>
          <button class="act" onclick={() => (sheet = 'call')}>
            <span class="orb ah-title-l" style="color: {palette!.fontColor}">C</span>
            <span class="ah-small-caps" style="color: {palette!.softColor}">Call</span>
          </button>
          <button class="act" onclick={() => (planning = true)}>
            <span class="orb ah-title-l" style="color: {palette!.fontColor}">P</span>
            <span class="ah-small-caps" style="color: {palette!.softColor}">Plan</span>
          </button>
        </div>
      </div>
        {/snippet}

        {#snippet back()}
          <CardBack {person} />
        {/snippet}
      </FlipCard>

      <button class="beneath" onclick={() => (feeling = true)}>
        <span class="ah-micro-caps faint">Feeling</span>
        <span class="ah-caption soft">{sentiments[person.recentSentiment].label}</span>
      </button>
    </div>
  {/if}
</div>

<Reach open={sheet !== null} kind={sheet ?? 'message'} {person} onclose={() => (sheet = null)} />
<PlanSheet open={planning} {person} onclose={() => (planning = false)} />
<SentimentSheet open={feeling} {person} onclose={() => (feeling = false)} />

<style>
  .centre { flex: 1; display: grid; place-items: center; padding: 0 var(--gutter); text-align: center; }
  .soft { color: var(--text-secondary); }
  .faint { color: var(--text-faint); }

  .face {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    border-radius: var(--radius-3xl);
    padding: 32px 24px 28px;
    box-shadow: var(--shadow-lg);
  }

  /* Ahimsa's monogram: an initial in italic serif on glass, never a photograph. */
  .mono {
    width: 104px; height: 104px; margin: 14px 0 18px;
    display: grid; place-items: center;
    border-radius: var(--radius-full);
    background: var(--glass-overlay);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.10), inset 0 2px 0 rgba(255, 255, 255, 0.55);
    font-style: italic;
    font-weight: 300;
  }

  .name { margin: 0; font-weight: 400; }
  .essence { margin: 6px 0 12px; }
  .rule { width: 24px; height: 1px; opacity: 0.6; margin: 16px 0 12px; }
  .suggestion { margin: 0; max-width: 30ch; }

  .actions { display: flex; gap: 26px; margin-top: 24px; }
  .act {
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    background: none; border: none; padding: 0; cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-standard);
  }
  .act:active { transform: scale(0.97); }
  .act:disabled { opacity: 0.45; cursor: default; }
  .act:disabled:active { transform: none; }

  .orb {
    width: 52px; height: 52px;
    display: grid; place-items: center;
    border-radius: var(--radius-full);
    background: var(--glass-overlay);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
    font-style: italic;
  }

  .beneath {
    display: flex; align-items: baseline; justify-content: center; gap: 8px;
    padding: 18px 0 4px;
    background: none; border: none; cursor: pointer; width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    .act:active, .act { transition: none; }
  }
</style>
