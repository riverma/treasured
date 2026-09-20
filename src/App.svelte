<script lang="ts">
  // The shell.
  //
  // Deck, Today and Connections are panes of one swipeable surface rather than routes you
  // push; everything else is a screen over the top of it. The dev harnesses are loaded
  // through a dynamic import behind `import.meta.env.DEV`, which Vite replaces with a
  // literal `false` in a production build — so the branch, and the import inside it, are
  // eliminated rather than merely unrouted. A screen that can list every person and wipe
  // the database should not ship inside the app holding them.

  import type { Component } from 'svelte';
  import About from '$lib/screens/About.svelte';
  import Panes from '$lib/screens/Panes.svelte';
  import { data } from '$lib/store/data.svelte';
  import { router } from '$lib/store/router.svelte';

  let Dev = $state<Component | null>(null);

  router.start();
  void data.load();

  const screen = $derived(router.route.screen);
  const isDevScreen = $derived(screen === 'devdata' || screen === 'gallery');

  $effect(() => {
    if (!import.meta.env.DEV || !isDevScreen) return;
    const load = screen === 'gallery'
      ? import('$lib/screens/Gallery.svelte')
      : import('$lib/screens/DevData.svelte');
    void load.then((m) => { Dev = m.default as Component; });
  });
</script>

{#if import.meta.env.DEV && isDevScreen}
  {#if Dev}<Dev />{/if}
{:else if screen === 'about'}
  <About />
{:else}
  <Panes />
{/if}
