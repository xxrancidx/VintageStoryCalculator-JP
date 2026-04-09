<script lang="ts">
  import CalculatorCard from "../components/calculator-card.svelte";
  import NumberInput from "../components/number-input.svelte";
  import SelectInput from "../components/select-input.svelte";
  import ShareButton from "../components/share-button.svelte";
  import StackPlanPanel from "../components/stack-plan-panel.svelte";
  import alloyDefinitionsRaw from "../data/alloys.json";
  import { NUGGETS_PER_INGOT } from "../lib/constants";
  import { displayAlloy, displayMetal } from "../lib/metal-names";
  import { formatWholeNumber } from "../lib/numberFormatting";
  import {
    ALLOY_PERCENT_PRECISION,
    ALLOY_PERCENT_STEP,
    SMELTER_TIER_DEFAULTS,
    alloyCalculation,
    alloyCalculator,
    setMetalPercentage,
    setSelectedAlloy,
    setSmelterCustomPct,
    setSmelterEnabled,
    setSmelterTier,
    setTargetIngots,
    setUseCustomSmelter
  } from "../stores/alloyCalculator";
  import type { Alloy } from "../types/index";
  import type { SelectOption } from "../types/components";

  const alloys = alloyDefinitionsRaw as Record<string, Alloy>;

  const alloyKeys = Object.keys(alloys);
  const alloyOptions: Array<SelectOption<string>> = alloyKeys.map((key) => ({
    value: key,
    label: displayAlloy(alloys[key]?.name ?? key)
  }));

  const formatQuantity = formatWholeNumber;
  const smelterTiers: Array<1 | 2 | 3> = [1, 2, 3];

  const handleAlloyChange = (event: CustomEvent<{ value: string }>) => {
    setSelectedAlloy(event.detail.value);
  };

  const handleIngotsInput = (event: CustomEvent<{ value: number | null }>) => {
    setTargetIngots(event.detail.value);
  };

  const handleSmelterToggle = (event: Event) => {
    setSmelterEnabled((event.target as HTMLInputElement).checked);
  };

  const handleTierSelect = (tier: 1 | 2 | 3) => {
    setSmelterTier(tier);
    setUseCustomSmelter(false);
  };

  const handleCustomToggle = (event: Event) => {
    setUseCustomSmelter((event.target as HTMLInputElement).checked);
  };

  const handleCustomPctInput = (event: Event) => {
    const val = Number.parseFloat((event.target as HTMLInputElement).value);
    if (Number.isFinite(val)) setSmelterCustomPct(val);
  };

  const handlePercentInput = (metal: string, event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const value = Number.parseFloat(target?.value ?? "");
    if (!Number.isFinite(value)) return;
    setMetalPercentage(metal, value);
  };
</script>

<section class="calculator-shell">
  <aside class="calculator-rail" aria-label="合金計算機の入力">
    <CalculatorCard
      title="合金計算機"
      subtitle="ブレンド計画"
    >
      <p>
        各合金レシピに必要な正確な金属量を計算します。インゴット1個 = {NUGGETS_PER_INGOT}ナゲット。
      </p>
    </CalculatorCard>

    <div class="controls">
      <SelectInput
        id="alloySelect"
        label="合金を選択"
        options={alloyOptions}
        value={$alloyCalculator.selectedAlloy}
        helpText="計算したい合金レシピを選んでください。"
        on:change={handleAlloyChange}
      />

      <NumberInput
        id="targetIngots"
        label="目標インゴット数"
        value={$alloyCalculator.targetIngots}
        min={0}
        step={1}
        helpText="製造したいインゴットの総数。"
        on:input={handleIngotsInput}
      />
    </div>

    <CalculatorCard title="計算結果まとめ" headingTag="h3">
      <div class="calculator-meta-grid">
        <p class="calculator-meta-item">
          <span>合計ユニット数</span>
          <strong>
            {#if $alloyCalculator.smelterEnabled && $alloyCalculation.smelterReductionPct > 0}
              <span class="nugget-original">{formatQuantity($alloyCalculation.totalUnits)}</span>
              → {formatQuantity($alloyCalculation.producedUnits ?? 0)}
            {:else}
              {formatQuantity($alloyCalculation.totalUnits)}
            {/if}
          </strong>
        </p>
        <p class="calculator-meta-item">
          <span>溶解温度</span>
          <strong>{$alloyCalculation.smeltTemp}</strong>
        </p>
        <p class="calculator-meta-item calculator-meta-item--full">
          <span>使用可能な燃料</span>
          <strong>{$alloyCalculation.compatibleFuels}</strong>
        </p>
      </div>
    </CalculatorCard>

    <!-- XSkills Smelterスキルセクション -->
    <CalculatorCard title="XSkills: 鋳造師スキル" headingTag="h3">
      <div class="smelter-section">
        <label class="smelter-toggle-row">
          <span class="smelter-toggle-label">
            <strong>鋳造師 (Smelter) スキルを適用</strong>
            <span class="smelter-sublabel">合金精錬に必要なナゲット数を削減します</span>
          </span>
          <input
            type="checkbox"
            checked={$alloyCalculator.smelterEnabled}
            on:change={handleSmelterToggle}
          />
        </label>

        {#if $alloyCalculator.smelterEnabled}
          <div class="smelter-options">
            <p class="smelter-mode-label">スキルレベル（デフォルト値）</p>
            <div class="tier-buttons">
              {#each smelterTiers as tier (tier)}
                <button
                  class="tier-btn"
                  class:tier-active={!$alloyCalculator.useCustomSmelter && $alloyCalculator.smelterTier === tier}
                  on:click={() => handleTierSelect(tier)}
                >
                  Tier {tier}<span class="tier-pct">-{SMELTER_TIER_DEFAULTS[tier]}%</span>
                </button>
              {/each}
            </div>

            <label class="custom-toggle-row">
              <input
                type="checkbox"
                checked={$alloyCalculator.useCustomSmelter}
                on:change={handleCustomToggle}
              />
              カスタム値を使用
            </label>

            {#if $alloyCalculator.useCustomSmelter}
              <div class="custom-pct-row">
                <label for="alloyCustomSmelterPct">削減率 (%)</label>
                <input
                  id="alloyCustomSmelterPct"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  max="99"
                  step="1"
                  value={$alloyCalculator.smelterCustomPct}
                  on:input={handleCustomPctInput}
                  on:change={handleCustomPctInput}
                />
              </div>
            {/if}

            {#if $alloyCalculation.smelterReductionPct > 0}
              <div class="smelter-summary">
                <span>適用中の削減率: <strong>{$alloyCalculation.smelterReductionPct}%</strong></span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </CalculatorCard>

    <ShareButton route="alloying" />
  </aside>

  <section class="calculator-workspace" aria-label="合金レシピの結果">
    <div id="calculator" class="calculator-main">
      <table aria-label="合金レシピ">
        <thead>
          <tr>
            <th>金属</th>
            <th title="各金属のレシピ配合率。">レシピ %</th>
            <th title="目標インゴット数に必要なユニット数。">必要ユニット</th>
            <th title="各金属の必要ナゲット数。">ナゲット</th>
            <th title="スライダーで配合率を微調整。">調整</th>
          </tr>
        </thead>
        <tbody>
          {#each $alloyCalculation.parts as part}
            <tr>
              <td data-label="金属">{displayMetal(part.metal)}</td>
              <td data-label="レシピ %">
                <input
                  class="percent"
                  type="number"
                  inputmode="decimal"
                  aria-label={`${displayMetal(part.metal)} 配合率`}
                  title={`${displayMetal(part.metal)} の目標配合率（${part.min}〜${part.max}%）`}
                  value={part.pct.toFixed(ALLOY_PERCENT_PRECISION)}
                  min={part.min}
                  max={part.max}
                  step={ALLOY_PERCENT_STEP}
                  on:input={(event) => handlePercentInput(part.metal, event)}
                  on:change={(event) => handlePercentInput(part.metal, event)}
                />
              </td>
              <td class="units" data-label="必要ユニット">{formatQuantity(part.units)}</td>
              <td class="nuggets" data-label="ナゲット">{formatQuantity(part.nuggets)}</td>
              <td class="sliders" data-label="調整">
                <input
                  class="slider"
                  type="range"
                  min={part.min}
                  max={part.max}
                  step={ALLOY_PERCENT_STEP}
                  value={part.pct}
                  aria-label={`${displayMetal(part.metal)} 配合率スライダー`}
                  title={`${displayMetal(part.metal)} の配合率を調整（${part.min}〜${part.max}%）`}
                  on:input={(event) => handlePercentInput(part.metal, event)}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <div class="bar" aria-label="合金の配合比率">
        {#each $alloyCalculation.barSegments as segment}
          <div
            class="segment"
            style={`flex:${segment.flex};background:${segment.color};`}
          >
            {segment.label}
          </div>
        {/each}
      </div>

      <StackPlanPanel
        stackPlan={$alloyCalculation.stackPlan}
        hasStackInputs={$alloyCalculation.hasStackInputs}
        {formatQuantity}
      />
    </div>
  </section>
</section>

<style>
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

  .custom-toggle-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .custom-toggle-row input {
    accent-color: var(--primary-color);
    cursor: pointer;
  }

  .custom-pct-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .custom-pct-row label {
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .custom-pct-row input {
    width: 5rem;
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--border-color);
    border-radius: calc(var(--border-radius) / 2);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .custom-pct-row input:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
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
