<script lang="ts">
  import { game } from '../game.svelte';
</script>

{#if game.toast}
  {#key game.toast.id}
    <div class="toast" role="status">{game.toast.text}</div>
  {/key}
{/if}

<style>
  .toast {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: calc(64px + var(--safe-bottom));
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--ink);
    color: var(--bg);
    font-size: 14px;
    font-weight: 500;
    z-index: 30;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }
</style>
