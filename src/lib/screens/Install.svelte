<script lang="ts">
  // The #install contract every app on the hub honours: arrive at that hash, get this.
  //
  // For Treasured this is not polish. A browser clears storage for sites you have not
  // opened in a while, and an installed app is exempt — so adding it to the Home Screen is
  // what keeps the data. That is said plainly rather than dressed up as a feature.

  import { app } from '$lib/store/app.svelte';
  import { data } from '$lib/store/data.svelte';
  import { router } from '$lib/store/router.svelte';

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  function dismiss(): void {
    void data.setPrefs({ installDismissed: true });
    router.back('/today');
  }
</script>

<div class="screen">
  <div class="hdr">
    <button class="back ah-small-caps" onclick={() => router.back('/today')}>Back</button>
  </div>

  <div class="scroll" style="--scroll-tail: 40px">
    <h1 class="ah-display-m head">Keep it on your Home Screen</h1>

    {#if app.standalone}
      <p class="ah-body-serif body">
        You have already done this — Treasured is running from your Home Screen. Your data
        is as safe here as the device is.
      </p>
      <button class="btn wide" onclick={() => router.back('/today')}>Good</button>
    {:else}
      <p class="ah-body-serif body">
        Treasured keeps everything on this device and nothing on a server. The catch is that
        browsers clear storage for sites you have not visited in a while. An app on your
        Home Screen is left alone — so this is how your people stay.
      </p>

      {#if isIOS}
        <ol class="steps">
          <li class="ah-body">Tap the Share button at the bottom of Safari.</li>
          <li class="ah-body">Scroll down and choose <strong>Add to Home Screen</strong>.</li>
          <li class="ah-body">Tap Add, then open Treasured from the new icon.</li>
        </ol>
        <p class="ah-caption note">
          It has to be Safari — other browsers on iOS cannot add to the Home Screen.
        </p>
      {:else}
        <ol class="steps">
          <li class="ah-body">Open your browser's menu.</li>
          <li class="ah-body">Choose <strong>Install app</strong>, or <strong>Add to Home screen</strong>.</li>
          <li class="ah-body">Open Treasured from the new icon.</li>
        </ol>
      {/if}

      <div class="go">
        <button class="btn wide" onclick={() => router.back('/today')}>Done</button>
        <!-- Dismissed permanently, and never asked again. -->
        <button class="btn ghost wide" onclick={dismiss}>Don't remind me</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .head { margin: 6px 0 14px; color: var(--text-heading); }
  .body { color: var(--text-body); margin: 0 0 18px; }
  .steps { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; color: var(--text-body); }
  .note { color: var(--text-muted); margin: 16px 0 0; }
  .go { display: flex; flex-direction: column; gap: 8px; margin-top: 26px; }
</style>
