<script lang="ts">
  // Phase 3. Today is the app's front door; Deck and Connections arrive in Phase 5, at
  // which point these three become panes of one scroll-snap surface rather than routes.
  //
  // The dev harnesses are loaded through a dynamic import behind `import.meta.env.DEV`.
  // Vite replaces that with a literal `false` in a production build, so the branch — and
  // the import inside it — is eliminated rather than merely unrouted. A screen that can
  // list every person and wipe the database should not ship inside the app holding them.

  import type { Component } from 'svelte';
  import About from '$lib/screens/About.svelte';
  import Today from '$lib/screens/Today.svelte';
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
  <Today />
{/if}
