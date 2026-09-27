<script lang="ts">
  // The back of a person's card: what you know about them, and how things have been.
  //
  // Treasures are the small true things you would otherwise forget. Quotes are their words,
  // set as pull quotes without quotation marks — Ahimsa's rule, because the italic serif is
  // already doing that job and the marks would only shout.
  //
  // Nothing here is a metric. No counts, no streaks, no score out of anything.

  import WeatherStrip from '$lib/ui/WeatherStrip.svelte';
  import { router } from '$lib/store/router.svelte';
  import { data } from '$lib/store/data.svelte';
  import { gradientCss } from '$lib/data/palettes';
  import { sinceText } from '$lib/core/time';
  import { primaryRelation } from '$lib/core/types';
  import type { Person } from '$lib/core/types';

  interface Props { person: Person }
  const { person }: Props = $props();

  const p = $derived(person.palette);

  /** '--MM-DD' or 'YYYY-MM-DD' to something a person would say out loud. */
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  function birthdayText(raw: string | null): string | null {
    if (!raw) return null;
    const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(raw.replace(/^--/, '--'))
      ?? /^--(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return null;
    const hasYear = m.length === 4 && m[1];
    const month = Number(hasYear ? m[2] : m[m.length - 2]);
    const day = Number(m[m.length - 1]);
    const name = MONTHS[month - 1];
    if (!name || !day) return null;
    return name + ' ' + day;
  }

  const birthday = $derived(birthdayText(person.birthday));
</script>

<div class="back" style="background: {gradientCss(p)}; color: {p.fontColor}">
  <div class="inner">
    <span class="ah-micro-caps" style="color: {p.softColor}">
      {primaryRelation(person.relations)}{person.since ? ' · since ' + person.since : ''}
    </span>

    <h2 class="ah-heading-m name">{person.name}</h2>

    <!-- The moment a card says which rings someone is in, the feature becomes visible at
         all — and visible from the person, which is the direction it never supported. -->
    {#if data.ringsFor(person.id).length}
      <div class="rings">
        {#each data.ringsFor(person.id) as ring (ring.id)}
          <span class="ring ah-micro-caps" style="color: {p.softColor}">
            <span class="dot" style="background: {ring.color}"></span>{ring.name}
          </span>
        {/each}
      </div>
    {/if}

    <div class="rule" style="background: {p.softColor}"></div>

    <span class="ah-micro-caps" style="color: {p.softColor}">How it has been</span>
    <WeatherStrip history={person.sentimentHistory} color={p.fontColor} softColor={p.softColor} />

    {#if person.treasures.length}
      <div class="rule" style="background: {p.softColor}"></div>
      <span class="ah-micro-caps" style="color: {p.softColor}">Treasures</span>
      <ul class="treasures">
        {#each person.treasures as t (t.id)}
          <li class="ah-body">{t.content}</li>
        {/each}
      </ul>
    {/if}

    {#if person.quotes.length}
      <div class="rule" style="background: {p.softColor}"></div>
      <span class="ah-micro-caps" style="color: {p.softColor}">Their words</span>
      {#each person.quotes as q (q.id)}
        <!-- No quotation marks: the italic serif already says whose words these are. -->
        <p class="ah-pull-quote quote">{q.content}</p>
      {/each}
    {/if}

    <div class="rule" style="background: {p.softColor}"></div>

    <button
      class="edit ah-micro-caps"
      style="color: {p.softColor}; border-color: {p.lineColor}"
      onclick={() => router.go('/card/' + person.id)}
    >Edit</button>

    <dl class="facts">
      <div>
        <dt class="ah-micro-caps" style="color: {p.softColor}">Last together</dt>
        <dd class="ah-body">{sinceText(person.lastSeenAt)}</dd>
      </div>
      {#if birthday}
        <div>
          <dt class="ah-micro-caps" style="color: {p.softColor}">Birthday</dt>
          <dd class="ah-body">{birthday}</dd>
        </div>
      {/if}
    </dl>
  </div>
</div>

<style>
  .back { border-radius: var(--radius-3xl); box-shadow: var(--shadow-lg); height: 100%; }

  .inner {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; text-align: center;
    padding: 28px 24px;
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }

  .name { margin: 2px 0 0; font-weight: 400; }

  .rings { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 12px; margin-top: 8px; }
  .ring { display: inline-flex; align-items: center; gap: 5px; }
  .ring .dot { width: 6px; height: 6px; border-radius: var(--radius-full); }
  .rule { width: 24px; height: 1px; opacity: 0.6; margin: 8px 0; }

  .treasures {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 10px;
    max-width: 32ch;
  }

  .quote { margin: 0; max-width: 30ch; }

  /* The only way into the edit screen, and the only production route to removing someone. */
  .edit {
    background: none; cursor: pointer;
    border: 1px solid; border-radius: var(--radius-full);
    padding: 8px 18px; margin: 4px 0 12px;
    transition: transform var(--duration-fast) var(--ease-standard);
  }
  .edit:active { transform: scale(0.97); }

  .facts { margin: 0; display: flex; gap: 28px; justify-content: center; }
  .facts div { display: flex; flex-direction: column; gap: 3px; align-items: center; }
  .facts dd { margin: 0; }
</style>
