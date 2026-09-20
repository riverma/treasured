<script lang="ts">
  // How does it feel between you, right now?
  //
  // Sixteen words in a four-by-four grid, each placed by hue. No faces, no emoji, no
  // five-point scale — a scale would invite you to score a friendship, and a number is
  // exactly the thing Ahimsa refuses to put between two people.
  //
  // There is no "correct" answer and nothing is graded, so the cool words sit in the same
  // grid as the warm ones, at the same size, in the same weight.

  import Sheet from '$lib/ui/Sheet.svelte';
  import { sentiments, sentimentKeys, tintVar } from '$lib/core/sentiments';
  import { data } from '$lib/store/data.svelte';
  import type { Person, SentimentKey } from '$lib/core/types';

  interface Props {
    open: boolean;
    person: Person | undefined;
    onclose: () => void;
  }

  const { open, person, onclose }: Props = $props();

  function choose(key: SentimentKey): void {
    if (!person) return;
    void data.recordSentiment(person.id, key);
    onclose();
  }
</script>

<Sheet {open} title="How does it feel?" note={person?.fullName} {onclose}>
  <div class="grid">
    {#each sentimentKeys as key (key)}
      <button
        class="tile"
        class:current={person?.recentSentiment === key}
        onclick={() => choose(key)}
      >
        <span class="tint" style="background: {tintVar(key, 400)}"></span>
        <span class="ah-caption label">{sentiments[key].label}</span>
      </button>
    {/each}
  </div>

  <p class="ah-caption note">Whatever you pick is just what is true today.</p>
</Sheet>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px 8px;
    padding: 4px 0 8px;
  }

  .tile {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: none; border: none; padding: 8px 2px; cursor: pointer;
    border-radius: var(--radius-lg);
    transition: transform var(--duration-fast) var(--ease-standard);
  }
  .tile:active { transform: scale(0.97); }

  /* The one already recorded is marked, not celebrated. */
  .tile.current { background: var(--surface-sunk); }

  .tint {
    width: 26px; height: 26px;
    border-radius: var(--radius-full);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  }

  .label { color: var(--text-secondary); line-height: 1.2; }
  .tile.current .label { color: var(--text-heading); }

  .note { color: var(--text-muted); text-align: center; margin: 6px 0 0; }

  @media (prefers-reduced-motion: reduce) {
    .tile { transition: none; }
  }
</style>
