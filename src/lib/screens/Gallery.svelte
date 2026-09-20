<script lang="ts">
  // The Phase 1 checkpoint made visible: every type composite, every palette, and the
  // primitives the screens are assembled from. Kept for the rest of the build — when a
  // card looks wrong, this is where you check whether it is the token or the screen.
  import { PALETTE_KEYS, palette, gradientCss } from '$lib/data/palettes';
  import { sentiments, sentimentKeys, tintVar } from '$lib/core/sentiments';
  import type { PaletteKey } from '$lib/core/types';

  const TYPE = [
    ['ah-display-xl', 'Display XL · 48'],
    ['ah-display-l', 'Display L · 40'],
    ['ah-display-m', 'Display M · 34'],
    ['ah-heading-l', 'Heading L · 28'],
    ['ah-heading-m', 'Heading M · 22'],
    ['ah-title-l', 'Title L · 17'],
    ['ah-title-m', 'Title M · 15'],
    ['ah-body-serif', 'Body serif · 15'],
    ['ah-body', 'Body · 13'],
    ['ah-caption', 'Caption · 11 italic'],
    ['ah-pull-quote', 'Pull quote · 17 italic'],
    ['ah-label', 'Label · 11'],
    ['ah-small-caps', 'Small caps · 10'],
    ['ah-micro-caps', 'Micro caps · 9']
  ] as const;

  const ACTIONS = ['Message', 'Call', 'Plan'];

  let shown = $state<PaletteKey>('rose');
  const p = $derived(palette(shown));
</script>

<div class="screen">
  <div class="hdr">
    <div class="grow">
      <div class="caps">Treasured</div>
      <div class="ah-display-m c-head">The gallery</div>
    </div>
  </div>

  <div class="scroll">
    <!-- Type. Fraunces is variable here, so opsz actually moves between 48px and 11px. -->
    <div class="caps rule">Type</div>
    <div class="card">
      {#each TYPE as [cls, label] (cls)}
        <div style="margin-bottom:14px">
          <div class="ah-micro-caps c-faint" style="margin-bottom:2px">{label}</div>
          <div class={cls + ' c-head'}>The people you love</div>
        </div>
      {/each}
    </div>

    <!-- Palettes. Tap one to see it on a card. -->
    <div class="caps rule">Palettes · {PALETTE_KEYS.length}</div>
    <div class="wrap">
      {#each PALETTE_KEYS as key (key)}
        <button
          class="swatch"
          class:on={key === shown}
          style="background:{gradientCss(palette(key))}"
          onclick={() => (shown = key)}
          aria-label={key}
          title={key}
        ></button>
      {/each}
    </div>

    <div
      class="card person"
      style="--person-bg:{gradientCss(p)}; --person-font:{p.fontColor}; --person-soft:{p.softColor}; --person-line:{p.lineColor}; background:{gradientCss(p)}"
    >
      <div class="content col" style="align-items:center; gap:6px">
        <div class="ah-micro-caps c-soft">On your mind today</div>
        <div class="mono glass s130" style="color:{p.fontColor}">B</div>
        <div class="ah-display-l c-on" style="margin-top:12px">A name here</div>
        <div class="ah-caption c-soft">a line about who they are</div>
        <div class="ah-micro-caps c-soft">Last together · 2 days ago</div>
        <div style="width:24px;height:1px;background:var(--person-soft);opacity:.6;margin:14px 0 10px"></div>
        <p class="quote">A coaching line sits here, in italic serif.</p>

        <div class="actions" style="margin-top:20px">
          {#each ACTIONS as label (label)}
            <button>
              <span class="orb ah-title-l" style="color:{p.fontColor}">{label.charAt(0)}</span>
              <span class="ah-small-caps c-soft">{label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
    <div class="ah-micro-caps c-faint" style="text-align:center">
      {shown} · ink {p.fontColor}
    </div>

    <!-- Sentiments: the 4×4 grid, shared by onboarding and the sentiment sheet. -->
    <div class="caps rule">Sentiments · 16</div>
    <div class="card sgrid">
      {#each sentimentKeys as key (key)}
        <div class="stile">
          <div class="stint" style="background: {tintVar(key, 400)}"></div>
          <div class="ah-caption c-sec">{sentiments[key].label}</div>
        </div>
      {/each}
    </div>

    <!-- The shared component layer, inherited from Giraffy. -->
    <div class="caps rule">Controls</div>
    <div class="card col" style="gap:14px">
      <div class="wrap">
        <button class="btn">Begin tending</button>
        <button class="btn sm">Save</button>
        <button class="btn ghost">Later</button>
      </div>
      <div class="wrap">
        <span class="pill"><i class="dot" style="background:var(--amber-600)"></i>Your People</span>
        <span class="pill active">Family</span>
        <span class="pill outline">Long-time</span>
      </div>
      <div class="wrap">
        <button class="chip selected">friend</button>
        <button class="chip">family</button>
        <button class="chip">romantic</button>
      </div>
      <label class="field essence">
        <span class="lbl">Essence</span>
        <input placeholder="a line about who they are" />
      </label>
      <div class="dots"><span class="on"></span><span></span><span></span></div>
    </div>

    <div style="height:32px"></div>
  </div>
</div>

<style>
  .swatch {
    width: 46px; height: 46px; border-radius: var(--radius-md);
    border: none; cursor: pointer; box-shadow: var(--shadow-sm);
    outline: 2px solid transparent; outline-offset: 2px;
    transition: outline-color var(--duration-fast) var(--ease-standard);
  }
  .swatch.on { outline-color: var(--text-heading); }
  .sgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 8px; }
  .stile { display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; }
  /* Ahimsa ships no icon set and refuses emoji: a sentiment is a word, placed by hue. */
  .stint { width: 22px; height: 22px; border-radius: var(--radius-full); box-shadow: inset 0 1px 0 rgba(255,255,255,0.45); }
</style>
