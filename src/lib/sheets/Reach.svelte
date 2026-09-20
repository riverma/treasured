<script lang="ts">
  // Message and Call are the same sheet with a different roster, so they are one component.
  //
  // The rule that matters here: every row is a real `<a href>`, never a click handler that
  // assigns `location.href`. Inside an iOS standalone PWA, programmatic navigation to a
  // custom scheme is frequently swallowed, while a user-activated anchor click is honoured.
  // The mockup's rows were <button>s; these are anchors styled to match.

  import Sheet from '$lib/ui/Sheet.svelte';
  import { callChannels, messageChannels, ROSTER_NOTE } from '$lib/core/channels';
  import { data } from '$lib/store/data.svelte';
  import type { ChannelKey, Person } from '$lib/core/types';

  interface Props {
    open: boolean;
    kind: 'message' | 'call';
    person: Person | undefined;
    onclose: () => void;
  }

  const { open, kind, person, onclose }: Props = $props();

  const channels = $derived(
    !person
      ? []
      : kind === 'message'
        ? messageChannels(person.contact, data.slice.countryCode)
        : callChannels(person.contact, data.slice.countryCode)
  );

  const lastUsed = $derived(person?.contact.preferredChannel);

  function chose(key: ChannelKey): void {
    if (!person) return;
    // Learned, not detected. Remembering what you picked is the whole of what install
    // detection would have given us.
    void data.rememberChannel(person.id, key);
    void data.markSeen(person.id);
  }
</script>

<Sheet
  {open}
  title={kind === 'message' ? 'Message' : 'Call'}
  note={person ? person.fullName : undefined}
  {onclose}
>
  {#if !person?.contact.hasContact || channels.length === 0}
    <!-- Not an error state. Nothing has gone wrong; we simply have no number yet. -->
    <p class="ah-body-serif empty">
      There's no phone number or email saved for {person?.name ?? 'them'} yet.
      You can add one whenever you like.
    </p>
  {:else}
    <ul class="rows">
      {#each channels as channel (channel.key)}
        <li>
          <a
            class="row"
            href={channel.href}
            target={channel.external ? '_blank' : undefined}
            rel={channel.external ? 'noopener noreferrer' : undefined}
            onclick={() => chose(channel.key)}
          >
            <span class="ah-title-m name">{channel.label}</span>
            {#if channel.key === lastUsed}
              <span class="ah-micro-caps tag">Last used</span>
            {/if}
          </a>
        </li>
      {/each}
    </ul>

    <p class="ah-caption note">{ROSTER_NOTE}</p>
  {/if}
</Sheet>

<style>
  .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

  .row {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 18px;
    border-radius: var(--radius-lg);
    background: var(--surface-sunk);
    color: var(--text-heading);
    text-decoration: none;
    transition: transform var(--duration-fast) var(--ease-standard);
  }
  .row:active { transform: scale(0.97); }
  .row:hover { color: var(--text-heading); }

  .name { flex: 1; min-width: 0; }

  .tag {
    color: var(--text-muted);
    background: var(--surface-elevated);
    padding: 4px 8px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  .note { color: var(--text-muted); margin: 14px 2px 0; text-align: center; }
  .empty { color: var(--text-secondary); margin: 0 0 8px; }
</style>
