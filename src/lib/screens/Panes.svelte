<script lang="ts">
  // Deck, Today, Connections — one horizontally snapped surface rather than three routes.
  //
  // The screens spec refuses a tab bar and asks for edge swipes. On the web that is a
  // scroll-snap container: native momentum, native accessibility, no gesture code to write
  // and none to get wrong. The deck's own drag does not fight it because the deck pane sets
  // overscroll-behavior-x: contain.
  //
  // Today is the middle pane and the one you land on.

  import Connections from '$lib/screens/Connections.svelte';
  import Deck from '$lib/screens/Deck.svelte';
  import Today from '$lib/screens/Today.svelte';
  import PaneRail from '$lib/ui/PaneRail.svelte';
  import { PANES, router } from '$lib/store/router.svelte';

  /** What the rail calls each pane. 'This week' reads better than 'Connections' at this size. */
  const LABELS = ['Deck', 'Today', 'This week'] as const;
  const IDS = ['pane-deck', 'pane-today', 'pane-connections'] as const;

  function pick(i: number): void {
    const name = PANES[i];
    if (name) router.root('/' + name);
  }

  let surface = $state<HTMLElement | null>(null);
  let index = $state(PANES.indexOf('today'));
  let settling = false;
  let placed = false;

  /**
   * Land on the pane the route asked for.
   *
   * The first run has to scroll even though `index` already says 'today', because the
   * surface itself starts at scrollLeft 0 — which is the deck. Skipping it on the grounds
   * that the numbers already agree is how the app came up showing the wrong pane with the
   * dots insisting otherwise.
   */
  $effect(() => {
    const el = surface;
    if (!el) return;
    const wanted = PANES.indexOf(router.pane);
    if (wanted < 0) return;
    if (placed && wanted === index) return;
    // before first layout there is nothing to scroll within; try again next frame
    if (el.clientWidth === 0) {
      requestAnimationFrame(() => { placed = false; index = -1; });
      return;
    }
    settling = true;
    el.scrollTo({ left: el.clientWidth * wanted, behavior: 'instant' as ScrollBehavior });
    index = wanted;
    placed = true;
    requestAnimationFrame(() => { settling = false; });
  });

  function onscroll(): void {
    const el = surface;
    if (!el || settling) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next === index || next < 0 || next >= PANES.length) return;
    index = next;
    // A swipe is not a step you should have to undo with the back button, so this replaces
    // rather than pushes.
    router.root('/' + PANES[next]);
  }
</script>

<!--
  All three panes are always in the DOM. Without `inert` on the two you are not looking at,
  Tab walks straight into offscreen controls: from Today, one Tab landed on the Deck's Next
  button and six landed on a Connections card, at which point the browser scrolled focus
  into view and the screen changed under you. Screen readers got all three panes' controls
  as one undifferentiated run. `inert` takes them out of the tab order, out of hit-testing
  and out of the accessibility tree in one attribute.
-->
<div class="panes" bind:this={surface} {onscroll}>
  <div class="pane" id={IDS[0]} role="tabpanel" aria-label="Deck" inert={index !== 0}><Deck /></div>
  <div class="pane" id={IDS[1]} role="tabpanel" aria-label="Today" inert={index !== 1}><Today /></div>
  <div class="pane" id={IDS[2]} role="tabpanel" aria-label="This week" inert={index !== 2}><Connections /></div>
</div>

<div class="rail">
  <PaneRail labels={LABELS} ids={IDS} {index} onpick={pick} />
  <button class="cog ah-micro-caps" onclick={() => router.go('/settings')}>Settings</button>
</div>

<style>
  /* The dots sit in their own strip at the bottom; the panes take everything above it. */
  .rail {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 10px;
    padding: 0 var(--gutter);
  }
  /* Settings sits apart from the three panes, because it is not one of them. */
  .cog {
    flex-shrink: 0;
    background: none; border: none; cursor: pointer;
    color: var(--text-faint);
    padding: 12px 6px calc(var(--safe-bottom) + 10px);
  }

  .panes {
    position: absolute;
    /* the rail carries words now, not three dots, so it is taller than it was */
    top: 0; left: 0; right: 0; bottom: 62px;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .panes::-webkit-scrollbar { display: none; }

  .pane {
    position: relative;
    flex: 0 0 100%;
    height: 100%;
    scroll-snap-align: center;
    scroll-snap-stop: always;
  }
</style>
