<script lang="ts">
  import { formatKm } from '../../lib/format';
  import { game } from '../game.svelte';
</script>

<div class="screen" role="status" aria-live="polite">
  <p class="eyebrow">Nachtschicht</p>
  <h1>Der Zug ist gefahren</h1>
  <svg viewBox="0 0 320 96" role="presentation">
    <g class="smoke">
      <circle cx="40" cy="28" r="7" />
      <circle cx="56" cy="20" r="9" />
      <circle cx="76" cy="13" r="11" />
    </g>
    <g fill="currentColor">
      <rect x="14" y="50" width="52" height="26" rx="4" />
      <rect x="30" y="32" width="14" height="18" rx="3" />
      <rect x="70" y="54" width="46" height="22" rx="4" />
      <rect x="120" y="52" width="52" height="24" rx="4" />
      <rect x="176" y="52" width="52" height="24" rx="4" />
      <rect x="232" y="52" width="52" height="24" rx="4" />
      <rect x="10" y="78" width="300" height="3" rx="1.5" />
    </g>
    <g class="wheels" fill="currentColor">
      <circle cx="26" cy="80" r="5" /><circle cx="46" cy="80" r="5" /><circle cx="62" cy="80" r="4" />
      <circle cx="82" cy="80" r="5" /><circle cx="106" cy="80" r="5" />
      <circle cx="134" cy="80" r="5" /><circle cx="160" cy="80" r="5" />
      <circle cx="190" cy="80" r="5" /><circle cx="216" cy="80" r="5" />
      <circle cx="246" cy="80" r="5" /><circle cx="272" cy="80" r="5" />
    </g>
  </svg>
  <p class="km mono">{formatKm(game.returnKm)}</p>
</div>

<style>
  .screen {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 24px;
    background: var(--bg);
    color: var(--ink);
    text-align: center;
  }

  h1 {
    font-family: var(--display);
    font-size: clamp(30px, 9vw, 44px);
    font-weight: 700;
    margin: 0 0 18px;
  }

  svg {
    width: min(100%, 360px);
    height: auto;
    color: var(--ink-2);
  }

  .smoke circle {
    fill: var(--line);
  }

  .km {
    font-size: clamp(28px, 9vw, 40px);
    font-weight: 600;
    color: var(--accent-ink);
    margin: 14px 0 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .smoke circle {
      animation: drift 1.6s ease-out infinite;
    }

    .smoke circle:nth-child(2) {
      animation-delay: 0.25s;
    }

    .smoke circle:nth-child(3) {
      animation-delay: 0.5s;
    }

    svg {
      animation: shake 0.35s ease-in-out infinite alternate;
    }
  }

  @keyframes drift {
    from {
      opacity: 0.9;
      transform: translate(0, 0) scale(0.8);
    }

    to {
      opacity: 0;
      transform: translate(26px, -16px) scale(1.4);
    }
  }

  @keyframes shake {
    from {
      transform: translateY(0);
    }

    to {
      transform: translateY(1.5px);
    }
  }
</style>
