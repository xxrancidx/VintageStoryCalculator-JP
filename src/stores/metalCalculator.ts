import { derived, writable } from "svelte/store";
import metalDefinitionsRaw from "../data/metals.json";
import {
  UNITS_PER_INGOT,
  UNITS_PER_NUGGET,
  formatTemperature,
  getMetalColor
} from "../lib/constants";
import { computeIngotStackPlan, computeStackPlan } from "../lib/stack-plan";
import { formatFuelList, getCompatibleFuels } from "../lib/fuels";
import { calculatePureMetalAllocation } from "../lib/smelting";
import type { Metal } from "../types/index";

export type MetalCalculatorState = {
  selectedMetal: string;
  targetIngots: number;
  smelterEnabled: boolean;
  smelterTier: 1 | 2 | 3;
  useCustomSmelter: boolean;
  smelterCustomPct: number;
};

/** XSkills Smelter ability のデフォルト削減率 (Tier 1〜3) */
export const SMELTER_TIER_DEFAULTS: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 20,
  3: 25
};

const METAL_DEFINITIONS = metalDefinitionsRaw as Record<string, Metal>;

const getMetalDefinition = (key: string) => METAL_DEFINITIONS[key];

const initializeState = (): MetalCalculatorState => {
  const metalKeys = Object.keys(METAL_DEFINITIONS);
  return {
    selectedMetal: metalKeys[0] ?? "",
    targetIngots: 10,
    smelterEnabled: false,
    smelterTier: 3,
    useCustomSmelter: false,
    smelterCustomPct: 25
  };
};

export const metalCalculator = writable<MetalCalculatorState>(initializeState());

export const setSelectedMetal = (metalKey: string) => {
  const definition = getMetalDefinition(metalKey);
  if (!definition) return;
  metalCalculator.update((state) => ({ ...state, selectedMetal: metalKey }));
};

export const setTargetIngots = (value: number | null) => {
  const target = Math.max(0, Number(value) || 0);
  metalCalculator.update((state) => ({ ...state, targetIngots: target }));
};

export const setSmelterEnabled = (enabled: boolean) => {
  metalCalculator.update((state) => ({ ...state, smelterEnabled: enabled }));
};

export const setSmelterTier = (tier: 1 | 2 | 3) => {
  metalCalculator.update((state) => ({ ...state, smelterTier: tier }));
};

export const setSmelterCustomPct = (pct: number) => {
  const safe = Math.min(99, Math.max(0, Number.isFinite(pct) ? pct : 0));
  metalCalculator.update((state) => ({ ...state, smelterCustomPct: safe }));
};

export const setUseCustomSmelter = (custom: boolean) => {
  metalCalculator.update((state) => ({ ...state, useCustomSmelter: custom }));
};

export const applyState = (partial: Partial<MetalCalculatorState>) => {
  metalCalculator.update((state) => {
    const next = { ...state };
    if (partial.selectedMetal !== undefined) {
      const def = getMetalDefinition(partial.selectedMetal);
      if (def) next.selectedMetal = partial.selectedMetal;
    }
    if (partial.targetIngots !== undefined) {
      next.targetIngots = Math.max(0, Number(partial.targetIngots) || 0);
    }
    return next;
  });
};

const getSmelterReduction = (state: MetalCalculatorState): number => {
  if (!state.smelterEnabled) return 0;
  if (state.useCustomSmelter) return state.smelterCustomPct;
  return SMELTER_TIER_DEFAULTS[state.smelterTier];
};

export const metalCalculation = derived(metalCalculator, (state) => {
  const definition = getMetalDefinition(state.selectedMetal);
  if (!definition) {
    return {
      metalName: "",
      metalColor: "#ccc",
      smeltTemp: formatTemperature(undefined),
      compatibleFuels: formatFuelList(undefined),
      oreSources: "-",
      nuggetsNeeded: 0,
      nuggetsNeededWithSmelter: 0,
      smelterReductionPct: 0,
      hasStackInputs: false,
      stackPlan: computeIngotStackPlan([])
    };
  }

  const metalColor = definition.color || getMetalColor(state.selectedMetal || definition.name);
  const smelterReductionPct = getSmelterReduction(state);
  const reductionFactor = 1 - smelterReductionPct / 100;

  const requiredUnits = Math.max(0, state.targetIngots) * UNITS_PER_INGOT;
  const casting = calculatePureMetalAllocation(requiredUnits, definition.name, metalColor);
  const nuggetsNeeded = casting.requiredNuggets;

  const reducedUnits = requiredUnits * reductionFactor;
  const nuggetsNeededWithSmelter = state.smelterEnabled
    ? Math.ceil(reducedUnits / UNITS_PER_NUGGET)
    : nuggetsNeeded;

  const castingForStack = state.smelterEnabled
    ? calculatePureMetalAllocation(reducedUnits, definition.name, metalColor)
    : casting;

  const reducedUnitsPerIngot = state.smelterEnabled
    ? UNITS_PER_INGOT * reductionFactor
    : UNITS_PER_INGOT;

  const actualIngots =
    (nuggetsNeededWithSmelter * UNITS_PER_NUGGET) / reducedUnitsPerIngot;
  const hasFractionalIngots =
    state.smelterEnabled &&
    Math.abs(actualIngots - Math.round(actualIngots)) > 0.001;

  const compatibleFuels = formatFuelList(getCompatibleFuels(definition.smeltTemp));
  const stackInputs = nuggetsNeededWithSmelter
    ? castingForStack.metals.map((entry) => ({
        metal: entry.metal,
        color: entry.color,
        nuggets: entry.nuggets
      }))
    : [];

  return {
    metalName: definition.name,
    metalColor,
    smeltTemp: formatTemperature(definition.smeltTemp),
    compatibleFuels,
    oreSources: definition.ores.join("、"),
    nuggetsNeeded,
    nuggetsNeededWithSmelter,
    smelterReductionPct,
    reducedUnitsPerIngot,
    hasFractionalIngots,
    hasStackInputs: stackInputs.length > 0,
    // Smelter有効時は削減後のナゲット数が20の倍数にならない場合があるため
    // インゴット単位の強制なしのプランナーを使用する
    stackPlan: state.smelterEnabled
      ? computeStackPlan(stackInputs)
      : computeIngotStackPlan(stackInputs)
  };
});
