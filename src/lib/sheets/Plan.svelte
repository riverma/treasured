<script lang="ts">
  // Making a plan, and handing it to the calendar.
  //
  // The honest framing matters here. A native app would write the event and could later
  // change it; we hand over a file and never learn what happened to it. So the button says
  // "Add to calendar" and the confirmation says "Ready for your calendar" — never "Added".

  import Sheet from '$lib/ui/Sheet.svelte';
  import { buildIcs, deliver, planText } from '$lib/core/ics';
  import { app } from '$lib/store/app.svelte';
  import type { Person, TimeOfDay } from '$lib/core/types';

  interface Props {
    open: boolean;
    person: Person | undefined;
    onclose: () => void;
  }

  const { open, person, onclose }: Props = $props();

  const TIMES: Array<{ key: TimeOfDay; label: string; hint: string }> = [
    { key: 'morning', label: 'Morning', hint: '10' },
    { key: 'afternoon', label: 'Afternoon', hint: '2' },
    { key: 'evening', label: 'Evening', hint: '6' },
    { key: 'late', label: 'Late', hint: '9' }
  ];

  function isoDay(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  let title = $state('');
  let date = $state(isoDay(1));
  let timeOfDay = $state<TimeOfDay>('evening');
  let handedOver = $state(false);

  const DAYS = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const iso = isoDay(i + 1);
      const d = new Date(iso);
      return { iso, label: d.toLocaleDateString(undefined, { weekday: 'short' }), day: d.getDate() };
    })
  );

  function input() {
    if (!person) return null;
    return { personId: person.id, fullName: person.fullName, title, date, timeOfDay };
  }

  async function addToCalendar(): Promise<void> {
    const i = input();
    if (!i) return;
    const used = await deliver(buildIcs(i), 'plan.ics');
    handedOver = true;
    if (!used) app.say('Your calendar did not take the file. The details are copyable below.');
  }

  async function copy(): Promise<void> {
    const i = input();
    if (!i) return;
    try {
      await navigator.clipboard.writeText(planText(i));
      app.say('Copied.');
    } catch {
      app.say('Could not copy here — you can select the text instead.');
    }
  }

  function reset(): void {
    handedOver = false;
    title = '';
    onclose();
  }
</script>

<Sheet {open} title="Make a plan" note={person?.fullName} onclose={reset}>
  <label class="field">
    <span class="ah-micro-caps lbl">What</span>
    <input
      class="ah-body-serif essence"
      bind:value={title}
      placeholder={person ? 'Time with ' + person.name : 'Time together'}
    />
  </label>

  <span class="ah-micro-caps lbl spaced">Which day</span>
  <div class="days">
    {#each DAYS as d (d.iso)}
      <button class="day" class:on={d.iso === date} onclick={() => (date = d.iso)}>
        <span class="ah-micro-caps">{d.label}</span>
        <span class="ah-title-m">{d.day}</span>
      </button>
    {/each}
  </div>

  <span class="ah-micro-caps lbl spaced">When</span>
  <div class="times">
    {#each TIMES as t (t.key)}
      <button class="pill" class:active={t.key === timeOfDay} onclick={() => (timeOfDay = t.key)}>
        {t.label}
      </button>
    {/each}
  </div>

  <div class="go">
    <button class="btn wide" onclick={addToCalendar}>Add to calendar</button>
    <button class="btn ghost wide" onclick={copy}>Copy the details</button>
  </div>

  {#if handedOver}
    <!-- Not "Added": we handed over a file and were never told the outcome. -->
    <p class="ah-caption note">Ready for your calendar — tap the file to add it.</p>
  {:else}
    <p class="ah-caption note">This makes a calendar file. Nothing is sent anywhere.</p>
  {/if}
</Sheet>

<style>
  .field { display: flex; flex-direction: column; gap: 6px; }
  .lbl { color: var(--text-muted); }
  .spaced { display: block; margin-top: 18px; }

  .essence {
    border: none; background: none; padding: 8px 0;
    border-bottom: 1px solid var(--border-medium);
    color: var(--text-heading); width: 100%;
    font-style: italic;
  }
  .essence::placeholder { color: var(--text-faint); }

  .days { display: flex; gap: 6px; margin-top: 8px; }
  .day {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 10px 0; border: none; cursor: pointer;
    border-radius: var(--radius-md);
    background: var(--surface-sunk); color: var(--text-secondary);
  }
  .day.on { background: var(--text-heading); color: var(--text-inverse); }

  .times { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }

  .go { display: flex; flex-direction: column; gap: 8px; margin-top: 22px; }
  .note { color: var(--text-muted); text-align: center; margin: 12px 0 0; }
</style>
