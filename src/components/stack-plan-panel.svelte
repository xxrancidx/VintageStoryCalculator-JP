<script lang="ts">
  import {
    getProcessLine,
    getProcessStepLabel,
    getStackNote
  } from "../lib/stack-display";
  import type { StackPlanPanelProps } from "../types/components";

  export let stackPlan: StackPlanPanelProps["stackPlan"];
  export let hasStackInputs: StackPlanPanelProps["hasStackInputs"];
  export let formatQuantity: StackPlanPanelProps["formatQuantity"];
  export let unitsPerIngot: number = 100;
  export let hasFractionalIngots: boolean = false;
</script>

<div class="stack-summary">

  {#if hasFractionalIngots}
    <div class="fractional-warning" role="alert">
      <span class="fractional-icon">⚠️</span>
      <div class="fractional-body">
        <strong>端数が発生しています</strong>
        <span>
          指定のインゴット数では、スキル適用後の削減ユニットがモールドの容量に割り切れません。
          ナゲット数はバッチを完成させるため切り上げられており、若干の余剰液体金属が生じます。
        </span>
      </div>
    </div>
  {/if}

  <div class="stack-header">
    <div class="stack-heading-group">
      <p class="stack-headline">溶解スタックプラン</p>
      <p class="stack-note">
        {getStackNote(hasStackInputs, stackPlan)}
      </p>
    </div>
    <div class="stack-metrics" aria-label="スタックプランのサマリー">
      <p class="stack-metric">
        <span>必要スタック数</span>
        <strong>{formatQuantity(stackPlan.totalStacks ?? 0)}</strong>
      </p>
      <p class="stack-metric">
        <span>バッチ数</span>
        <strong>{formatQuantity(stackPlan.processes?.length ?? 0)}</strong>
      </p>
    </div>
  </div>
  <div class="process-list">
    {#each stackPlan.processes ?? [] as process, idx}
      <article class="process-card" aria-label={`バッチ ${idx + 1} のスタック構成`}>
        <div class="process-header">
          <div class="process-heading-group">
            <span class="process-title">バッチ {idx + 1}</span>
            <span class="process-line">{getProcessLine(process, formatQuantity, unitsPerIngot)}</span>
          </div>
          <span
            class="process-step"
            class:process-valid={process.isIngotStepValid !== false}
            class:process-invalid={process.isIngotStepValid === false}
            title={process.isIngotStepValid === false
              ? "バッチサイズは100ユニット（20ナゲット）の倍数である必要があります。"
              : "バッチサイズは100ユニット（20ナゲット）のステップに合っています。"}
          >
            {getProcessStepLabel(process)}
          </span>
        </div>
        <div class="stack-row pairs">
          {#if process.stacks.length}
            {#each process.stacks as stack}
              <div class="stack-pair" aria-label={`${stack.metal} スタック`}>
                <span class="stack-chip">{formatQuantity(stack.amount)}</span>
                <span
                  class="stack-label"
                  style={`--stack-color:${stack.color || "var(--primary-color)"}`}
                >
                  {stack.metal}
                </span>
              </div>
            {/each}
          {:else}
            -
          {/if}
        </div>
      </article>
    {/each}
  </div>
</div>

<style>
  .fractional-warning {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.6rem 0.8rem;
    margin-bottom: 0.75rem;
    background: color-mix(in srgb, #e8a020 12%, var(--surface));
    border: 1px solid color-mix(in srgb, #e8a020 40%, transparent);
    border-left: 3px solid #e8a020;
    border-radius: calc(var(--border-radius) / 2);
    font-size: 0.83rem;
    line-height: 1.5;
  }

  .fractional-icon {
    flex-shrink: 0;
    font-size: 1rem;
    margin-top: 0.1rem;
  }

  .fractional-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    color: var(--text-primary);
  }

  .fractional-body strong {
    color: #e8a020;
  }
</style>
