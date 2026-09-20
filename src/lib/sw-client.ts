// Registers the service worker in production builds and surfaces "a new version is ready".
import { app } from '$lib/store/app.svelte';

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js');
      const watch = (w: ServiceWorker | null) => {
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) app.updateReady = true;
        });
      };
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      // one may already be waiting from a previous visit, before anything was listening
      if (reg.waiting && navigator.serviceWorker.controller) app.updateReady = true;
      // a standalone app can sit for days without a reload, so ask again when it comes back
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => { app.updateReady = false; });
    } catch (e) {
      console.warn('service worker registration failed', e);
    }
  });
}
