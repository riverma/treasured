<script lang="ts">
  // A card with two faces.
  //
  // The usual two-stacked-faces-with-backface-visibility trick does not survive contact
  // with this card: the front carries backdrop-filter (the monogram, the action orbs), a
  // filtered element gets its own rendering surface, and the 3D context flattens — so the
  // mirrored front shows through instead of the back, and text on the back stops painting.
  //
  // So only one face is ever in the DOM. The card rotates a full 180°, and the content is
  // swapped at the halfway point, where the card is edge-on and there is nothing to see.
  // The back's content is counter-rotated so it reads the right way round.

  import type { Snippet } from 'svelte';
  import { app } from '$lib/store/app.svelte';

  interface Props {
    flipped: boolean;
    onflip: () => void;
    /** Announced on the control that turns the card over. */
    label: string;
    front: Snippet;
    back: Snippet;
  }

  const { flipped, onflip, label, front, back }: Props = $props();

  /** Which face is rendered. Lags `flipped` by half a turn. */
  let showBack = $state(false);

  $effect(() => {
    const target = flipped;
    if (app.reduceMotion) { showBack = target; return; }
    // half of --duration-slow (400ms), i.e. the moment the card is edge-on
    const timer = setTimeout(() => { showBack = target; }, 200);
    return () => clearTimeout(timer);
  });
</script>

<div class="scene">
  <div class="card" class:flipped class:still={app.reduceMotion}>
    <div class="content" class:mirrored={showBack}>
      {#if showBack}
        {@render back()}
      {:else}
        {@render front()}
      {/if}
    </div>
  </div>

  <!-- The turn is a real control rather than a tap handler on the card, so it is reachable
       without a pointer and announces what it does. -->
  <button class="turn ah-small-caps" onclick={onflip} aria-pressed={flipped}>{label}</button>
</div>

<style>
  .scene { perspective: 1400px; display: flex; flex-direction: column; align-items: center; width: 100%; }

  .card {
    width: 100%;
    transform-style: preserve-3d;
    transition: transform var(--duration-slow) var(--ease-emphasized);
  }
  .card.flipped { transform: rotateY(180deg); }

  /* Counter-rotation, so the back is not a mirror image of itself. */
  .content { transform: rotateY(0deg); }
  .content.mirrored { transform: rotateY(180deg); }

  .turn {
    margin-top: 16px;
    background: none; border: none; cursor: pointer;
    color: var(--text-muted);
    padding: 8px 12px;
    border-radius: var(--radius-full);
    transition: color var(--duration-fast) var(--ease-standard);
  }
  .turn:active { color: var(--text-secondary); }

  /* Reduced motion: no rotation at all, and the swap is immediate. Nothing spins, nothing
     is mirrored, and the card simply shows its other side. */
  .card.still, .card.still.flipped { transform: none; transition: none; }
  .card.still .content, .card.still .content.mirrored { transform: none; }

  @media (prefers-reduced-motion: reduce) {
    .card, .card.flipped { transform: none; transition: none; }
    .content, .content.mirrored { transform: none; }
  }
</style>
