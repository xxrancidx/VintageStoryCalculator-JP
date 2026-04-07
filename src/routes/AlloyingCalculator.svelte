<script lang="ts">
  import CalculatorCard from "../components/calculator-card.svelte";
  import NumberInput from "../components/number-input.svelte";
  import SelectInput from "../components/select-input.svelte";
  import ShareButton from "../components/share-button.svelte";
  import StackPlanPanel from "../components/stack-plan-panel.svelte";
  import alloyDefinitionsRaw from "../data/alloys.json";
  import { NUGGETS_PER_INGOT } from "../lib/constants";
  import { formatWholeNumber } from "../lib/numberFormatting";
  import {
    ALLOY_PERCENT_PRECISION,
    ALLOY_PERCENT_STEP,
    alloyCalculation,
    alloyCalculator,
    setMetalPercentage,
    setSelectedAlloy,
    setTargetIngots
  } from "../stores/alloyCalculator";
  import type { Alloy } from "../types/index";
  import type { SelectOption } from "../types/components";

  const alloys = alloyDefinitionsRaw as Record<string, Alloy>;

  const alloyKeys = Object.keys(alloys);
  const alloyOptions: Array<SelectOption<string>> = alloyKeys.map((key) => ({
    value: key,
    label: alloys[key]?.name ?? key
  }));

  const formatQuantity = formatWholeNumber;

  const handleAlloyChange = (event: CustomEvent<{ value: string }>) => {
    setSelectedAlloy(event.detail.value);
  };

  const handleIngotsInput = (event: CustomEvent<{ value: number | null }>) => {
    setTargetIngots(event.detail.value);
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
          <strong>{formatQuantity($alloyCalculation.totalUnits)}</strong>
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
              <td data-label="金属">{part.metal}</td>
              <td data-label="レシピ %">
                <input
                  class="percent"
                  type="number"
                  inputmode="decimal"
                  aria-label={`${part.metal} 配合率`}
                  title={`${part.metal} の目標配合率（${part.min}〜${part.max}%）`}
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
                  aria-label={`${part.metal} 配合率スライダー`}
                  title={`${part.metal} の配合率を調整（${part.min}〜${part.max}%）`}
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
