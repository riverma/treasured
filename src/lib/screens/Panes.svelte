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
  import Dots from '$lib/ui/Dots.svelte';
  import { PANES, router } from '$lib/store/router.svelte';

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

<div class="panes" bind:this={surface} {onscroll}>
  <section class="pane" aria-label="Deck"><Deck /></section>
  <section class="pane" aria-label="Today"><Today /></section>
  <section class="pane" aria-label="Connections"><Connections /></section>
</div>

<div class="rail">
  <button class="cog ah-micro-caps" onclick={() => router.go('/settings')}>Settings</button>
  <Dots count={PANES.length} {index} labels={PANES} />
  <span class="spacer"></span>
</div>

<style>
  /* The dots sit in their own strip at the bottom; the panes take everything above it. */
  .rail {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding-left: var(--gutter); padding-right: var(--gutter);
  }
  .cog, .spacer { flex: 1 1 0; min-width: 0; }
  .cog {
    background: none; border: none; cursor: pointer; text-align: left;
    color: var(--text-faint); padding: 6px 0 calc(var(--safe-bottom) + 10px);
  }

  .panes {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 38px;
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
