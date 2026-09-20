<script lang="ts">
  // Phase 2's checkpoint, on screen.
  //
  // Everything here is asserted in tests/unit/store.test.ts too. The difference is that
  // this one goes through the real reactive store on a real device, which is where the
  // interesting failures live: a write that does not re-render, a reload that loses a
  // slice, an iOS install whose storage was evicted overnight.
  //
  // Dev only. App.svelte imports it behind import.meta.env.DEV, so it is not in a build.

  import { data } from '$lib/store/data.svelte';
  import { sampleData } from '$lib/data/sample';
  import { detectPattern } from '$lib/core/patterns';
  import { getSuggestion, rankForConnections } from '$lib/core/engine';
  import { sentimentKeys, sentiments } from '$lib/core/sentiments';
  import { gradientCss } from '$lib/data/palettes';
  import { sinceText } from '$lib/core/time';
  import { primaryRelation } from '$lib/core/types';

  const ranked = $derived(rankForConnections(data.slice.people));
  const rankedIds = $derived(new Set(ranked.map((p) => p.id)));

  function cycle(personId: string, current: string): void {
    // Walk the vocabulary so every branch of the detector is reachable by tapping,
    // including the four the seed histories never exercise.
    const i = sentimentKeys.indexOf(current as never);
    const next = sentimentKeys[(i + 1) % sentimentKeys.length];
    if (next) void data.recordSentiment(personId, next);
  }
</script>

<div class="screen">
  <div class="scroll" style="--scroll-tail: 40px">
    <div class="col" style="gap: 4px">
      <span class="ah-small-caps" style="color: var(--text-muted)">Dev · data</span>
      <h1 class="ah-heading-m">{data.slice.people.length} people · {data.slice.rings.length} rings</h1>
      <p class="ah-caption" style="color: var(--text-secondary)">
        {data.ready ? 'Loaded from IndexedDB.' : 'Loading…'}
        Reload to prove it persisted.
      </p>
    </div>

    <!-- Rings: the default one counts everyone without storing a single membership row. -->
    <div class="card list">
      <span class="ah-small-caps" style="color: var(--text-muted)">Rings</span>
      <div class="wrap" style="margin-top: 10px">
        {#each data.rings as ring (ring.id)}
          <button
            class="pill"
            class:active={ring.id === data.slice.activeRingId}
            onclick={() => data.setActiveRing(ring.id)}
          >
            <span class="dot" style="background: {ring.color}"></span>
            {ring.name} · {data.ringCount(ring.id)}
            {#if ring.isDefault}<span style="opacity: 0.6">· virtual</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Connections ranking, so the weekly three are visible before the screen exists. -->
    <div class="card list">
      <span class="ah-small-caps" style="color: var(--text-muted)">This week</span>
      <p class="ah-body" style="margin: 8px 0 0">
        {ranked.map((p) => p.name).join(' · ') || 'nobody'}
      </p>
    </div>

    {#each data.peopleInRing(data.slice.activeRingId) as person (person.id)}
      {@const pattern = detectPattern(person.sentimentHistory)}
      <div class="card" style="background: {gradientCss(person.palette)}; color: {person.palette.fontColor}">
        <div class="row" style="gap: 10px; justify-content: space-between">
          <div class="col grow">
            <span class="ah-title-m">{person.name}</span>
            <span class="ah-caption" style="color: {person.palette.softColor}">
              {primaryRelation(person.relations)} · {sinceText(person.lastSeenAt)}
              {#if rankedIds.has(person.id)}· this week{/if}
              {#if data.isSuppressed(person.id)}· later{/if}
            </span>
          </div>
          <span class="ah-small-caps" style="color: {person.palette.softColor}">
            {person.sentimentHistory.length} read{person.sentimentHistory.length === 1 ? '' : 'ings'}
          </span>
        </div>

        <p class="ah-body-serif" style="margin: 12px 0 0">{getSuggestion(person)}</p>

        <p class="ah-caption" style="color: {person.palette.softColor}; margin: 8px 0 0">
          {pattern.pattern} — {pattern.caption}
        </p>

        <div class="row" style="gap: 6px; margin-top: 14px; flex-wrap: wrap">
          <button class="btn sm glass" onclick={() => cycle(person.id, person.recentSentiment)}>
            {sentiments[person.recentSentiment].label} → next
          </button>
          <button class="btn sm glass" onclick={() => data.markSeen(person.id)}>seen</button>
          <button class="btn sm glass" onclick={() => data.later(person.id)}>later</button>
          <button class="btn sm glass" onclick={() => data.deletePerson(person.id)}>delete</button>
        </div>
      </div>
    {/each}

    <div class="row" style="gap: 8px; margin-top: 8px">
      <button class="btn ghost" onclick={() => data.reset(sampleData())}>Load sample</button>
      <button class="btn ghost" onclick={() => data.reset()}>Empty</button>
      <a class="btn ghost" href="#/gallery">Gallery</a>
    </div>
  </div>
</div>
