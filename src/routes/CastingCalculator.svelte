<script lang="ts">
  import CalculatorCard from "../components/calculator-card.svelte";
  import NumberInput from "../components/number-input.svelte";
  import SelectInput from "../components/select-input.svelte";
  import ShareButton from "../components/share-button.svelte";
  import StackPlanPanel from "../components/stack-plan-panel.svelte";
  import metalDefinitionsRaw from "../data/metals.json";
  import { NUGGETS_PER_INGOT, UNITS_PER_INGOT } from "../lib/constants";
  import { displayMetal } from "../lib/metal-names";
  import { formatWholeNumber } from "../lib/numberFormatting";
  import {
    metalCalculation,
    metalCalculator,
    setSelectedMetal,
    setTargetIngots,
    setSmelterEnabled,
    setSmelterTier,
    setSmelterCustomPct,
    setUseCustomSmelter,
    SMELTER_TIER_DEFAULTS
  } from "../stores/metalCalculator";
  import type { Metal } from "../types/index";
  import type { SelectOption } from "../types/components";

  const metalDefinitions = metalDefinitionsRaw as Record<string, Metal>;
  const metalEntries = Object.entries(metalDefinitions) as Array<[string, Metal]>;
  const metalOptions: Array<SelectOption<string>> = metalEntries.map(([key, metal]) => ({
    value: key,
    label: displayMetal(metal.name)
  }));

  const formatQuantity = formatWholeNumber;

  const handleMetalChange = (event: CustomEvent<{ value: string }>) => {
    setSelectedMetal(event.detail.value);
  };

  const handleIngotsInput = (event: CustomEvent<{ value: number | null }>) => {
    setTargetIngots(event.detail.value);
  };

  const handleSmelterToggle = (event: Event) => {
    setSmelterEnabled((event.target as HTMLInputElement).checked);
  };

  const handleTierChange = (tier: 1 | 2 | 3) => {
    setSmelterTier(tier);
    setUseCustomSmelter(false);
  };

  const handleCustomToggle = (event: Event) => {
    setUseCustomSmelter((event.target as HTMLInputElement).checked);
  };

  const handleCustomPctInput = (event: Event) => {
    const val = parseFloat((event.target as HTMLInputElement).value);
    setSmelterCustomPct(val);
  };

  const TIERS: Array<1 | 2 | 3> = [1, 2, 3];
</script>

<section class="calculator-shell">
  <aside class="calculator-rail" aria-label="鋳造計算機の入力">
    <CalculatorCard
      title="鋳造計算機"
      subtitle="インゴット鋳造の計画"
    >
      <p>
        目標インゴット数に必要な鉱石ナゲット数を計算します。インゴット1個 = {NUGGETS_PER_INGOT}ナゲット（{UNITS_PER_INGOT}ユニット）。
      </p>
    </CalculatorCard>

    <div class="controls">
      <SelectInput
        id="metalSelect"
        label="金属を選択"
        options={metalOptions}
        value={$metalCalculator.selectedMetal}
        helpText="鋳造したい金属を選んでください。"
        on:change={handleMetalChange}
      />

      <NumberInput
        id="targetIngots"
        label="目標インゴット数"
        value={$metalCalculator.targetIngots}
        min={0}
        step={1}
        helpText="鋳造したいインゴットの総数。"
        on:input={handleIngotsInput}
      />
    </div>

    <!-- XSkills Smelterスキルセクション -->
    <CalculatorCard title="XSkills: 鋳造師スキル" headingTag="h3">
      <div class="smelter-section">
        <label class="smelter-toggle-row">
          <span class="smelter-toggle-label">
            <strong>鋳造師 (Smelter) スキルを適用</strong>
            <span class="smelter-sublabel">鋳造に必要なユニット数を削減します（再溶解できない工具の鋳型のみ適用。インゴット鋳型・プレート鋳型など再溶解可能な鋳型には適用されません）</span>
          </span>
          <input
            type="checkbox"
            class="toggle-checkbox"
            checked={$metalCalculator.smelterEnabled}
            on:change={handleSmelterToggle}
          />
        </label>

        {#if $metalCalculator.smelterEnabled}
          <div class="smelter-options">
            <p class="smelter-mode-label">スキルレベル（デフォルト値）</p>
            <div class="tier-buttons">
              {#each TIERS as tier}
                <button
                  type="button"
                  class="tier-btn"
                  class:tier-active={!$metalCalculator.useCustomSmelter && $metalCalculator.smelterTier === tier}
                  on:click={() => handleTierChange(tier)}
                >
                  Tier {tier}
                  <span class="tier-pct">-{SMELTER_TIER_DEFAULTS[tier]}%</span>
                </button>
              {/each}
            </div>

            <label class="custom-row">
              <input
                type="checkbox"
                checked={$metalCalculator.useCustomSmelter}
                on:change={handleCustomToggle}
              />
              <span>カスタム値を使用</span>
            </label>

            {#if $metalCalculator.useCustomSmelter}
              <div class="custom-input-row">
                <label for="customSmelterPct">削減率 (%)</label>
                <input
                  id="customSmelterPct"
                  type="number"
                  min="0"
                  max="99"
                  step="0.1"
                  value={$metalCalculator.smelterCustomPct}
                  on:input={handleCustomPctInput}
                  class="custom-pct-input"
                />
              </div>
              <p class="smelter-hint">
                サーバーの設定ファイル（metalworking.json）で変更された値を入力してください。
              </p>
            {/if}

            {#if $metalCalculation.smelterReductionPct > 0}
              <div class="smelter-summary">
                <span>適用中の削減率: <strong>{$metalCalculation.smelterReductionPct}%</strong></span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </CalculatorCard>

    <CalculatorCard title="計算結果まとめ" headingTag="h3">
      <div class="calculator-meta-grid">
        <p class="calculator-meta-item">
          <span>必要ナゲット数</span>
          <strong>
            {#if $metalCalculator.smelterEnabled && $metalCalculation.smelterReductionPct > 0}
              <span class="nugget-original">{formatQuantity($metalCalculation.nuggetsNeeded)}</span>
              → {formatQuantity($metalCalculation.nuggetsNeededWithSmelter)}
            {:else}
              {formatQuantity($metalCalculation.nuggetsNeeded)}
            {/if}
          </strong>
        </p>
        <p class="calculator-meta-item">
          <span>溶解温度</span>
          <strong>{$metalCalculation.smeltTemp}</strong>
        </p>
        <p class="calculator-meta-item calculator-meta-item--full">
          <span>使用可能な燃料</span>
          <strong>{$metalCalculation.compatibleFuels}</strong>
        </p>
        <p class="calculator-meta-item calculator-meta-item--full">
          <span>鉱石の入手先</span>
          <strong>{$metalCalculation.oreSources}</strong>
        </p>
      </div>
    </CalculatorCard>

    <ShareButton route="casting" />
  </aside>

  <section class="calculator-workspace" aria-label="鋳造計算機の結果">
    <div id="calculator" class="calculator-main">
      <div class="bar" aria-label="金属カラープレビュー">
        <div
          class="segment"
          style={`flex:1;background:${$metalCalculation.metalColor};`}
        >
          {$metalCalculation.metalName || "-"}
        </div>
      </div>

      <StackPlanPanel
        stackPlan={$metalCalculation.stackPlan}
        hasStackInputs={$metalCalculation.hasStackInputs}
        {formatQuantity}
        unitsPerIngot={$metalCalculation.reducedUnitsPerIngot}
        hasFractionalIngots={$metalCalculation.hasFractionalIngots}
      />
    </div>
  </section>
</section>

<style>
  /* Smelterスキルセクション */
  .smelter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .smelter-toggle-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    cursor: pointer;
  }

  .smelter-toggle-label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .smelter-sublabel {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .toggle-checkbox {
    margin-top: 0.2rem;
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--primary-color);
    flex-shrink: 0;
    cursor: pointer;
  }

  .smelter-options {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-top: 0.25rem;
    border-top: 1px solid var(--border-color);
  }

  .smelter-mode-label {
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .tier-buttons {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .tier-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.35rem 0.7rem;
    border: 1px solid var(--border-color);
    border-radius: calc(var(--border-radius) / 2);
    background: var(--surface);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all var(--transition);
    gap: 0.1rem;
    min-width: 4rem;
  }

  .tier-btn:hover {
    border-color: var(--primary-color);
    background: var(--surface-hover);
  }

  .tier-btn.tier-active {
    border-color: var(--primary-color);
    background: var(--primary-color);
    color: var(--surface);
  }

  .tier-pct {
    font-size: 0.75rem;
    opacity: 0.85;
  }

  .custom-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .custom-row input {
    accent-color: var(--primary-color);
    cursor: pointer;
  }

  .custom-input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .custom-input-row label {
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .custom-pct-input {
    width: 5rem;
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--border-color);
    border-radius: calc(var(--border-radius) / 2);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .custom-pct-input:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  .smelter-hint {
    font-size: 0.76rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  .smelter-summary {
    font-size: 0.85rem;
    padding: 0.35rem 0.6rem;
    background: var(--surface-hover);
    border-radius: calc(var(--border-radius) / 2);
    border-left: 3px solid var(--primary-color);
    color: var(--text-primary);
  }

  .nugget-original {
    text-decoration: line-through;
    color: var(--text-secondary);
    font-weight: normal;
    margin-right: 0.2rem;
  }
</style>
