<script lang="ts">
  // The bottom sheet, and the only one. Defect 9: the mockup gave a visible close button to
  // PlanSheet alone, and COMPLIANCE requires an exit in addition to swipe-down and the
  // scrim. Putting it in the shared chrome is what makes omitting it structurally
  // impossible rather than a thing to remember in review.
  //
  // Three ways out, always: the scrim, the grab handle, and Close. Never a trap.

  import type { Snippet } from 'svelte';
  import { app } from '$lib/store/app.svelte';

  interface Props {
    open: boolean;
    title: string;
    /** Sits under the title in the quiet register. */
    note?: string;
    onclose: () => void;
    children: Snippet;
  }

  const { open, title, note, onclose, children }: Props = $props();

  let panel = $state<HTMLElement | null>(null);

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onclose();
  }

  $effect(() => {
    if (!open || !panel) return;
    // Focus the panel rather than the first control: landing on a link would let a stray
    // Return fire an action nobody chose.
    panel.focus({ preventScroll: true });
  });
</script>

<svelte:window on:keydown={open ? onkeydown : undefined} />

{#if open}
  <!-- The scrim dismisses. It is a button so it is reachable without a pointer. -->
  <button class="scrim" onclick={onclose} aria-label="Close {title}" tabindex="-1"></button>

  <div
    class="sheet"
    class:still={app.reduceMotion}
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
    bind:this={panel}
  >
    <div class="handle" aria-hidden="true"></div>

    <div class="head">
      <div class="grow">
        <div class="ah-small-caps muted">{title}</div>
        {#if note}<div class="ah-caption soft">{note}</div>{/if}
      </div>
      <button class="close ah-small-caps" onclick={onclose}>Close</button>
    </div>

    <div class="body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: absolute; inset: 0; z-index: 8;
    border: none; padding: 0;
    background: var(--glass-scrim);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    animation: fade var(--duration-base) var(--ease-standard);
  }

  .sheet {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 9;
    max-height: 86%;
    display: flex; flex-direction: column;
    background: var(--surface-elevated);
    border-radius: var(--radius-3xl) var(--radius-3xl) 0 0;
    box-shadow: var(--shadow-sheet);
    /* the home indicator sits under this on a modern iPhone */
    padding: 10px var(--gutter) calc(var(--safe-bottom) + 20px);
    animation: rise var(--duration-slower) var(--ease-emphasized);
    outline: none;
  }

  .handle {
    width: 36px; height: 4px; margin: 0 auto 12px;
    border-radius: var(--radius-full);
    background: var(--border-medium);
  }

  .head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
  .grow { flex: 1; min-width: 0; }
  .muted { color: var(--text-muted); }
  .soft { color: var(--text-secondary); margin-top: 2px; }

  /* Equal weight, not a ghost. Leaving is as legitimate as staying. */
  .close {
    flex-shrink: 0;
    border: none; cursor: pointer;
    background: var(--surface-sunk);
    color: var(--text-secondary);
    padding: 8px 14px;
    border-radius: var(--radius-full);
    transition: transform var(--duration-fast) var(--ease-standard);
  }
  .close:active { transform: scale(0.97); }

  .body { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; }

  @keyframes rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }

  /* Motion mimics settling, not arrival. With reduced motion it simply is where it is. */
  .sheet.still { animation: none; }
  @media (prefers-reduced-motion: reduce) {
    .sheet, .scrim { animation: none; }
  }
</style>
