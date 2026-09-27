<script lang="ts">
  // A newer version has finished downloading and is waiting for the old one to let go.
  //
  // It sits at the top because that is where a notice belongs when the bottom of the screen
  // is where the app's own controls live — and because an installed app has no browser
  // chrome to put it in.
  //
  // Never an automatic reload: this app has text fields, and taking the page out from under
  // someone mid-sentence to deliver an improvement is the sort of thing Ahimsa refuses. It
  // waits, and it can be dismissed.

  import { app } from '$lib/store/app.svelte';
</script>

{#if app.updateReady && !app.updateDismissed}
  <div class="bar" role="status">
    <span class="ah-caption grow">A newer Treasured is ready.</span>
    <button class="btn sm" onclick={() => app.applyUpdate()} disabled={app.updating}>
      {app.updating ? 'Updating…' : 'Update'}
    </button>
    <button class="later ah-micro-caps" onclick={() => (app.updateDismissed = true)}>Later</button>
  </div>
{/if}

<style>
  .bar {
    position: absolute;
    left: 12px; right: 12px;
    top: calc(var(--safe-top) + 8px);
    z-index: 46;
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px 10px 16px;
    border-radius: var(--radius-lg);
    background: var(--glass-overlay-strong);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: var(--shadow-md);
  }
  .grow { flex: 1; min-width: 0; color: var(--text-heading); }

  /* Equal weight, not a dismissal to be ashamed of. */
  .later {
    flex-shrink: 0; border: none; cursor: pointer;
    background: var(--surface-sunk); color: var(--text-secondary);
    padding: 8px 12px; border-radius: var(--radius-full);
  }
</style>
