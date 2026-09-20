<script lang="ts">
  // Rings: the circles you keep people in.
  //
  // One ring is the default and holds everyone, always. Its membership is never stored —
  // it is computed — so it cannot drift out of step with who you actually know.
  //
  // Nothing here is a hierarchy. Rings are not tiers, there is no inner circle to be
  // demoted from, and the app never ranks them.

  import Sheet from '$lib/ui/Sheet.svelte';
  import { data } from '$lib/store/data.svelte';

  interface Props { open: boolean; onclose: () => void }
  const { open, onclose }: Props = $props();

  let editing = $state<string | null>(null);

  const editingRing = $derived(data.slice.rings.find((r) => r.id === editing));

  function pick(ringId: string): void {
    void data.setActiveRing(ringId);
    onclose();
  }

  function inRing(ringId: string, personId: string): boolean {
    return data.slice.ringMembers.some((m) => m.ringId === ringId && m.personId === personId);
  }
</script>

<Sheet
  {open}
  title={editingRing ? 'Who is in ' + editingRing.name : 'Rings'}
  note={editingRing ? undefined : 'Everyone stays in the first one.'}
  onclose={() => { editing = null; onclose(); }}
>
  {#if editingRing}
    <div class="list">
      {#each data.slice.people as person (person.id)}
        {@const member = inRing(editingRing.id, person.id)}
        <button
          class="row"
          class:member
          onclick={() => data.setRingMembership(editingRing.id, person.id, !member)}
        >
          <span class="ah-title-m">{person.name}</span>
          <span class="ah-micro-caps mark">{member ? 'In' : 'Add'}</span>
        </button>
      {/each}
      {#if data.slice.people.length === 0}
        <p class="ah-caption soft">Nobody to add yet.</p>
      {/if}
    </div>

    <button class="btn ghost wide back" onclick={() => (editing = null)}>Done</button>
  {:else}
    <div class="list">
      {#each data.slice.rings as ring (ring.id)}
        <div class="row ring" class:current={ring.id === data.slice.activeRingId}>
          <button class="pickable" onclick={() => pick(ring.id)}>
            <span class="dot" style="background: {ring.color}"></span>
            <span class="ah-title-m grow">{ring.name}</span>
            <span class="ah-micro-caps mark">{data.ringCount(ring.id)}</span>
          </button>
          {#if !ring.isDefault}
            <button class="edit ah-micro-caps" onclick={() => (editing = ring.id)}>Edit</button>
          {:else}
            <span class="edit ah-micro-caps soft">Everyone</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Sheet>

<style>
  .list { display: flex; flex-direction: column; gap: 8px; }

  .row {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 14px 16px;
    border: none; border-radius: var(--radius-lg);
    background: var(--surface-sunk);
    color: var(--text-heading);
    cursor: pointer; text-align: left;
    transition: transform var(--duration-fast) var(--ease-standard);
  }
  .row:active { transform: scale(0.98); }
  .row.ring { padding: 0; background: none; }

  .pickable {
    flex: 1; display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; border: none; border-radius: var(--radius-lg);
    background: var(--surface-sunk); color: var(--text-heading);
    cursor: pointer; min-width: 0;
  }
  .row.current .pickable { background: var(--text-heading); color: var(--text-inverse); }

  .dot { width: 8px; height: 8px; border-radius: var(--radius-full); flex-shrink: 0; }
  .grow { flex: 1; min-width: 0; }
  .mark { color: inherit; opacity: 0.6; }

  .edit {
    flex-shrink: 0; border: none; background: none; cursor: pointer;
    color: var(--text-secondary); padding: 14px 10px;
  }

  /* Being in a ring is marked, not rewarded. */
  .row.member { background: var(--text-heading); color: var(--text-inverse); }

  .soft { color: var(--text-secondary); }
  .back { margin-top: 14px; }
</style>
