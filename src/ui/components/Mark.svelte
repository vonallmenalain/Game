<script lang="ts">
  import ItemIcon from './ItemIcon.svelte';

  let { item, size = 'm' }: { item: string; size?: 's' | 'm' | 'l' } = $props();
</script>

<span class="mark {size}">
  <ItemIcon {item} />
</span>

<style>
  /* Das Icon steht frei, ohne Kästchen. Die Grösse ist der Platz, den es bekommt. */
  .mark {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    padding: 1px;
  }

  .mark.s {
    width: 26px;
    height: 26px;
  }

  .mark.l {
    width: 46px;
    height: 46px;
    padding: 2px;
  }
</style>
