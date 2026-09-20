<script lang="ts">
  // One card in the deck. Its whole job is to sit at a depth.
  //
  // `offset` is how far this card is from the one in front: 0 is the active card, negative
  // is behind-left, positive behind-right. Everything else follows from that, so the deck
  // itself does no maths.

  import { gradientCss } from '$lib/data/palettes';
  import { sinceText } from '$lib/core/time';
  import type { Person } from '$lib/core/types';

  interface Props {
    person: Person;
    offset: number;
    onselect: () => void;
  }

  const { person, offset, onselect }: Props = $props();

  const abs = $derived(Math.abs(offset));
  const p = $derived(person.palette);

  // Cards more than two deep are not drawn at all: they would be a smear behind the
  // shoulders of the others, and every one costs a gradient and a shadow to paint.
  const hidden = $derived(abs > 2);

  const transform = $derived(
    `translateX(${offset * 58}%) translateZ(${-abs * 110}px) rotateY(${offset * -14}deg) scale(${1 - abs * 0.06})`
  );
</script>

<button
  class="slot"
  class:active={offset === 0}
  style="transform: {transform}; z-index: {10 - abs}; opacity: {hidden ? 0 : 1 - abs * 0.18}; pointer-events: {offset === 0 ? 'auto' : 'none'}"
  aria-hidden={offset !== 0}
  tabindex={offset === 0 ? 0 : -1}
  onclick={onselect}
>
  <span class="card" style="background: {gradientCss(p)}; color: {p.fontColor}">
    <span class="mono ah-display-m" style="color: {p.fontColor}">{person.initial}</span>
    <span class="ah-title-l name">{person.name}</span>
    {#if person.essence}
      <span class="ah-caption essence" style="color: {p.softColor}">{person.essence}</span>
    {/if}
    <span class="ah-micro-caps" style="color: {p.softColor}">{sinceText(person.lastSeenAt)}</span>
  </span>
</button>

<style>
  .slot {
    position: absolute;
    top: 50%; left: 50%;
    width: 220px; height: 340px;
    margin: -170px 0 0 -110px;
    background: none; border: none; padding: 0; cursor: pointer;
    transform-style: preserve-3d;
    transition:
      transform var(--duration-slower) var(--ease-emphasized),
      opacity var(--duration-slower) var(--ease-standard);
  }

  .card {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; text-align: center;
    width: 100%; height: 100%;
    padding: 24px 18px;
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-lg);
  }

  .mono {
    width: 76px; height: 76px; margin-bottom: 8px;
    display: grid; place-items: center;
    border-radius: var(--radius-full);
    background: var(--glass-overlay);
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.5);
    font-style: italic; font-weight: 300;
  }

  .name { font-weight: 400; }
  .essence { max-width: 20ch; }

  /* Motion mimics settling, not pouncing: no bounce, and the depth change does the work. */
  @media (prefers-reduced-motion: reduce) {
    .slot { transition: opacity var(--duration-base) var(--ease-standard); }
  }
</style>
