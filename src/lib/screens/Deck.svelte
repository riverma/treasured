<script lang="ts">
  // Everyone, as a deck you thumb through.
  //
  // A drag moves exactly one card, never a flick through six. The deck is for browsing the
  // people you love, and a list that flies past under your thumb is a feed — which is the
  // interaction pattern this whole app exists to not be.

  import DeckCard from '$lib/ui/DeckCard.svelte';
  import RingsSheet from '$lib/sheets/Rings.svelte';
  import { data } from '$lib/store/data.svelte';
  import { router } from '$lib/store/router.svelte';
  import { app } from '$lib/store/app.svelte';

  const people = $derived(data.peopleInRing(data.slice.activeRingId));

  let index = $state(0);
  let rings = $state(false);

  // Deleting someone, or switching to a smaller ring, must not leave the deck pointing past
  // the end of it.
  $effect(() => {
    if (index > people.length - 1) index = Math.max(0, people.length - 1);
  });

  const active = $derived(people[index]);

  function step(direction: -1 | 1): void {
    const next = index + direction;
    if (next < 0 || next > people.length - 1) return;
    index = next;
  }

  // Drag state. Deliberately not a velocity model: any deliberate drag past the threshold
  // moves one card, and a flick moves one card too.
  //
  // Pointer capture and clicking are in direct conflict here, and getting the line wrong
  // between them is what made the deck unopenable with a mouse.
  //
  // Capturing retargets the subsequent pointerup *and the synthesised click* to the stage,
  // so a card's own onclick never runs. Capturing on pointerdown killed every mouse click.
  // Capturing after a small 10px threshold was worse in a way that was harder to see: a
  // trackpad click drifts more than 10px all the time, so clicks with a little jitter opened
  // nothing — and, being under the 40px commit, did not advance the deck either. The
  // interaction simply did nothing.
  //
  // So capture only once the gesture has already committed to being a drag, which is the
  // one moment suppressing the click is correct — and guard selection with `movedFar` as
  // well, rather than relying on the browser to swallow the click for us.
  const DRAG_COMMIT = 40;

  let startX = 0;
  let dragging = false;
  let captured = false;
  let movedFar = false;

  function down(e: PointerEvent): void {
    dragging = true;
    captured = false;
    movedFar = false;
    startX = e.clientX;
  }

  function move(e: PointerEvent): void {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) < DRAG_COMMIT) return;
    movedFar = true;
    if (captured) return;
    captured = true;
    // only now, when the click is genuinely unwanted
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not fatal */ }
  }

  function up(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    captured = false;
    const dx = e.clientX - startX;
    if (Math.abs(dx) < DRAG_COMMIT) return;
    step(dx < 0 ? 1 : -1);
  }

  /** A drag that moved the deck must not also open the card it finished on. */
  function open(personId: string): void {
    if (movedFar) return;
    data.activePersonId = personId;
    router.root('/today');
  }
</script>

<div class="screen">
  <div class="hdr">
    <div class="grow">
      <span class="ah-micro-caps faint">Deck</span>
      <h2 class="ah-heading-m head">
        {data.activeRing && !data.activeRing.isDefault ? data.activeRing.name : 'Your people'}
      </h2>
    </div>
    <button class="pill" aria-label="Add someone" onclick={() => router.go('/onboarding/person')}>Add</button>
    <button class="pill" onclick={() => (rings = true)}>
      <span class="dot" style="background: {data.activeRing?.color ?? 'var(--amber-600)'}"></span>
      {data.activeRing?.name ?? 'Everyone'}
    </button>
  </div>

  {#if !data.ready}
    <div class="centre"><span class="ah-caption soft">Opening…</span></div>
  {:else if people.length === 0}
    <div class="centre">
      <p class="ah-body-serif soft">
        {data.slice.people.length === 0
          ? "Nobody here yet. Add someone whenever you're ready."
          : 'Nobody is in this ring yet. You can add people to it from their own card.'}
      </p>
      {#if data.slice.people.length === 0}
        <button class="btn" onclick={() => router.go('/onboarding/person')}>Add someone</button>
      {/if}
    </div>
  {:else}
    <div
      class="stage"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={() => { dragging = false; captured = false; }}
      role="group"
      aria-label="Deck of people"
    >
      {#each people as person, i (person.id)}
        <DeckCard
          {person}
          offset={i - index}
          onselect={() => open(person.id)}
        />
      {/each}
    </div>

    <div class="below">
      <button class="nav ah-small-caps" onclick={() => step(-1)} disabled={index === 0}>Previous</button>
      <span class="ah-micro-caps faint count">{index + 1} of {people.length}</span>
      <button class="nav ah-small-caps" onclick={() => step(1)} disabled={index >= people.length - 1}>Next</button>
    </div>

    {#if active}
      <p class="ah-caption soft hint">
        {app.reduceMotion
          ? 'Use Previous and Next to move through the deck.'
          : 'Drag to move one card. Swipe the screen sideways for Today.'}
      </p>
    {/if}
  {/if}
</div>

<RingsSheet open={rings} onclose={() => (rings = false)} />

<style>
  .head { margin: 2px 0 0; color: var(--text-heading); }
  .faint { color: var(--text-faint); }
  .soft { color: var(--text-secondary); }
  .centre { flex: 1; display: grid; place-items: center; padding: 0 var(--gutter); text-align: center; }

  .stage {
    flex: 1;
    position: relative;
    perspective: 1400px;
    touch-action: pan-y;
    /* the deck owns horizontal drag; the pane surface must not also swipe */
    overscroll-behavior-x: contain;
  }

  .below {
    display: flex; align-items: center; justify-content: center; gap: 18px;
    padding: 8px 0 2px;
  }

  .nav {
    background: none; border: none; cursor: pointer;
    color: var(--text-secondary);
    padding: 10px 14px; border-radius: var(--radius-full);
  }
  .nav:disabled { color: var(--text-faint); cursor: default; }

  .count { min-width: 8ch; text-align: center; }
  .hint { text-align: center; margin: 0 0 6px; }
</style>
