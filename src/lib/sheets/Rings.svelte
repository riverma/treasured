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
  let newName = $state('');
  let confirmDrop = $state<string | null>(null);

  async function create(): Promise<void> {
    if (!newName.trim()) return;
    await data.addRing(newName);
    newName = '';
  }

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
            <button class="edit ah-micro-caps" onclick={() => (editing = ring.id)}>Who</button>
            <button class="edit ah-micro-caps" onclick={() => (confirmDrop = ring.id)}>Remove</button>
          {:else}
            <!-- The default ring means everyone, computed. There is nothing to edit. -->
            <span class="edit ah-micro-caps soft">Everyone</span>
          {/if}
        </div>

        {#if confirmDrop === ring.id}
          <div class="confirm">
            <p class="ah-caption soft">
              Removing {ring.name} keeps everyone in it — only the ring goes.
            </p>
            <div class="pair">
              <button class="btn sm" onclick={() => { data.deleteRing(ring.id); confirmDrop = null; }}>
                Remove it
              </button>
              <button class="btn sm ghost" onclick={() => (confirmDrop = null)}>Keep it</button>
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <!-- Rings could be picked and their membership edited, but never created. -->
    <div class="addrow">
      <input class="ah-body plain" bind:value={newName} placeholder="New ring" />
      <button class="btn sm" onclick={create} disabled={!newName.trim()}>Add</button>
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

  .addrow { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
  .plain {
    flex: 1; min-width: 0; border: none; background: none;
    border-bottom: 1px solid var(--border-medium);
    color: var(--text-heading); padding: 8px 0;
  }
  .plain::placeholder { color: var(--text-faint); }

  .confirm { padding: 10px 4px 2px; display: flex; flex-direction: column; gap: 8px; }
  .pair { display: flex; gap: 8px; }
  .back { margin-top: 14px; }
</style>
