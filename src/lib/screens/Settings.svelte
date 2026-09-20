<script lang="ts">
  // Settings, and the place your data leaves from.

  import { backupFilename, buildBackup, parseBackup, BackupError } from '$lib/core/backup';
  import { data } from '$lib/store/data.svelte';
  import { app } from '$lib/store/app.svelte';
  import { router } from '$lib/store/router.svelte';

  let confirmingReset = $state(false);

  function save(): void {
    const text = buildBackup($state.snapshot(data.slice), __APP_VERSION__);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    void data.setPrefs({ lastBackup: new Date().toISOString() });
    app.say('Backup saved.');
  }

  async function restore(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const slice = parseBackup(await file.text());
      await data.reset(slice);
      app.say('Restored.');
      router.root('/today');
    } catch (err) {
      app.say(err instanceof BackupError ? err.message : 'That file could not be read.');
    }
  }

  async function wipe(): Promise<void> {
    await data.reset();
    confirmingReset = false;
    app.say('Everything here is gone.');
    router.root('/today');
  }

  const lastBackup = $derived(
    data.prefs.lastBackup
      ? new Date(data.prefs.lastBackup).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
      : null
  );
</script>

<div class="screen">
  <div class="hdr">
    <button class="back ah-small-caps" onclick={() => router.back('/today')}>Back</button>
  </div>

  <div class="scroll" style="--scroll-tail: 40px">
    <h1 class="ah-display-m head">Settings</h1>

    <span class="ah-micro-caps lbl">Your data</span>
    <div class="card list group">
      <p class="ah-body note">
        Everything lives on this device. A browser will eventually clear storage for a site
        you have not opened in a while — keeping a file somewhere is the only real backup.
      </p>
      <button class="btn wide" onclick={save}>Save a backup file</button>
      <label class="btn ghost wide pick">
        Restore from a file
        <input type="file" accept=".json,application/json" onchange={restore} />
      </label>
      {#if lastBackup}
        <span class="ah-caption soft">Last saved {lastBackup}.</span>
      {/if}
    </div>

    <span class="ah-micro-caps lbl">Phone numbers</span>
    <div class="card list group">
      <label class="field">
        <span class="ah-caption soft">Country code for numbers written the local way</span>
        <input
          class="ah-body code"
          inputmode="numeric"
          value={data.slice.countryCode}
          oninput={(e) => data.setCountryCode((e.currentTarget as HTMLInputElement).value)}
        />
      </label>
    </div>

    <span class="ah-micro-caps lbl">This app</span>
    <div class="card list group">
      <button class="btn ghost wide" onclick={() => router.go('/import')}>Bring people in</button>
      <button class="btn ghost wide" onclick={() => router.go('/about')}>About Treasured</button>
      <button class="btn ghost wide" onclick={() => router.go('/install')}>Add to Home Screen</button>
    </div>

    <span class="ah-micro-caps lbl">Start over</span>
    <div class="card list group">
      {#if !confirmingReset}
        <button class="btn ghost wide" onclick={() => (confirmingReset = true)}>Remove everything</button>
      {:else}
        <p class="ah-body note">
          This removes every person, ring and reading on this device. If you have not saved
          a backup, there is no way back.
        </p>
        <button class="btn wide" onclick={wipe}>Yes, remove it all</button>
        <!-- Equal weight. Changing your mind is not the lesser choice. -->
        <button class="btn ghost wide" onclick={() => (confirmingReset = false)}>Keep it</button>
      {/if}
    </div>

    <p class="ah-micro-caps version">Version {__APP_VERSION__}</p>
  </div>
</div>

<style>
  .head { margin: 6px 0 16px; color: var(--text-heading); }
  .lbl { color: var(--text-muted); display: block; margin: 22px 0 8px; }
  .group { display: flex; flex-direction: column; gap: 10px; }
  .note { color: var(--text-secondary); margin: 0; }
  .soft { color: var(--text-muted); }

  .pick { position: relative; overflow: hidden; text-align: center; }
  .pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .code {
    border: none; background: none; width: 6ch;
    border-bottom: 1px solid var(--border-medium);
    color: var(--text-heading); padding: 6px 0;
  }

  .version { color: var(--text-faint); text-align: center; margin: 32px 0 0; }
</style>
