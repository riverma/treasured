// App-wide reactive state. Svelte 5 runes in a class, exported as a singleton — the
// shape Giraffy uses, so the ui/ components port between the two apps unchanged.

class App {
  /** Set by sw-client when a new service worker is waiting. Drives UpdateBar. */
  updateReady = $state(false);
  /** True while handing over to the waiting worker, so the button cannot be double-tapped. */
  updating = $state(false);
  /** Set aside for now. Kept here rather than inside UpdateBar so the shell can tell whether
   *  to leave room at the top for it — otherwise the bar sits on top of every Back button. */
  updateDismissed = $state(false);
  /**
   * The waiting worker refused to hand over. There is nothing more the page can do about it,
   * so the notice stops asking and Settings explains what will finish the job. Without this
   * the app prompts, fails, reloads, and prompts again indefinitely.
   */
  updateStuck = $state(false);

  /** Transient, non-modal message. Never red: Ahimsa refuses error banners. */
  toast = $state<string | null>(null);

  /** Mirrored from the OS so components read a boolean instead of each subscribing. */
  reduceMotion = $state(false);
  reduceTransparency = $state(false);

  /** True when launched from the home screen. Gates the install coach. */
  standalone = $state(false);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  say(message: string, ms = 2600): void {
    this.toast = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast = null; }, ms);
  }

  /**
   * Hand over to the version waiting in the wings, then come back on it.
   *
   * A plain `location.reload()` is not enough and never was: a waiting service worker keeps
   * waiting until every window under the old one has closed, which on a phone means knowing
   * to swipe the app away first. So the waiting worker is told to skip waiting, and the page
   * reloads once it has actually taken control.
   */
  async applyUpdate(): Promise<void> {
    if (this.updating) return;
    this.updating = true;

    let settled = false;
    const reload = (): void => {
      if (settled) return;
      settled = true;
      location.reload();
    };

    const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
    if (!reg?.waiting) { reload(); return; }

    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    reg.waiting.postMessage('skip-waiting');

    // The old version of this reloaded unconditionally after three seconds, and that is what
    // produced an endless "a newer Treasured is ready". A worker that will not hand over
    // stays waiting across a reload, so the reload accomplished nothing except to show the
    // notice again — forever, every time. Some engines hold the old worker until every
    // window of the app is closed, and no amount of reloading changes that.
    //
    // So when the handover does not happen, say so instead of pretending.
    setTimeout(() => {
      if (settled) return;
      settled = true;
      this.updating = false;
      this.updateStuck = true;
      this.updateDismissed = true;
      this.say('The update is ready but needs Treasured fully closed to finish.');
    }, 3000);
  }

  /**
   * Check by hand.
   *
   * The app already asks whenever it comes back to the foreground, but an installed app that
   * has been open for days gives you no way to ask on purpose — and no way to find out that
   * you are already current, which is its own answer.
   */
  async checkForUpdate(): Promise<'ready' | 'current' | 'unsupported'> {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined);
    if (!reg) return 'unsupported';
    try {
      await reg.update();
    } catch {
      return 'unsupported';
    }
    if (reg.waiting) this.updateReady = true;
    else { this.updateStuck = false; this.updateReady = false; }
    return this.updateReady || reg.waiting ? 'ready' : 'current';
  }

  /** Watches the media queries the UI degrades against. */
  watchEnvironment(): void {
    if (typeof window === 'undefined') return;

    const bind = (query: string, set: (v: boolean) => void) => {
      const mq = window.matchMedia(query);
      set(mq.matches);
      mq.addEventListener('change', (e) => set(e.matches));
    };

    bind('(prefers-reduced-motion: reduce)', (v) => { this.reduceMotion = v; });
    bind('(prefers-reduced-transparency: reduce)', (v) => { this.reduceTransparency = v; });
    bind('(display-mode: standalone)', (v) => {
      // iOS predates display-mode for home-screen apps and still reports it here.
      this.standalone = v || (navigator as { standalone?: boolean }).standalone === true;
    });
  }
}

export const app = new App();
