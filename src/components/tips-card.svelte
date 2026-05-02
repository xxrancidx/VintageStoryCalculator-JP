<script lang="ts">
  import CalculatorCard from "./calculator-card.svelte";

  export let title = "この合金の特徴";
  export let displayName = "";
  export let tier: number | null | undefined = null;
  export let useCase = "";
  export let description = "";

  $: hasContent = Boolean(useCase || description);
  $: tierLabel = typeof tier === "number" ? `Tier ${tier}` : null;
</script>

{#if hasContent}
  <CalculatorCard {title} headingTag="h3" className="tips-card">
    <div class="tips-header">
      {#if displayName}
        <span class="tips-name">{displayName}</span>
      {/if}
      {#if tierLabel}
        <span class="tips-tier" data-tier={tier}>{tierLabel}</span>
      {/if}
      {#if useCase}
        <span class="tips-usecase">{useCase}</span>
      {/if}
    </div>
    {#if description}
      <p class="tips-description">{description}</p>
    {/if}
  </CalculatorCard>
{/if}

<style>
  .tips-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
  }

  .tips-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .tips-tier {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .tips-tier[data-tier="2"] {
    background: #b87333;
    color: #fff;
    border-color: transparent;
  }

  .tips-tier[data-tier="3"] {
    background: #8c7853;
    color: #fff;
    border-color: transparent;
  }

  .tips-tier[data-tier="4"] {
    background: #5a5a5a;
    color: #fff;
    border-color: transparent;
  }

  .tips-tier[data-tier="5"] {
    background: #3a3a3a;
    color: #fff;
    border-color: transparent;
  }

  .tips-usecase {
    font-size: 0.78rem;
    color: var(--text-secondary);
    padding: 0.1rem 0.45rem;
    border-radius: calc(var(--border-radius) / 2);
    background: var(--surface-hover);
  }

  .tips-description {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.55;
    color: var(--text-primary);
  }
</style>
