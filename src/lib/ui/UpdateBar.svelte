<script lang="ts">
  // A new version is ready.
  //
  // Never an automatic reload: this app has text fields, and taking the page out from under
  // someone mid-sentence to deliver an improvement is the sort of thing Ahimsa exists to
  // refuse. It waits, and it can be dismissed.

  import { app } from '$lib/store/app.svelte';

  let dismissed = $state(false);
</script>

{#if app.updateReady && !dismissed}
  <div class="bar" role="status">
    <span class="ah-body grow">A newer Treasured is ready.</span>
    <button class="btn sm" onclick={() => location.reload()}>Reload</button>
    <button class="btn sm ghost" onclick={() => (dismissed = true)}>Later</button>
  </div>
{/if}

<style>
  .bar {
    position: absolute; left: var(--gutter); right: var(--gutter);
    bottom: calc(var(--safe-bottom) + 52px);
    z-index: 7;
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px;
    border-radius: var(--radius-lg);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-md);
  }
  .grow { flex: 1; min-width: 0; color: var(--text-body); }
</style>
