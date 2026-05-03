<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { NumberInputEvents, NumberInputProps } from "../types/components";
  import { showHelpText } from "../stores/settings";

  export let id: NumberInputProps["id"];
  export let label: NumberInputProps["label"];
  export let value: NumberInputProps["value"] = "";
  export let min: NumberInputProps["min"] = undefined;
  export let max: NumberInputProps["max"] = undefined;
  export let step: NumberInputProps["step"] = undefined;
  export let placeholder: NumberInputProps["placeholder"] = "";
  export let required: NumberInputProps["required"] = false;
  export let disabled: NumberInputProps["disabled"] = false;
  export let inputMode: NumberInputProps["inputMode"] = "numeric";
  export let helpText: NumberInputProps["helpText"] = "";
  export let inputEl: NumberInputProps["inputEl"] = null;

  const dispatch = createEventDispatcher<NumberInputEvents>();

  const parseValue = (event: Event) => {
    const raw = event.target as HTMLInputElement | null;
    const parsed = Number.parseFloat(raw?.value ?? "");
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleInput = (event: Event) => {
    dispatch("input", { value: parseValue(event), rawEvent: event });
  };

  const handleChange = (event: Event) => {
    dispatch("change", { value: parseValue(event), rawEvent: event });
  };

  const stepBy = (delta: number) => {
    if (disabled || !inputEl) return;
    const stepNum = Number(step);
    const safeStep = Number.isFinite(stepNum) && stepNum > 0 ? stepNum : 1;
    const current = Number.parseFloat(inputEl.value);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    let next = safeCurrent + delta * safeStep;
    if (typeof min === "number" && next < min) next = min;
    if (typeof max === "number" && next > max) next = max;
    inputEl.value = String(next);
    // 既存の handleInput / handleChange 経路を再利用するため input 要素から発火させる
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const triggerRipple = (event: MouseEvent) => {
    const btn = event.currentTarget as HTMLButtonElement | null;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const ripple = document.createElement("span");
    ripple.className = "step-btn-ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    // アニメ終了時に自前で除去し DOM の肥大化を防ぐ
    ripple.addEventListener("animationend", () => ripple.remove());
    btn.appendChild(ripple);
  };

  const handleStepClick = (delta: number) => (event: MouseEvent) => {
    triggerRipple(event);
    stepBy(delta);
  };

  $: shouldShowHelp = $showHelpText && helpText;
  $: numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  $: decrementDisabled =
    disabled || (typeof min === "number" && Number.isFinite(numericValue) && numericValue <= min);
  $: incrementDisabled =
    disabled || (typeof max === "number" && Number.isFinite(numericValue) && numericValue >= max);
</script>

<div class="control">
  <label for={id}>{label}</label>
  <!-- ステッパーボタンは Tab フォーカス対象外（tabindex=-1）。入力欄のみがキーボード操作の対象 -->
  <div class="number-input-group" class:is-disabled={disabled}>
    <button
      type="button"
      class="step-btn step-btn--decrement"
      aria-label={`${label}を減らす`}
      tabindex="-1"

      disabled={decrementDisabled}
      on:click={handleStepClick(-1)}
    >
      <span aria-hidden="true">−</span>
    </button>
    <input
      id={id}
      bind:this={inputEl}
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      inputmode={inputMode}
      title={shouldShowHelp ? helpText : undefined}
      aria-describedby={shouldShowHelp ? `${id}-help` : undefined}
      on:input={handleInput}
      on:change={handleChange}
    />
    <button
      type="button"
      class="step-btn step-btn--increment"
      aria-label={`${label}を増やす`}
      tabindex="-1"
      disabled={incrementDisabled}
      on:click={handleStepClick(1)}
    >
      <span aria-hidden="true">＋</span>
    </button>
  </div>
  {#if shouldShowHelp}
    <p class="control-help" id={`${id}-help`}>{helpText}</p>
  {/if}
</div>

<style>
  .number-input-group {
    display: flex;
    align-items: stretch;
    min-height: 48px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .number-input-group:hover:not(.is-disabled) {
    border-color: var(--primary-light);
    box-shadow: var(--shadow-md);
  }
  .number-input-group:focus-within {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md), var(--ring-shadow);
  }
  .number-input-group.is-disabled {
    opacity: 0.6;
  }

  .number-input-group input[type="number"] {
    flex: 1;
    min-width: 0;
    width: 100%;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    text-align: center;
    padding: 12px 8px;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-primary);
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .number-input-group input[type="number"]:hover,
  .number-input-group input[type="number"]:focus {
    border: none;
    box-shadow: none;
    transform: none;
    outline: none;
  }
  /* カスタム +/- ボタンに置換するためブラウザ標準スピナーを非表示にする */
  .number-input-group input[type="number"]::-webkit-outer-spin-button,
  .number-input-group input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .step-btn {
    position: relative;
    flex-shrink: 0;
    width: 3rem;
    min-width: 3rem;
    border: none;
    background: transparent;
    color: var(--primary-color);
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    isolation: isolate;
    transition:
      background-color 0.18s ease,
      color 0.18s ease,
      transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
    touch-action: manipulation;
  }
  .step-btn--decrement {
    border-right: 1px solid var(--border-soft);
  }
  .step-btn--increment {
    border-left: 1px solid var(--border-soft);
  }
  .step-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  }
  .step-btn:hover:not(:disabled) span {
    transform: scale(1.12);
  }
  .step-btn:active:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 28%, transparent);
    color: var(--primary-dark);
    transform: scale(0.9);
    transition-duration: 0.05s;
  }
  .step-btn:active:not(:disabled) span {
    transform: scale(0.82);
    transition-duration: 0.05s;
  }
  .step-btn:focus-visible {
    outline: none;
    background: color-mix(in srgb, var(--primary-color) 14%, transparent);
    box-shadow: inset 0 0 0 2px var(--primary-color);
  }
  .step-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .step-btn span {
    pointer-events: none;
    display: block;
    transform: translateY(-1px);
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .step-btn :global(.step-btn-ripple) {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    background: color-mix(in srgb, var(--primary-color) 38%, transparent);
    transform: scale(0);
    opacity: 0.7;
    animation: step-btn-ripple 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
    z-index: 0;
  }

  @keyframes step-btn-ripple {
    to {
      transform: scale(1);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .step-btn,
    .step-btn span {
      transition: none;
    }
    .step-btn :global(.step-btn-ripple) {
      animation: none;
      display: none;
    }
  }

  @media (max-width: 480px) {
    .step-btn {
      width: 3.25rem;
      min-width: 3.25rem;
      font-size: 1.5rem;
    }
  }
</style>
