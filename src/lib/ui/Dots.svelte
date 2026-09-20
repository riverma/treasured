<script lang="ts">
  // Three dots. Which pane you are on, and nothing else.
  //
  // Not a progress bar and not a count of anything: Ahimsa's ProgressDots carry no numbers,
  // because a number invites you to complete it.

  interface Props { count: number; index: number; labels: readonly string[] }
  const { count, index, labels }: Props = $props();
</script>

<div class="dots" role="tablist" aria-label="Screens">
  {#each Array.from({ length: count }) as _, i (i)}
    <span class="dot" class:on={i === index} role="tab" aria-selected={i === index} aria-label={labels[i] ?? ''}></span>
  {/each}
</div>

<style>
  .dots {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 6px 0 calc(var(--safe-bottom) + 10px);
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: var(--radius-full);
    background: var(--border-strong);
    opacity: 0.45;
    transition: opacity var(--duration-base) var(--ease-standard), width var(--duration-base) var(--ease-standard);
  }
  .dot.on { opacity: 1; width: 18px; }

  @media (prefers-reduced-motion: reduce) { .dot { transition: none; } }
</style>
