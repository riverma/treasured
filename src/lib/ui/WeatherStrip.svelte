<script lang="ts">
  // The weather over a relationship: the last seven readings, oldest to newest, with the
  // newest given room to be read first.
  //
  // No chart, no axis, no score. Ahimsa's refusals rule out anything that turns a friendship
  // into a metric you could be failing at — so this is a row of warmth, and a sentence.

  import { detectPattern } from '$lib/core/patterns';
  import { sentiments, tintVar } from '$lib/core/sentiments';
  import { shortSince } from '$lib/core/time';
  import type { SentimentReading } from '$lib/core/types';

  interface Props {
    history: SentimentReading[];
    /** Ink for the surface this sits on — the card back uses the person's own. */
    color?: string;
    softColor?: string;
  }

  const { history, color = 'var(--text-heading)', softColor = 'var(--text-secondary)' }: Props = $props();

  const shown = $derived(history.slice(-7));
  const pattern = $derived(detectPattern(history));
</script>

<div class="strip">
  {#if shown.length === 0}
    <p class="ah-caption" style="color: {softColor}">
      No readings yet. The first one you note starts the pattern.
    </p>
  {:else}
    <div class="row">
      {#each shown as reading, i (reading.at + i)}
        {@const newest = i === shown.length - 1}
        <div class="slot" class:newest>
          <div
            class="wchip"
            class:newest
            style="background: {tintVar(reading.key, newest ? 500 : 400)}"
            title={sentiments[reading.key]?.label ?? reading.key}
          ></div>
          <span class="ah-micro-caps age" style="color: {softColor}">
            {shortSince(reading.at)}
          </span>
        </div>
      {/each}
    </div>

    <!-- The caption is the only place the pattern is named, and it is set in italic serif
         because it is the sentence that carries feeling rather than fact. -->
    <p class="ah-caption caption" style="color: {color}">{pattern.caption}</p>
  {/if}
</div>

<style>
  .strip { display: flex; flex-direction: column; gap: 10px; width: 100%; }

  .row { display: flex; align-items: flex-end; justify-content: center; gap: 8px; }

  .slot { display: flex; flex-direction: column; align-items: center; gap: 5px; }

  /* Not .chip: app.css already has a global .chip with padding, which stretched these
     into pills. */
  .wchip {
    width: 18px; height: 18px;
    border-radius: var(--radius-full);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
    transition: transform var(--duration-base) var(--ease-standard);
  }
  /* The newest reading is the one you came here to see. */
  .wchip.newest { width: 28px; height: 28px; }

  .age { opacity: 0.75; }
  .slot.newest .age { opacity: 1; }

  .caption { margin: 0; text-align: center; max-width: 34ch; align-self: center; }

  @media (prefers-reduced-motion: reduce) {
    /* Not .chip: app.css already has a global .chip with padding, which stretched these
     into pills. */
  .wchip { transition: none; }
  }
</style>
