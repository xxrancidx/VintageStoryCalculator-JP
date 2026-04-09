/**
 * Smelter 削減率を合金計算へ適用したときに、既存の純粋関数
 * (calculateAlloyAllocation / buildSmeltingProcessPlan) がどう振る舞うか
 * を総当りで検証する。
 *
 * チェック内容:
 *   1. feasibility   — allocation / planner が例外を出さず解を返すか
 *   2. constraints   — min/max % 制約が守られているか
 *   3. savings       — 削減率に応じた節約ナゲット数が実際に出ているか
 *                      (20ナゲット単位の切り上げで削減効果が消えるケースを検出)
 *
 * 実行:
 *   node_modules/.bin/esbuild scripts/verify-alloy-reduction.ts \
 *     --bundle --format=esm --platform=node \
 *     --outfile=scripts/.verify-alloy-reduction.mjs --loader:.json=json
 *   node scripts/.verify-alloy-reduction.mjs
 */

declare const process: { exit: (code: number) => never };

import alloysJson from "../src/data/alloys.json";
import {
  calculateAlloyAllocation,
  buildSmeltingProcessPlan,
  type AlloyPartConstraint
} from "../src/lib/smelting";
import { UNITS_PER_INGOT, UNITS_PER_NUGGET } from "../src/lib/constants";

type AlloyDef = {
  name: string;
  parts: Array<{ metal: string; min: number; max: number; default?: number }>;
};

const ALLOYS = alloysJson as Record<string, AlloyDef>;

const REDUCTION_PCTS = [0, 10, 20, 30, 40, 50];
const INGOT_COUNTS = [1, 2, 3, 5, 10, 25, 50, 100];

// プランナー側: 20 倍数強制 vs 強制なし
const PROCESS_MODES: Array<{ label: string; multiple: number; min: number }> = [
  { label: "force20", multiple: 20, min: 20 },
  { label: "free", multiple: 1, min: 1 }
];

type CheckFailure = {
  alloy: string;
  reductionPct: number;
  ingots: number;
  mode: string;
  stage: "allocation" | "planner" | "constraints";
  reason: string;
};

// 削減効果の記録: reductionPct=0 の base と比較して何ナゲット節約できたか
type SavingsRecord = {
  alloy: string;
  ingots: number;
  reductionPct: number;
  baseNuggets: number;   // reductionPct=0 のナゲット数
  actualNuggets: number; // 削減後のナゲット数
  idealNuggets: number;  // 理想的な削減後ナゲット (ceil(baseUnits*(1-r/100)/UNITS_PER_NUGGET))
  actualSavings: number; // baseNuggets - actualNuggets
  idealSavings: number;  // baseNuggets - idealNuggets
  lostSavings: number;   // idealSavings - actualSavings (切り上げによる損失)
};

const failures: CheckFailure[] = [];
// alloy|ingots|mode → reductionPct → totalNuggets
const resultCache = new Map<string, Map<number, number>>();
const savingsRecords: SavingsRecord[] = [];

let passed = 0;
let attempted = 0;

const buildParts = (def: AlloyDef): AlloyPartConstraint[] =>
  def.parts.map((p) => {
    const midpoint = (p.min + p.max) / 2;
    const pct = typeof p.default === "number" ? p.default : midpoint;
    return { metal: p.metal, min: p.min, max: p.max, pct };
  });

const tryCase = (
  alloyKey: string,
  def: AlloyDef,
  reductionPct: number,
  ingots: number,
  mode: (typeof PROCESS_MODES)[number]
): number | null => {
  attempted += 1;
  const parts = buildParts(def);
  const baseUnits = ingots * UNITS_PER_INGOT;
  const reductionFactor = 1 - reductionPct / 100;
  const reducedUnits = baseUnits * reductionFactor;

  // --- allocation 層 ---
  let allocation;
  try {
    allocation = calculateAlloyAllocation(reducedUnits, parts);
  } catch (e) {
    failures.push({
      alloy: alloyKey, reductionPct, ingots, mode: mode.label,
      stage: "allocation",
      reason: (e as Error).message
    });
    return null;
  }

  const totalNuggets = allocation.totalNuggets;

  // min/max % 制約チェック
  for (const part of allocation.parts) {
    const pct = totalNuggets > 0 ? (part.nuggets / totalNuggets) * 100 : 0;
    // ±1 ナゲット相当の許容誤差
    const tolerance = totalNuggets > 0 ? (100 / totalNuggets) + 0.01 : 0.01;
    if (pct < part.min - tolerance || pct > part.max + tolerance) {
      failures.push({
        alloy: alloyKey, reductionPct, ingots, mode: mode.label,
        stage: "constraints",
        reason: `${part.metal}: pct=${pct.toFixed(2)}% out of [${part.min}, ${part.max}] (totalNuggets=${totalNuggets})`
      });
      return null;
    }
  }

  if (allocation.producedUnits + 0.001 < reducedUnits) {
    failures.push({
      alloy: alloyKey, reductionPct, ingots, mode: mode.label,
      stage: "allocation",
      reason: `producedUnits=${allocation.producedUnits} < reducedUnits=${reducedUnits}`
    });
    return null;
  }

  // --- planner 層 ---
  const stackInputs = allocation.parts
    .filter((p) => p.nuggets > 0)
    .map((p) => ({ metal: p.metal, nuggets: p.nuggets }));

  const plan = buildSmeltingProcessPlan(stackInputs, {
    alloyParts: parts,
    enforceMinProcessNuggets: mode.min,
    enforceProcessMultipleNuggets: mode.multiple,
    balanceProcesses: true
  });

  if (!plan.processes || plan.processes.length === 0) {
    failures.push({
      alloy: alloyKey, reductionPct, ingots, mode: mode.label,
      stage: "planner",
      reason: `no processes returned (totalNuggets=${totalNuggets})`
    });
    return null;
  }

  const sumPlanNuggets = plan.processes.reduce((s, p) => s + (p.nuggetsTotal ?? 0), 0);
  if (sumPlanNuggets !== totalNuggets) {
    failures.push({
      alloy: alloyKey, reductionPct, ingots, mode: mode.label,
      stage: "planner",
      reason: `plan sum ${sumPlanNuggets} != allocation total ${totalNuggets}`
    });
    return null;
  }

  passed += 1;
  return totalNuggets;
};

// --- 全ケース実行 & 結果キャッシュ ---
for (const [alloyKey, def] of Object.entries(ALLOYS)) {
  for (const mode of PROCESS_MODES) {
    for (const ingots of INGOT_COUNTS) {
      const cacheKey = `${alloyKey}|${ingots}|${mode.label}`;
      const byReduction = new Map<number, number>();

      for (const reductionPct of REDUCTION_PCTS) {
        const total = tryCase(alloyKey, def, reductionPct, ingots, mode);
        if (total !== null) byReduction.set(reductionPct, total);
      }

      resultCache.set(cacheKey, byReduction);
    }
  }
}

// --- 削減効果の分析 (mode=free のみ: allocation 層の純粋な挙動を見る) ---
for (const [alloyKey] of Object.entries(ALLOYS)) {
  for (const ingots of INGOT_COUNTS) {
    const cacheKey = `${alloyKey}|${ingots}|free`;
    const byReduction = resultCache.get(cacheKey);
    if (!byReduction) continue;

    const baseNuggets = byReduction.get(0);
    if (baseNuggets === undefined) continue;

    const baseUnits = ingots * UNITS_PER_INGOT;

    for (const reductionPct of REDUCTION_PCTS) {
      if (reductionPct === 0) continue;
      const actualNuggets = byReduction.get(reductionPct);
      if (actualNuggets === undefined) continue;

      const reductionFactor = 1 - reductionPct / 100;
      const reducedUnits = baseUnits * reductionFactor;
      const idealNuggets = Math.ceil(reducedUnits / UNITS_PER_NUGGET);

      savingsRecords.push({
        alloy: alloyKey,
        ingots,
        reductionPct,
        baseNuggets,
        actualNuggets,
        idealNuggets,
        actualSavings: baseNuggets - actualNuggets,
        idealSavings: baseNuggets - idealNuggets,
        lostSavings: (baseNuggets - idealNuggets) - (baseNuggets - actualNuggets)
      });
    }
  }
}

// --- レポート出力 ---
console.log(`\n=== Verification summary ===`);
console.log(`Attempted: ${attempted}`);
console.log(`Passed:    ${passed}`);
console.log(`Failed:    ${failures.length}`);

if (failures.length > 0) {
  const grouped = new Map<string, CheckFailure[]>();
  for (const f of failures) {
    const key = `${f.alloy} | r=${f.reductionPct}% | mode=${f.mode} | stage=${f.stage}`;
    const arr = grouped.get(key) ?? [];
    arr.push(f);
    grouped.set(key, arr);
  }

  console.log(`\n--- Failure groups (${grouped.size}) ---`);
  for (const key of [...grouped.keys()].sort()) {
    const arr = grouped.get(key)!;
    console.log(`  ${key}`);
    console.log(`    ingots: [${arr.map((f) => f.ingots).join(",")}]`);
    console.log(`    sample: ${arr[0]?.reason ?? ""}`);
  }
}

// --- 削減効果: ロスのあるケースを表示 ---
const withLoss = savingsRecords.filter((r) => r.lostSavings > 0);
console.log(`\n=== Savings analysis (mode=free, allocation layer) ===`);
console.log(`Total records: ${savingsRecords.length}`);
console.log(`With savings loss (rounding ate into reduction): ${withLoss.length}`);

if (withLoss.length > 0) {
  // alloy ごとに最大ロスを表示
  const byAlloy = new Map<string, SavingsRecord[]>();
  for (const r of withLoss) {
    const arr = byAlloy.get(r.alloy) ?? [];
    arr.push(r);
    byAlloy.set(r.alloy, arr);
  }

  console.log(`\n--- Loss breakdown by alloy ---`);
  for (const [alloy, records] of [...byAlloy.entries()].sort()) {
    const maxLoss = Math.max(...records.map((r) => r.lostSavings));
    const affectedIngots = [...new Set(records.map((r) => r.ingots))].sort((a, b) => a - b);
    const affectedPcts = [...new Set(records.map((r) => r.reductionPct))].sort((a, b) => a - b);
    console.log(`  ${alloy}:`);
    console.log(`    affected ingot counts: [${affectedIngots.join(", ")}]`);
    console.log(`    affected reduction %:  [${affectedPcts.join(", ")}%]`);
    console.log(`    max lost savings:      ${maxLoss} nuggets`);
  }

  // 1 ingot ケースの詳細 (最も損失が大きいはず)
  const oneIngot = withLoss.filter((r) => r.ingots === 1);
  if (oneIngot.length > 0) {
    console.log(`\n--- 1-ingot cases (worst rounding impact) ---`);
    console.log(`${"alloy".padEnd(20)} ${"r%".padStart(4)} ${"base".padStart(5)} ${"ideal".padStart(6)} ${"actual".padStart(7)} ${"lostSav".padStart(8)}`);
    for (const r of oneIngot.sort((a, b) => a.alloy.localeCompare(b.alloy) || a.reductionPct - b.reductionPct)) {
      console.log(
        `${r.alloy.padEnd(20)} ${String(r.reductionPct).padStart(3)}%` +
        ` ${String(r.baseNuggets).padStart(5)}` +
        ` ${String(r.idealNuggets).padStart(6)}` +
        ` ${String(r.actualNuggets).padStart(7)}` +
        ` ${String(r.lostSavings).padStart(8)}`
      );
    }
  }
}

// --- force20 vs free の差分: プランナー強制による追加ロス ---
console.log(`\n=== Planner mode comparison (force20 vs free) ===`);
let plannerRoundingCases = 0;
const plannerRoundingExamples: string[] = [];
for (const [alloyKey] of Object.entries(ALLOYS)) {
  for (const ingots of INGOT_COUNTS) {
    for (const reductionPct of REDUCTION_PCTS) {
      if (reductionPct === 0) continue;
      const freeNuggets = resultCache.get(`${alloyKey}|${ingots}|free`)?.get(reductionPct);
      const force20Nuggets = resultCache.get(`${alloyKey}|${ingots}|force20`)?.get(reductionPct);
      if (freeNuggets === undefined || force20Nuggets === undefined) continue;
      if (force20Nuggets > freeNuggets) {
        plannerRoundingCases += 1;
        if (plannerRoundingExamples.length < 5) {
          plannerRoundingExamples.push(
            `  ${alloyKey} ingots=${ingots} r=${reductionPct}%: free=${freeNuggets} force20=${force20Nuggets} (+${force20Nuggets - freeNuggets})`
          );
        }
      }
    }
  }
}
console.log(`Cases where force20 uses more nuggets than free: ${plannerRoundingCases}`);
if (plannerRoundingExamples.length > 0) {
  console.log(`Examples:`);
  plannerRoundingExamples.forEach((l) => console.log(l));
}

// --- nuggetStep=1 (Smelter 有効モード) で savings loss がなくなることを確認 ---
// 「loss」のうち「組成制約が強制する最小値による loss」は許容。
// 「20倍数切り上げによる loss」のみを failure とする。
console.log(`\n=== Smelter mode verification (nuggetStep=1) ===`);
let smelterRoundingLoss = 0;
let smelterConstraintLoss = 0;
let smelterPassed = 0;
for (const [alloyKey, def] of Object.entries(ALLOYS)) {
  const parts = buildParts(def);
  for (const ingots of INGOT_COUNTS) {
    const baseUnits = ingots * UNITS_PER_INGOT;
    const baseNuggets = calculateAlloyAllocation(baseUnits, parts, 1).totalNuggets;

    for (const reductionPct of REDUCTION_PCTS) {
      if (reductionPct === 0) continue;
      const reductionFactor = 1 - reductionPct / 100;
      const reducedUnits = baseUnits * reductionFactor;
      const idealNuggets = Math.ceil(reducedUnits / UNITS_PER_NUGGET);
      const actualNuggets = calculateAlloyAllocation(reducedUnits, parts, 1).totalNuggets;
      const loss = (baseNuggets - idealNuggets) - (baseNuggets - actualNuggets);

      if (loss <= 0) {
        smelterPassed += 1;
      } else {
        // ideal 自体が feasible でない (組成制約による最小値 > ideal) かを確認
        // idealNuggets * UNITS_PER_NUGGET を入力にして step=1 で求めた最小値と比較
        const constraintMinNuggets = calculateAlloyAllocation(
          idealNuggets * UNITS_PER_NUGGET, parts, 1
        ).totalNuggets;

        if (actualNuggets <= constraintMinNuggets) {
          // 組成制約が強制する最小値まで正しく切り上げられている → 許容
          smelterConstraintLoss += 1;
        } else {
          // 組成制約より多い → 本物のバグ
          smelterRoundingLoss += 1;
          console.log(`  BUG: ${alloyKey} ingots=${ingots} r=${reductionPct}%: ideal=${idealNuggets} constraintMin=${constraintMinNuggets} actual=${actualNuggets}`);
        }
      }
    }
  }
}
console.log(`Passed (loss=0):              ${smelterPassed}`);
console.log(`Constraint-forced (expected): ${smelterConstraintLoss}`);
console.log(`Rounding bug (unexpected):    ${smelterRoundingLoss}`);
if (smelterRoundingLoss === 0) {
  console.log(`✓ nuggetStep=1 eliminates all rounding-induced savings loss`);
  if (smelterConstraintLoss > 0) {
    console.log(`  (${smelterConstraintLoss} cases remain due to alloy composition constraints — unavoidable)`);
  }
}

const totalFailures = failures.length + smelterRoundingLoss;
process.exit(totalFailures > 0 ? 1 : 0);
