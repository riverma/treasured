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
  import Person from '$lib/screens/Person.svelte';
  import Settings from '$lib/screens/Settings.svelte';
  import Toast from '$lib/ui/Toast.svelte';
  import UpdateBar from '$lib/ui/UpdateBar.svelte';
  import { app } from '$lib/store/app.svelte';
  import { data } from '$lib/store/data.svelte';
  import { router } from '$lib/store/router.svelte';

  let Dev = $state<Component | null>(null);

  router.start();
  void data.load();
  data.watchLifecycle();

  // The hub links to <app>.riverma.com/#install. router.start() records that and sends the
  // app to Today; this takes it the rest of the way to the guide.
  $effect(() => {
    if (router.installRequested && data.ready) {
      router.installRequested = false;
      router.go('/install');
    }
  });

  // The update bar is pinned to the top of the frame, so every screen underneath has to
  // move down while it is there — otherwise it covers the Back button.
  $effect(() => {
    const el = document.getElementById('app');
    if (!el) return;
    el.classList.toggle('with-update', app.updateReady && !app.updateDismissed && !app.updateStuck);
  });

  const screen = $derived(router.route.screen);
  const isDevScreen = $derived(screen === 'devdata' || screen === 'gallery');

  // A device nobody has finished setting up starts at onboarding rather than an empty Today.
  // There is no seed to fall back on: onboarding is how people get in.
  //
  // This keys off `onboarded` alone. It used to also require `fresh`, which is computed as
  // "no settings rows and no people" — but saving an onboarding draft writes a settings row,
  // and so does creating the default ring. So the moment either of those landed the install
  // stopped being fresh, onboarding was skipped, and a half-finished person became
  // unreachable. `onboarded` is the flag that actually means what this needs.
  // Someone with people is not a new user, whatever the flag says. Onboarding saves the
  // person before it sets `onboarded`, so a reload in the gap between the two would
  // otherwise drop you back on the welcome screen with that person already added.
  const needsOnboarding = $derived(
    data.ready
      && !data.prefs.onboarded
      && data.slice.people.length === 0
      && !isDevScreen
      && screen !== 'import'
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
{:else if screen === 'card'}
  <Person />
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
