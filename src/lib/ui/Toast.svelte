<script lang="ts">
  // A quiet word, never an alert. Ahimsa has no red banner and no error state that shouts;
  // if something did not work, the app says so in the same voice it says anything else.
  import { app } from '$lib/store/app.svelte';
</script>

{#if app.toast}
  <div class="toast ah-body" role="status">{app.toast}</div>
{/if}

<style>
  .toast {
    position: absolute; left: 50%; transform: translateX(-50%);
    bottom: calc(var(--safe-bottom) + 96px);
    z-index: 12;
    max-width: calc(100% - var(--gutter) * 2);
    padding: 12px 18px;
    border-radius: var(--radius-full);
    background: var(--surface-inverse);
    color: var(--text-inverse);
    box-shadow: var(--shadow-md);
    animation: rise var(--duration-base) var(--ease-standard);
  }
  @keyframes rise { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }
  @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
</style>
