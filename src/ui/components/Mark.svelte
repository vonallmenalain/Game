<script lang="ts">
  let { text, color, size = 'm' }: { text: string; color: string; size?: 's' | 'm' | 'l' } = $props();
</script>

<span class="mark {size}" style="--mark: {color}" aria-hidden="true">{text}</span>

<style>
  .mark {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    background: var(--mark);
    color: #fff;
    font: 600 12px/1 var(--mono);
    letter-spacing: 0.02em;
  }

  .mark.s {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    font-size: 10px;
  }

  .mark.l {
    width: 42px;
    height: 42px;
    border-radius: 9px;
    font-size: 15px;
  }
</style>
