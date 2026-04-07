import type { Calculation } from "../types";

export type ProcessView = NonNullable<Calculation["processes"]>[number];

export type StackPlanView = {
  processes?: ProcessView[];
  totalStacks?: number;
  requiresMultipleProcesses?: boolean;
};

export const getStackNote = (
  hasStackInputs: boolean,
  stackPlan: StackPlanView
): string => {
  if (!hasStackInputs) {
    return "インゴット数を入力するとスタック構成が表示されます。";
  }

  const processCount = stackPlan.processes?.length || (stackPlan.totalStacks ? 1 : 0);
  return stackPlan.requiresMultipleProcesses
    ? `${processCount} 回の溶解バッチが必要です（4スタック上限）。`
    : "1回の溶解バッチに収まります（4スタック上限）。";
};

export const getProcessLine = (
  process: ProcessView,
  formatQuantity: (value: number) => string,
  unitsPerIngot = 100
): string => {
  const nuggets = process.nuggetsTotal ?? process.stacks.reduce((sum, stack) => sum + stack.amount, 0);
  const units = process.unitsTotal ?? nuggets * 5;
  const ingots = units / unitsPerIngot;
  return `${formatQuantity(units)} ユニット • ${ingots.toFixed(2).replace(/\.00$/, "")} インゴット`;
};

export const getProcessStepLabel = (process: ProcessView): string =>
  process.isIngotStepValid === false ? "無効" : "有効";
