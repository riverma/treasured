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
  import Import from '$lib/screens/Import.svelte';
  import Install from '$lib/screens/Install.svelte';
  import Onboarding from '$lib/screens/Onboarding.svelte';
  import Panes from '$lib/screens/Panes.svelte';
  import Settings from '$lib/screens/Settings.svelte';
  import Toast from '$lib/ui/Toast.svelte';
  import UpdateBar from '$lib/ui/UpdateBar.svelte';
  import { data } from '$lib/store/data.svelte';
  import { router } from '$lib/store/router.svelte';

  let Dev = $state<Component | null>(null);

  router.start();
  void data.load();

  // The hub links to <app>.riverma.com/#install. router.start() records that and sends the
  // app to Today; this takes it the rest of the way to the guide.
  $effect(() => {
    if (router.installRequested && data.ready) {
      router.installRequested = false;
      router.go('/install');
    }
  });

  const screen = $derived(router.route.screen);
  const isDevScreen = $derived(screen === 'devdata' || screen === 'gallery');

  // A device that has never held anything starts at onboarding rather than at an empty
  // Today. There is no seed to fall back on: onboarding is how people get in.
  const needsOnboarding = $derived(
    data.ready && data.fresh && !data.prefs.onboarded && !isDevScreen && screen !== 'import'
  );

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
{:else if needsOnboarding || screen === 'onboarding'}
  <Onboarding />
{:else if screen === 'import'}
  <Import />
{:else if screen === 'install'}
  <Install />
{:else if screen === 'settings'}
  <Settings />
{:else if screen === 'about'}
  <About />
{:else}
  <Panes />
{/if}

<UpdateBar />
<Toast />
