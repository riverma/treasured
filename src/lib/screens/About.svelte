<script lang="ts">
  // About. Also where the version lives, at the bottom, quietly — the hub's release
  // discipline asks that the string in package.json, the CHANGELOG and the app agree, and
  // __APP_VERSION__ is replaced at build time from package.json so they cannot drift.

  import { router } from '$lib/store/router.svelte';

  const version = __APP_VERSION__;
</script>

<div class="screen">
  <div class="hdr">
    <button class="back ah-small-caps" onclick={() => router.back()}>Back</button>
  </div>

  <div class="scroll" style="--scroll-tail: 32px">
    <h1 class="ah-display-m head">Treasured</h1>

    <p class="ah-body-serif body">
      A wallet for the people you love. One card each, a note on how things stand, and a
      nudge toward the next small kindness.
    </p>

    <p class="ah-body-serif body">
      Your people stay on this device. Nothing is ever uploaded — there is no account to
      make and no server to send anything to.
    </p>

    <div class="rule"></div>

    <dl class="facts">
      <div>
        <dt class="ah-micro-caps faint">Licence</dt>
        <dd class="ah-body">
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">
            AGPL-3.0-or-later
          </a>
        </dd>
      </div>
      <div>
        <dt class="ah-micro-caps faint">Source</dt>
        <dd class="ah-body">
          <a href="https://github.com/riverma/treasured" target="_blank" rel="noopener noreferrer">
            github.com/riverma/treasured
          </a>
        </dd>
      </div>
      <div>
        <dt class="ah-micro-caps faint">Design</dt>
        <dd class="ah-body">Ahimsa</dd>
      </div>
    </dl>

    <div class="version">
      <span class="ah-micro-caps faint">Version {version}</span>
    </div>
  </div>
</div>

<style>
  /* .hdr and .back come from app.css, shared with every other screen. */
  .head { margin: 6px 0 14px; color: var(--text-heading); }
  .body { margin: 0 0 14px; color: var(--text-body); }
  .rule { height: 1px; background: var(--border-subtle); margin: 8px 0 20px; }

  .facts { margin: 0; display: flex; flex-direction: column; gap: 14px; }
  .facts div { display: flex; flex-direction: column; gap: 3px; }
  .facts dt { color: var(--text-faint); }
  .facts dd { margin: 0; color: var(--text-body); }
  .faint { color: var(--text-faint); }

  /* Quiet, at the bottom, where a version belongs. */
  .version { margin-top: 36px; text-align: center; }
</style>
