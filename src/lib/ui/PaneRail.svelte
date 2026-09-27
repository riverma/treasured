<script lang="ts">
  // Where you are, and the two places you are not.
  //
  // This replaces three 6px dots that were not buttons, were not focusable, announced
  // themselves to screen readers as tabs that could not be activated, and sat at 1.3:1
  // against the canvas. They were the entire wayfinding system, and a first-time user had
  // no way to learn that Deck and Connections existed at all.
  //
  // Words rather than a mark, because Ahimsa ships no icon set and refuses emoji — and
  // because a word is the thing that actually teaches someone the screen is there. It is a
  // three-item pager, not the tab bar the screens spec refuses: there is one surface with
  // three panes, and this says which one you are looking at.

  interface Props {
    labels: readonly string[];
    index: number;
    onpick: (i: number) => void;
    /** The id of each pane section, for aria-controls. */
    ids: readonly string[];
  }

  const { labels, index, onpick, ids }: Props = $props();

  let rail = $state<HTMLElement | null>(null);

  function onkeydown(e: KeyboardEvent): void {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.min(labels.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    onpick(next);
    // move focus with the selection, so arrowing does not leave focus behind
    queueMicrotask(() => {
      rail?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
    });
  }
</script>

<div class="rail" role="tablist" aria-label="Screens" tabindex="-1" bind:this={rail} {onkeydown}>
  {#each labels as label, i (label)}
    <button
      class="tab"
      class:on={i === index}
      role="tab"
      aria-selected={i === index}
      aria-controls={ids[i]}
      tabindex={i === index ? 0 : -1}
      onclick={() => onpick(i)}
    >
      <span class="ah-micro-caps">{label}</span>
      <span class="mark" aria-hidden="true"></span>
    </button>
  {/each}
</div>

<style>
  .rail { display: flex; align-items: center; justify-content: center; gap: 4px; }

  .tab {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    /* the painted label is small; the target is not */
    padding: 12px 10px calc(var(--safe-bottom) + 10px);
    color: var(--text-faint);
    transition: color var(--duration-base) var(--ease-standard);
  }
  .tab.on { color: var(--text-heading); }

  /* The rule under the current pane does what the active dot used to, at a contrast that
     can actually be seen. */
  .mark {
    width: 4px; height: 4px; border-radius: var(--radius-full);
    background: currentColor; opacity: 0.35;
    transition: width var(--duration-base) var(--ease-standard), opacity var(--duration-base) var(--ease-standard);
  }
  .tab.on .mark { width: 18px; opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .tab, .mark { transition: none; }
  }
</style>
