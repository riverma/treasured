<script lang="ts">
  // The weekly three: who, of everyone, would most welcome hearing from you.
  //
  // Three is the whole design. A list of everyone you have ever known, sorted by neglect,
  // is a guilt machine; three is an afternoon. And when you say "later" to one of them the
  // fourth steps up, because a gap where a person used to be reads as a telling-off.

  import Reach from '$lib/sheets/Reach.svelte';
  import SentimentSheet from '$lib/sheets/Sentiment.svelte';
  import { data } from '$lib/store/data.svelte';
  import { getSuggestion, rankForConnections } from '$lib/core/engine';
  import { gradientCss } from '$lib/data/palettes';
  import { sinceText } from '$lib/core/time';
  import { sentiments } from '$lib/core/sentiments';
  import type { Person } from '$lib/core/types';

  // Suppressed people are filtered before ranking, not after, so the backfill is automatic:
  // ask for three from the people who are actually available and you get three.
  const available = $derived(data.slice.people.filter((p) => !data.isSuppressed(p.id)));
  const three = $derived(rankForConnections(available, 3));

  let reach = $state<{ kind: 'message' | 'call'; person: Person } | null>(null);
  let feeling = $state<Person | null>(null);
</script>

<div class="screen">
  <div class="hdr">
    <div class="grow">
      <span class="ah-micro-caps faint">This week</span>
      <h2 class="ah-heading-m head">Worth a moment</h2>
    </div>
  </div>

  <div class="scroll" style="--scroll-tail: 32px">
    {#if !data.ready}
      <p class="ah-caption soft centred">Opening…</p>
    {:else if data.slice.people.length === 0}
      <p class="ah-body-serif soft centred">
        Nobody here yet. Once you add someone, this is where they'll surface.
      </p>
    {:else if three.length === 0}
      <!-- Everyone is suppressed. Warmth, not an error. -->
      <p class="ah-body-serif soft centred">
        You've set everyone aside for now. They'll come back on their own.
      </p>
    {:else}
      {#each three as person (person.id)}
        <article class="card p0 person" style="background: {gradientCss(person.palette)}; color: {person.palette.fontColor}">
          <div class="body">
            <div class="top">
              <span class="mono ah-title-l" style="color: {person.palette.fontColor}">{person.initial}</span>
              <div class="who">
                <h3 class="ah-title-l name">{person.name}</h3>
                <span class="ah-micro-caps" style="color: {person.palette.softColor}">
                  {sinceText(person.lastSeenAt)} · {sentiments[person.recentSentiment].label}
                </span>
              </div>
            </div>

            <p class="ah-body-serif why">{getSuggestion(person)}</p>

            <div class="actions">
              <button class="btn sm glass" onclick={() => (reach = { kind: 'message', person })}>Message</button>
              <button class="btn sm glass" onclick={() => (reach = { kind: 'call', person })}>Call</button>
              <button class="btn sm glass" onclick={() => (feeling = person)}>How it feels</button>
              <!-- Equal weight, not a ghost: setting someone aside is as legitimate a
                   choice as reaching out, and the button should not whisper it. -->
              <button class="btn sm glass" onclick={() => data.later(person.id)}>Later</button>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </div>
</div>

<Reach
  open={reach !== null}
  kind={reach?.kind ?? 'message'}
  person={reach?.person}
  onclose={() => (reach = null)}
/>
<SentimentSheet open={feeling !== null} person={feeling ?? undefined} onclose={() => (feeling = null)} />

<style>
  .head { margin: 2px 0 0; color: var(--text-heading); }
  .faint { color: var(--text-faint); }
  .soft { color: var(--text-secondary); }
  .centred { text-align: center; margin: 32px auto 0; max-width: 28ch; }

  .person { border-radius: var(--radius-2xl); box-shadow: var(--shadow-md); }
  .body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }

  .top { display: flex; align-items: center; gap: 12px; }

  .mono {
    width: 44px; height: 44px; flex-shrink: 0;
    display: grid; place-items: center;
    border-radius: var(--radius-full);
    background: var(--glass-overlay);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
    font-style: italic;
  }

  .who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name { margin: 0; font-weight: 400; }
  .why { margin: 0; }

  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
</style>
