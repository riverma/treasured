<script lang="ts">
  // The first thing anyone sees, and — since the app ships with nobody in it — the only way
  // data gets in besides the importer.
  //
  // Four steps, each skippable, none of them a form you must complete to proceed. The exit
  // is always at equal weight to the continue, because an onboarding you cannot leave is a
  // dark pattern wearing a welcome mat.

  import { app } from '$lib/store/app.svelte';
  import { data } from '$lib/store/data.svelte';
  import { router } from '$lib/store/router.svelte';
  import { sentiments, sentimentKeys, tintVar } from '$lib/core/sentiments';
  import type { RelationKey, SentimentKey } from '$lib/core/types';

  const RELATIONS: RelationKey[] = ['friend', 'family', 'romantic', 'professional'];

  let step = $state(0);
  let fullName = $state('');
  let essence = $state('');
  let relations = $state<RelationKey[]>(['friend']);
  let phone = $state('');
  let feeling = $state<SentimentKey>('warm');
  let saving = $state(false);

  const named = $derived(fullName.trim().length > 0);

  function toggleRelation(r: RelationKey): void {
    relations = relations.includes(r)
      ? (relations.length > 1 ? relations.filter((x) => x !== r) : relations)
      : [...relations, r];
  }

  async function save(): Promise<void> {
    if (!named || saving) return;
    saving = true;
    try {
      const person = await data.addPerson({
        fullName: fullName.trim(),
        name: fullName.trim().split(' ')[0] ?? fullName.trim(),
        essence: essence.trim(),
        relations,
        recentSentiment: feeling,
        contact: { hasContact: phone.trim().length > 0, phone: phone.trim() || undefined }
      });
      await data.recordSentiment(person.id, feeling);
      data.activePersonId = person.id;
      await data.setPrefs({ onboarded: true });
      router.root('/today');
    } catch (e) {
      // Whatever went wrong, the one thing that must not happen is nothing: a button that
      // goes quiet and then stays disabled leaves someone tapping at a dead screen with no
      // idea whether they did something wrong. Say so, and let them try again.
      console.error('could not save this person', e);
      app.say('That did not save. Your details are still here — try once more.');
    } finally {
      saving = false;
    }
  }

  async function leave(): Promise<void> {
    await data.setPrefs({ onboarded: true });
    router.root('/today');
  }
</script>

<div class="screen">
  <div class="scroll" style="--scroll-tail: 40px">
    {#if step === 0}
      <h1 class="ah-display-m head">Treasured</h1>
      <p class="ah-body-serif body">
        A wallet for the people you love. One card each, a note on how things stand, and a
        nudge toward the next small kindness.
      </p>
      <p class="ah-body-serif body">
        Your people stay on this device. Nothing is ever uploaded — there is no account to
        make and nowhere for it to go.
      </p>
      <div class="go">
        <button class="btn wide" onclick={() => (step = 1)}>Add someone</button>
        <button class="btn ghost wide" onclick={() => router.go('/import')}>Bring in a file</button>
        <button class="btn ghost wide" onclick={leave}>Look around first</button>
      </div>

    {:else if step === 1}
      <span class="ah-micro-caps lbl">Someone you treasure</span>
      <h1 class="ah-heading-l head">Who?</h1>
      <label class="field">
        <input class="ah-display-m nameInput" bind:value={fullName} placeholder="Their name" />
      </label>
      <p class="ah-caption hint">However you'd say it out loud.</p>
      <div class="go">
        <button class="btn wide" onclick={() => (step = 2)} disabled={!named}>Next</button>
        <button class="btn ghost wide" onclick={leave}>Not now</button>
      </div>

    {:else if step === 2}
      <span class="ah-micro-caps lbl">{fullName.trim()}</span>
      <h1 class="ah-heading-l head">In one line?</h1>
      <label class="field">
        <input class="ah-body-serif essenceInput" bind:value={essence} placeholder="a line about who they are" />
      </label>
      <p class="ah-caption hint">Only for you. Skip it if nothing comes.</p>

      <span class="ah-micro-caps lbl spaced">How do you know them?</span>
      <div class="wrap">
        {#each RELATIONS as r (r)}
          <button class="chip" class:selected={relations.includes(r)} onclick={() => toggleRelation(r)}>{r}</button>
        {/each}
      </div>

      <label class="field spaced">
        <span class="ah-micro-caps lbl">Their number, if you have it</span>
        <input class="ah-body phoneInput" bind:value={phone} inputmode="tel" placeholder="Optional" />
      </label>

      <div class="go">
        <button class="btn wide" onclick={() => (step = 3)}>Next</button>
        <button class="btn ghost wide" onclick={() => (step = 3)}>Skip</button>
      </div>

    {:else}
      <span class="ah-micro-caps lbl">{fullName.trim()}</span>
      <h1 class="ah-heading-l head">How does it feel?</h1>
      <p class="ah-caption hint">Whatever is true today. It is never a score.</p>
      <div class="grid">
        {#each sentimentKeys as key (key)}
          <button class="tile" class:current={feeling === key} onclick={() => (feeling = key)}>
            <span class="tint" style="background: {tintVar(key, 400)}"></span>
            <span class="ah-caption label">{sentiments[key].label}</span>
          </button>
        {/each}
      </div>
      <div class="go">
        <button class="btn wide" onclick={save} disabled={saving}>Keep them</button>
        <button class="btn ghost wide" onclick={leave}>Not now</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .head { margin: 4px 0 14px; color: var(--text-heading); }
  .body { color: var(--text-body); margin: 0 0 14px; }
  .lbl { color: var(--text-muted); display: block; }
  .spaced { margin-top: 22px; }
  .hint { color: var(--text-muted); margin: 8px 0 0; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .nameInput, .essenceInput, .phoneInput {
    border: none; background: none; width: 100%;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-medium);
    color: var(--text-heading);
  }
  .essenceInput { font-style: italic; }
  .nameInput::placeholder, .essenceInput::placeholder, .phoneInput::placeholder { color: var(--text-faint); }

  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px 8px; margin-top: 14px; }
  .tile {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: none; border: none; padding: 8px 2px; cursor: pointer;
    border-radius: var(--radius-lg);
  }
  .tile.current { background: var(--surface-sunk); }
  .tint { width: 26px; height: 26px; border-radius: var(--radius-full); box-shadow: inset 0 1px 0 rgba(255,255,255,0.45); }
  .label { color: var(--text-secondary); line-height: 1.2; }
  .tile.current .label { color: var(--text-heading); }

  /* Continue and leave carry the same metrics. Leaving is not the lesser option. */
  .go { display: flex; flex-direction: column; gap: 8px; margin-top: 28px; }
</style>
