<script lang="ts">
  // Editing someone.
  //
  // Until this screen existed a person was write-once: a mistyped name was permanent unless
  // you deleted them and started over, and deleting was only reachable from the dev harness.
  // So this is the first place in the app where you can correct something about a person, and
  // the first production path to removing one.
  //
  // Save and Cancel carry the same metrics, and so do Remove and Keep. Backing out of a
  // change is not the lesser choice, and neither is deciding you do not want to.

  import { app } from '$lib/store/app.svelte';
  import { data } from '$lib/store/data.svelte';
  import { router } from '$lib/store/router.svelte';
  import { gradientCss, palette, PALETTE_KEYS } from '$lib/data/palettes';
  import { parseBirthday } from '$lib/core/time';
  import type { PaletteKey, RelationKey } from '$lib/core/types';

  const RELATIONS: RelationKey[] = ['friend', 'family', 'romantic', 'professional'];

  const person = $derived(data.person(router.route.id));

  let fullName = $state('');
  let essence = $state('');
  let since = $state('');
  let birthday = $state('');
  let phone = $state('');
  let email = $state('');
  let relations = $state<RelationKey[]>(['friend']);
  let paletteKey = $state<PaletteKey>('rose');

  let newTreasure = $state('');
  let newQuote = $state('');
  let loadedFor = $state<string | null>(null);
  let saving = $state(false);
  let confirmingRemove = $state(false);

  // Fill the form once per person, rather than on every keystroke-driven re-render.
  $effect(() => {
    const p = person;
    if (!p || loadedFor === p.id) return;
    fullName = p.fullName;
    essence = p.essence;
    since = p.since;
    birthday = p.birthday ?? '';
    phone = p.contact.phone ?? '';
    email = p.contact.email ?? '';
    relations = [...p.relations];
    paletteKey = p.palette.key;
    loadedFor = p.id;
  });

  const named = $derived(fullName.trim().length > 0);
  const preview = $derived(palette(paletteKey));

  function toggleRelation(r: RelationKey): void {
    relations = relations.includes(r)
      ? (relations.length > 1 ? relations.filter((x) => x !== r) : relations)
      : [...relations, r];
  }

  async function save(): Promise<void> {
    const p = person;
    if (!p || !named || saving) return;
    saving = true;
    try {
      await data.updatePerson(p.id, {
        fullName: fullName.trim(),
        name: fullName.trim().split(' ')[0] ?? fullName.trim(),
        essence,
        since,
        // Accepts "Aug 14" and "1990-08-14" alike; anything unreadable clears rather than
        // silently storing something that will not render.
        birthday: birthday.trim() ? parseBirthday(birthday) : null,
        relations,
        contact: { ...p.contact, phone, email },
        paletteKey
      });
      app.say('Saved.');
      router.back('/today');
    } catch (e) {
      console.error('could not save this person', e);
      app.say('That did not save. Your changes are still here — try once more.');
    } finally {
      saving = false;
    }
  }

  async function addNote(kind: 'treasures' | 'quotes'): Promise<void> {
    const p = person;
    if (!p) return;
    const text = kind === 'treasures' ? newTreasure : newQuote;
    if (!text.trim()) return;
    try {
      await data.addNote(p.id, kind, text);
      if (kind === 'treasures') newTreasure = ''; else newQuote = '';
    } catch {
      app.say('That did not save. Try once more.');
    }
  }

  async function remove(): Promise<void> {
    const p = person;
    if (!p) return;
    try {
      await data.deletePerson(p.id);
      if (data.activePersonId === p.id) data.activePersonId = null;
      app.say(p.name + ' is no longer here.');
      router.root('/deck');
    } catch (e) {
      console.error('could not remove this person', e);
      app.say('That did not go through. Nothing was changed.');
      confirmingRemove = false;
    }
  }
</script>

<div class="screen">
  <div class="hdr">
    <button class="back ah-small-caps" onclick={() => router.back('/today')}>Back</button>
  </div>

  <div class="scroll" style="--scroll-tail: 40px">
    {#if !person}
      <p class="ah-body-serif soft centred">
        That person is not here any more.
      </p>
      <button class="btn ghost wide" onclick={() => router.root('/deck')}>Back to your people</button>
    {:else}
      <h1 class="ah-display-m head">Edit</h1>

      <label class="field">
        <span class="ah-micro-caps lbl">Name</span>
        <input class="ah-heading-m nameInput" bind:value={fullName} placeholder="Their name" />
      </label>

      <label class="field spaced">
        <span class="ah-micro-caps lbl">In one line</span>
        <input class="ah-body-serif essenceInput" bind:value={essence} placeholder="a line about who they are" />
      </label>

      <span class="ah-micro-caps lbl spaced">How you know them</span>
      <div class="wrap">
        {#each RELATIONS as r (r)}
          <button class="chip" class:selected={relations.includes(r)} onclick={() => toggleRelation(r)}>{r}</button>
        {/each}
      </div>

      <label class="field spaced">
        <span class="ah-micro-caps lbl">Their number</span>
        <input class="ah-body plain" bind:value={phone} inputmode="tel" placeholder="Optional" />
      </label>

      <label class="field spaced">
        <span class="ah-micro-caps lbl">Their email</span>
        <input class="ah-body plain" bind:value={email} inputmode="email" placeholder="Optional" />
      </label>

      <label class="field spaced">
        <span class="ah-micro-caps lbl">Birthday</span>
        <input class="ah-body plain" bind:value={birthday} placeholder="Aug 14, or 1990-08-14" />
      </label>

      <label class="field spaced">
        <span class="ah-micro-caps lbl">Known since</span>
        <input class="ah-body plain" bind:value={since} placeholder="2014, or birth" />
      </label>

      <span class="ah-micro-caps lbl spaced">Treasures</span>
      <p class="ah-caption hint">The small true things you would otherwise forget.</p>
      {#if person.treasures.length}
        <ul class="notes">
          {#each person.treasures as t (t.id)}
            <li>
              <span class="ah-body grow">{t.content}</span>
              <button class="drop ah-micro-caps" onclick={() => data.removeNote(person.id, 'treasures', t.id)}>Remove</button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="addrow">
        <input class="ah-body plain grow" bind:value={newTreasure} placeholder="Add one" />
        <button class="btn sm" onclick={() => addNote('treasures')} disabled={!newTreasure.trim()}>Add</button>
      </div>

      <span class="ah-micro-caps lbl spaced">Their words</span>
      <p class="ah-caption hint">Something they said that you want to keep.</p>
      {#if person.quotes.length}
        <ul class="notes">
          {#each person.quotes as q (q.id)}
            <li>
              <span class="ah-body-serif grow quote">{q.content}</span>
              <button class="drop ah-micro-caps" onclick={() => data.removeNote(person.id, 'quotes', q.id)}>Remove</button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="addrow">
        <input class="ah-body plain grow" bind:value={newQuote} placeholder="Add one" />
        <button class="btn sm" onclick={() => addNote('quotes')} disabled={!newQuote.trim()}>Add</button>
      </div>

      <span class="ah-micro-caps lbl spaced">Their colour</span>
      <div class="swatches">
        {#each PALETTE_KEYS.filter((k) => k !== 'cream') as key (key)}
          <button
            class="swatch"
            class:on={key === paletteKey}
            style="background: {gradientCss(palette(key))}"
            onclick={() => (paletteKey = key)}
            aria-label={key}
            title={key}
          ></button>
        {/each}
      </div>

      <div class="preview" style="background: {gradientCss(preview)}; color: {preview.fontColor}">
        <span class="mono ah-title-l" style="color: {preview.fontColor}">
          {(fullName.trim().charAt(0) || '?').toUpperCase()}
        </span>
        <span class="ah-title-m">{fullName.trim() || 'Their name'}</span>
      </div>

      <div class="go">
        <button class="btn wide" onclick={save} disabled={!named || saving}>Save</button>
        <!-- Equal weight. Backing out is not the lesser choice. -->
        <button class="btn ghost wide" onclick={() => router.back('/today')}>Cancel</button>
      </div>

      <span class="ah-micro-caps lbl spaced">Remove</span>
      <div class="card list group">
        {#if !confirmingRemove}
          <button class="btn ghost wide" onclick={() => (confirmingRemove = true)}>
            Remove this person
          </button>
        {:else}
          <p class="ah-body note">
            This removes {person.name} and everything you have noted about them, from this
            device. If you have not saved a backup, there is no way back.
          </p>
          <button class="btn wide" onclick={remove}>Yes, remove {person.name}</button>
          <button class="btn ghost wide" onclick={() => (confirmingRemove = false)}>Keep them</button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .head { margin: 6px 0 18px; color: var(--text-heading); }
  .soft { color: var(--text-secondary); }
  .centred { text-align: center; margin: 32px auto 20px; max-width: 28ch; }
  .lbl { color: var(--text-muted); }
  .spaced { display: block; margin-top: 20px; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .nameInput, .essenceInput, .plain {
    border: none; background: none; width: 100%;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-medium);
    color: var(--text-heading);
  }
  .essenceInput { font-style: italic; }
  .nameInput::placeholder, .essenceInput::placeholder, .plain::placeholder { color: var(--text-faint); }

  .wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }

  .swatches { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .swatch {
    width: 38px; height: 38px; border-radius: var(--radius-md);
    border: none; cursor: pointer; box-shadow: var(--shadow-sm);
    outline: 2px solid transparent; outline-offset: 2px;
    transition: outline-color var(--duration-fast) var(--ease-standard);
  }
  .swatch.on { outline-color: var(--text-heading); }

  .preview {
    display: flex; align-items: center; gap: 12px;
    margin-top: 16px; padding: 16px 18px;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }
  .preview .mono {
    width: 44px; height: 44px; flex-shrink: 0;
    display: grid; place-items: center;
    border-radius: var(--radius-full);
    background: var(--glass-overlay);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
    font-style: italic;
  }

  .hint { color: var(--text-muted); margin: 4px 0 10px; }

  .notes { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .notes li {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: var(--radius-lg);
    background: var(--surface-sunk);
  }
  .notes .quote { font-style: italic; }
  .grow { flex: 1; min-width: 0; }
  .drop { flex-shrink: 0; border: none; background: none; cursor: pointer; color: var(--text-muted); padding: 8px; }

  .addrow { display: flex; align-items: center; gap: 8px; }

  .go { display: flex; flex-direction: column; gap: 8px; margin-top: 26px; }
  .group { display: flex; flex-direction: column; gap: 10px; }
  .note { color: var(--text-secondary); margin: 0; }

  @media (prefers-reduced-motion: reduce) { .swatch { transition: none; } }
</style>
