// App-wide reactive state. Svelte 5 runes in a class, exported as a singleton — the
// shape Giraffy uses, so the ui/ components port between the two apps unchanged.

class App {
  /** Set by sw-client when a new service worker is waiting. Drives UpdateBar. */
  updateReady = $state(false);

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
