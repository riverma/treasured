// A hash router, the shape Giraffy uses so the ui/ components port between the apps.
//
// One difference that matters: Treasured's three main screens are not tabs. The screens
// spec refuses a tab bar and asks for edge swipes between Deck, Today and Connections, so
// those three are *panes* of one horizontally scroll-snapped surface rather than separate
// routes you push. The router treats them as roots at the same depth; the pane index is
// what the swipe surface reads.
//
// `#install` is the launcher's contract: every app on the hub honours it.

export type Screen =
  | 'today' | 'deck' | 'connections'
  | 'card' | 'settings' | 'about' | 'import' | 'onboarding' | 'install'
  /** Dev harnesses. Reachable at #/gallery and #/devdata, and compiled out of a
   *  production build — see App.svelte, where the import sits behind import.meta.env.DEV. */
  | 'gallery' | 'devdata';

export interface Route {
  screen: Screen;
  id: string | null;
  path: string;
}

/** The three scroll-snap panes, in visual order. Deck sits left of Today, as in the mockup. */
export const PANES = ['deck', 'today', 'connections'] as const;
export type Pane = (typeof PANES)[number];

const SCREENS = new Set<string>([
  'today', 'deck', 'connections', 'card', 'settings', 'about', 'import', 'onboarding', 'install',
  'gallery', 'devdata'
]);

export function parsePath(path: string): Route {
  const clean = path.replace(/^#?\/?/, '');
  const [head, ...rest] = clean.split('/');
  const screen = (SCREENS.has(head ?? '') ? head : 'today') as Screen;
  // a truncated or hand-edited link can carry a stray %, and decodeURIComponent throws on
  // it; taking the raw text keeps a bad link from stopping the app starting at all
  let id: string | null = null;
  if (rest.length) {
    const raw = rest.join('/');
    try { id = decodeURIComponent(raw); } catch { id = raw; }
  }
  return { screen, id, path: '/' + screen + (id ? '/' + encodeURIComponent(id) : '') };
}

class Router {
  route = $state<Route>(parsePath('/today'));
  /** How many in-app steps sit under the current entry; 0 at a pane root. */
  depth = $state(0);
  /** Set once at startup when the launcher asked for the install helper. */
  installRequested = $state(false);
  private started = false;

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    let hash = location.hash;
    if (hash === '#install') {
      this.installRequested = true;
      hash = '#/today';
    }
    const r = parsePath(hash || '/today');
    history.replaceState({ d: 0 }, '', '#' + r.path);
    this.route = r;
    this.depth = 0;
    window.addEventListener('popstate', () => {
      this.route = parsePath(location.hash || '/today');
      this.depth = (history.state && typeof history.state.d === 'number') ? history.state.d : 0;
    });
  }

  /** True while one of the three swipe panes is showing, so the shell knows to let the
   *  horizontal scroll surface own the gesture. */
  get onPane(): boolean {
    return (PANES as readonly string[]).includes(this.route.screen);
  }

  get pane(): Pane {
    return this.onPane ? (this.route.screen as Pane) : 'today';
  }

  go(path: string): void {
    const r = parsePath(path);
    if (r.path === this.route.path) return;
    this.depth += 1;
    history.pushState({ d: this.depth }, '', '#' + r.path);
    this.route = r;
  }

  replace(path: string, depth = this.depth): void {
    const r = parsePath(path);
    this.depth = depth;
    history.replaceState({ d: depth }, '', '#' + r.path);
    this.route = r;
  }

  /** Move between panes: a fresh root, no history to walk back through. Swiping is not a
   *  navigation you should have to undo with the back button. */
  root(path: string): void {
    this.replace(path, 0);
  }

  /** One step back, or to Today when there is nothing to go back to. */
  back(fallback = '/today'): void {
    if (this.depth > 0) history.back();
    else this.root(fallback);
  }
}

export const router = new Router();
