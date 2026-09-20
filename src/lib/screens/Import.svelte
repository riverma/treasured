<script lang="ts">
  // Bringing people in from a file.
  //
  // Two rules here are not preferences.
  //
  // One: the file is parsed in this browser and never uploaded. connect-src 'none' makes
  // that structural rather than a promise, and the screen says so where it can be read.
  //
  // Two: nothing is selected by default and nothing is kept that was not ticked. Importing
  // an address book wholesale is contact mining with a friendly label on it, and the whole
  // premise of this app is a small number of people you actually chose.

  import { parseContacts, type Candidate } from '$lib/core/importer';
  import { data } from '$lib/store/data.svelte';
  import { app } from '$lib/store/app.svelte';
  import { router } from '$lib/store/router.svelte';

  const PATHS = [
    {
      title: 'One person, from this iPhone',
      steps: 'Contacts → the person → Share Contact → Save to Files → come back here → Choose file.'
    },
    {
      title: 'Everyone, from a Mac',
      steps: 'Contacts → select all → File → Export → Export vCard… → AirDrop it to this phone → Save to Files.'
    },
    {
      title: 'Everyone, from iCloud',
      steps: 'iCloud.com → Contacts → select → the gear → Export vCard….'
    },
    {
      title: 'From Google Contacts',
      steps: 'contacts.google.com → Export → vCard, or Google CSV.'
    }
  ];

  let found = $state<Candidate[]>([]);
  let picked = $state<Set<string>>(new Set());
  let filename = $state('');
  let read = $state(false);

  async function choose(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    filename = file.name;
    const text = await file.text();
    found = parseContacts(text, file.name);
    // Nothing ticked. This is the rule, not a default anyone should change.
    picked = new Set();
    read = true;
  }

  function toggle(key: string): void {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key); else next.add(key);
    picked = next;
  }

  let keeping = $state(false);

  async function keep(): Promise<void> {
    if (keeping) return;
    keeping = true;
    const chosen = found.filter((c) => picked.has(c.key));
    try {
      for (const c of chosen) {
        await data.addPerson({
        fullName: c.fullName,
        name: c.name,
        essence: '',
        birthday: c.birthday ?? null,
          contact: { hasContact: !!(c.phone || c.email), phone: c.phone, email: c.email }
        });
      }
    } catch (e) {
      console.error('could not import everyone', e);
      app.say('Some of those did not save. Nothing was sent anywhere — try again.');
      keeping = false;
      return;
    }
    // Everything parsed but not ticked goes now, rather than lingering in memory.
    found = [];
    picked = new Set();
    read = false;
    keeping = false;
    app.say(chosen.length === 1 ? 'One person added.' : chosen.length + ' people added.');
    router.root('/deck');
  }

  function discard(): void {
    found = [];
    picked = new Set();
    read = false;
    filename = '';
  }
</script>

<div class="screen">
  <div class="hdr">
    <button class="back ah-small-caps" onclick={() => router.back('/deck')}>Back</button>
  </div>

  <div class="scroll" style="--scroll-tail: 40px">
    <h1 class="ah-display-m head">Bring people in</h1>

    {#if !read}
      <p class="ah-body-serif intro">
        Safari cannot read your address book, and Treasured would not ask it to. Export a
        contact file and choose it here — it is read on this device and never sent anywhere.
      </p>

      <label class="btn wide choose">
        Choose a file
        <input
          type="file"
          accept=".vcf,text/vcard,text/x-vcard,.csv,text/csv"
          onchange={choose}
        />
      </label>

      <span class="ah-micro-caps lbl">Where to get one</span>
      {#each PATHS as path (path.title)}
        <div class="card list way">
          <span class="ah-title-m">{path.title}</span>
          <p class="ah-body steps">{path.steps}</p>
        </div>
      {/each}

      <p class="ah-caption foot">
        Or add someone by hand — you only need a name.
      </p>
      <button class="btn ghost wide" onclick={() => router.go('/onboarding/person')}>Add by hand</button>
    {:else}
      <p class="ah-body-serif intro">
        {found.length} {found.length === 1 ? 'person' : 'people'} in {filename}. Tick the ones
        you want to keep — the rest are forgotten when you leave this screen.
      </p>

      {#if found.length === 0}
        <p class="ah-caption foot">
          Nothing readable in that file. A .vcf exported from Contacts is the surest bet.
        </p>
      {:else}
        <div class="rows">
          {#each found as c (c.key)}
            {@const on = picked.has(c.key)}
            <button class="row" class:on onclick={() => toggle(c.key)}>
              <span class="col">
                <span class="ah-title-m">{c.fullName}</span>
                <span class="ah-caption sub">{c.phone ?? c.email ?? ''}</span>
              </span>
              <span class="ah-micro-caps mark">{on ? 'Keep' : 'Skip'}</span>
            </button>
          {/each}
        </div>
      {/if}

      <div class="go">
        <button class="btn wide" onclick={keep} disabled={picked.size === 0 || keeping}>
          {picked.size === 0 ? 'Nobody selected' : 'Keep ' + picked.size}
        </button>
        <!-- Equal weight: changing your mind is not the lesser choice. -->
        <button class="btn ghost wide" onclick={discard}>Discard the file</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .head { margin: 6px 0 10px; color: var(--text-heading); }
  .intro { color: var(--text-body); margin: 0 0 18px; }
  .lbl { color: var(--text-muted); display: block; margin: 22px 0 8px; }

  .choose { position: relative; overflow: hidden; text-align: center; }
  .choose input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

  .way { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
  .steps { color: var(--text-secondary); margin: 0; }

  .rows { display: flex; flex-direction: column; gap: 8px; }
  .row {
    display: flex; align-items: center; gap: 12px; text-align: left;
    padding: 14px 16px; border: none; cursor: pointer;
    border-radius: var(--radius-lg);
    background: var(--surface-sunk); color: var(--text-heading);
  }
  .row.on { background: var(--text-heading); color: var(--text-inverse); }
  .col { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sub { opacity: 0.7; }
  .mark { opacity: 0.65; flex-shrink: 0; }

  .go { display: flex; flex-direction: column; gap: 8px; margin-top: 22px; }
  .foot { color: var(--text-muted); margin: 16px 0 8px; text-align: center; }
</style>
