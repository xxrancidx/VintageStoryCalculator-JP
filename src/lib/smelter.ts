/** XSkills Smelter ability のデフォルト削減率 (Tier 1〜3) */
export const SMELTER_TIER_DEFAULTS: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 20,
  3: 30
};

export type SmelterState = {
  smelterEnabled: boolean;
  smelterTier: 1 | 2 | 3;
  useCustomSmelter: boolean;
  smelterCustomPct: number;
};

/** 有効な削減率 (%) を返す。無効時は 0 */
export const getSmelterReduction = (state: SmelterState): number => {
  if (!state.smelterEnabled) return 0;
  if (state.useCustomSmelter) return state.smelterCustomPct;
  return SMELTER_TIER_DEFAULTS[state.smelterTier];
};
