<script lang="ts">
  import ItemIcon from './ItemIcon.svelte';

  let { item, color, size = 'm' }: { item: string; color: string; size?: 's' | 'm' | 'l' } = $props();
</script>

<span class="mark {size}" style="--mark: {color}">
  <ItemIcon {item} />
</span>

<style>
  .mark {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    padding: 3px;
    border-radius: 7px;
    background: var(--mark);
    color: #fff;
  }

  .mark.s {
    width: 22px;
    height: 22px;
    padding: 1.5px;
    border-radius: 5px;
  }

  .mark.l {
    width: 42px;
    height: 42px;
    padding: 5px;
    border-radius: 9px;
  }
</style>
