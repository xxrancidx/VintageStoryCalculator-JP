// src/data/alloys.json
var alloys_default = {
  brass: {
    name: "Brass",
    smeltTemp: 920,
    parts: [
      { metal: "Copper", min: 60, max: 70 },
      { metal: "Zinc", min: 30, max: 40 }
    ]
  },
  tin_bronze: {
    name: "Tin Bronze",
    smeltTemp: 950,
    parts: [
      { metal: "Copper", min: 88, max: 92 },
      { metal: "Tin", min: 8, max: 12 }
    ]
  },
  bismuth_bronze: {
    name: "Bismuth Bronze",
    smeltTemp: 850,
    parts: [
      { metal: "Copper", min: 50, max: 70 },
      { metal: "Zinc", min: 20, max: 30 },
      { metal: "Bismuth", min: 10, max: 20 }
    ]
  },
  black_bronze: {
    name: "Black Bronze",
    smeltTemp: 1020,
    parts: [
      { metal: "Copper", min: 68, max: 84, default: 80 },
      { metal: "Gold", min: 8, max: 16, default: 10 },
      { metal: "Silver", min: 8, max: 16, default: 10 }
    ]
  },
  lead_solder: {
    name: "Lead Solder",
    smeltTemp: 327,
    parts: [
      { metal: "Lead", min: 45, max: 55 },
      { metal: "Tin", min: 45, max: 55 }
    ]
  },
  molybdochalkos: {
    name: "Molybdochalkos",
    smeltTemp: 902,
    parts: [
      { metal: "Lead", min: 88, max: 92 },
      { metal: "Copper", min: 8, max: 12 }
    ]
  },
  silver_solder: {
    name: "Silver Solder",
    smeltTemp: 758,
    parts: [
      { metal: "Tin", min: 50, max: 60 },
      { metal: "Silver", min: 40, max: 50 }
    ]
  },
  electrum: {
    name: "Electrum",
    smeltTemp: 1010,
    parts: [
      { metal: "Gold", min: 40, max: 60 },
      { metal: "Silver", min: 40, max: 60 }
    ]
  },
  cupronickel: {
    name: "Cupronickel",
    smeltTemp: 1171,
    parts: [
      { metal: "Copper", min: 65, max: 75 },
      { metal: "Nickel", min: 25, max: 35 }
    ]
  }
};

// src/data/constants.json
var constants_default = {
  unitsPerIngot: 100,
  unitsPerNugget: 5,
  nuggetsPerIngot: 20,
  stackSize: 128,
  maxStacksPerProcess: 4,
  renderingTemperatures: {
    unit: "\xB0C",
    fallback: "-"
  },
  metalColors: {
    copper: "#b87333",
    gold: "#ffd700",
    silver: "#c0c0ff",
    tin: "#c0c0c0",
    zinc: "#d0d8ff",
    bismuth: "#f5f0e1",
    lead: "#9aa0a6",
    nickel: "#e6e6e6"
  }
};

// src/lib/constants.ts
var UNITS_PER_INGOT = constants_default.unitsPerIngot;
var UNITS_PER_NUGGET = constants_default.unitsPerNugget;
var NUGGETS_PER_INGOT = constants_default.nuggetsPerIngot;
var STACK_SIZE = constants_default.stackSize;
var MAX_STACKS_PER_PROCESS = constants_default.maxStacksPerProcess;
var METAL_COLOR_PALETTE = constants_default.metalColors;
var TEMPERATURE_RENDERING = constants_default.renderingTemperatures;

// src/lib/smelting/allocation.ts
var clamp = (value, min, max) => Math.min(Math.max(value, min), max);
var normalizeTargetPercents = (parts) => {
  const rawTargets = parts.map((part) => {
    const midpoint = (part.min + part.max) / 2;
    const preferred = Number.isFinite(part.pct) ? part.pct ?? midpoint : midpoint;
    return clamp(preferred, part.min, part.max);
  });
  const total = rawTargets.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return rawTargets.map(() => 100 / Math.max(parts.length, 1));
  }
  return rawTargets.map((value) => value / total * 100);
};
var buildBounds = (totalNuggets, parts) => parts.map((part) => ({
  minNuggets: Math.ceil(totalNuggets * part.min / 100),
  maxNuggets: Math.floor(totalNuggets * part.max / 100)
}));
var isFeasibleTotal = (totalNuggets, bounds) => {
  const minSum = bounds.reduce((sum, bound) => sum + bound.minNuggets, 0);
  const maxSum = bounds.reduce((sum, bound) => sum + bound.maxNuggets, 0);
  return minSum <= totalNuggets && totalNuggets <= maxSum;
};
var findFeasibleTotalNuggets = (requiredNuggets, parts, step = 1) => {
  const maxAttempts = 5e3;
  const safeStep = Math.max(1, Math.floor(step));
  let totalNuggets = Math.max(0, requiredNuggets);
  if (safeStep > 1) {
    totalNuggets = Math.ceil(totalNuggets / safeStep) * safeStep;
  }
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const bounds = buildBounds(totalNuggets, parts);
    if (isFeasibleTotal(totalNuggets, bounds)) {
      return totalNuggets;
    }
    totalNuggets += safeStep;
  }
  throw new Error("Unable to find feasible alloy nugget total within search range.");
};
var allocateWithinBounds = (totalNuggets, bounds, targetPercents) => {
  const allocation = bounds.map((bound) => bound.minNuggets);
  let remaining = totalNuggets - allocation.reduce((sum, value) => sum + value, 0);
  while (remaining > 0) {
    let bestIdx = -1;
    let bestImprovement = Number.NEGATIVE_INFINITY;
    let bestGap = Number.NEGATIVE_INFINITY;
    for (let idx = 0; idx < allocation.length; idx += 1) {
      const current = allocation[idx];
      const bound = bounds[idx];
      const targetPct = targetPercents[idx];
      if (!bound || targetPct === void 0 || current === void 0) continue;
      if (current >= bound.maxNuggets) continue;
      const ideal = totalNuggets * targetPct / 100;
      const currentError = Math.abs(current - ideal);
      const nextError = Math.abs(current + 1 - ideal);
      const improvement = currentError - nextError;
      const gap = ideal - current;
      if (improvement > bestImprovement || improvement === bestImprovement && gap > bestGap || improvement === bestImprovement && gap === bestGap && idx < bestIdx) {
        bestIdx = idx;
        bestImprovement = improvement;
        bestGap = gap;
      }
    }
    if (bestIdx === -1) break;
    allocation[bestIdx] = (allocation[bestIdx] ?? 0) + 1;
    remaining -= 1;
  }
  if (remaining > 0) {
    for (let idx = 0; idx < allocation.length && remaining > 0; idx += 1) {
      const current = allocation[idx];
      const bound = bounds[idx];
      if (!bound || current === void 0) continue;
      const room = bound.maxNuggets - current;
      if (room <= 0) continue;
      const add = Math.min(room, remaining);
      allocation[idx] = current + add;
      remaining -= add;
    }
  }
  return allocation;
};
var calculateAlloyAllocation = (requiredUnits, parts) => {
  const safeUnits = Math.max(0, Number.isFinite(requiredUnits) ? requiredUnits : 0);
  if (!parts.length) {
    return {
      requiredUnits: safeUnits,
      totalNuggets: 0,
      producedUnits: 0,
      overageUnits: -safeUnits,
      parts: []
    };
  }
  const requiredNuggets = Math.ceil(safeUnits / UNITS_PER_NUGGET);
  if (requiredNuggets === 0) {
    return {
      requiredUnits: safeUnits,
      totalNuggets: 0,
      producedUnits: 0,
      overageUnits: -safeUnits,
      parts: parts.map((part) => ({
        metal: part.metal,
        color: part.color,
        nuggets: 0,
        units: 0,
        min: part.min,
        max: part.max,
        pctTarget: Number.isFinite(part.pct) ? part.pct ?? 0 : 0,
        pctActual: 0
      }))
    };
  }
  const totalNuggets = findFeasibleTotalNuggets(
    requiredNuggets,
    parts,
    NUGGETS_PER_INGOT
  );
  const bounds = buildBounds(totalNuggets, parts);
  const targetPercents = normalizeTargetPercents(parts);
  const allocation = allocateWithinBounds(totalNuggets, bounds, targetPercents);
  const producedUnits = totalNuggets * UNITS_PER_NUGGET;
  return {
    requiredUnits: safeUnits,
    totalNuggets,
    producedUnits,
    overageUnits: producedUnits - safeUnits,
    parts: parts.map((part, idx) => {
      const nuggets = allocation[idx] ?? 0;
      const targetPct = targetPercents[idx] ?? 0;
      return {
        metal: part.metal,
        color: part.color,
        nuggets,
        units: nuggets * UNITS_PER_NUGGET,
        min: part.min,
        max: part.max,
        pctTarget: targetPct,
        pctActual: totalNuggets > 0 ? nuggets / totalNuggets * 100 : 0
      };
    })
  };
};

// <stdin>
var ALLOYS = alloys_default;
var REDUCTION_PCTS = [0, 10, 20, 30, 40, 50];
var INGOT_COUNTS = [1, 2, 3, 5, 10, 25, 50, 100];
for (const [key, def] of Object.entries(ALLOYS)) {
  const parts = def.parts.map((p) => {
    const mid = (p.min + p.max) / 2;
    return { metal: p.metal, min: p.min, max: p.max, pct: p.default ?? mid };
  });
  for (const ingots of INGOT_COUNTS) {
    const base = calculateAlloyAllocation(ingots * 100, parts).totalNuggets;
    for (const r of REDUCTION_PCTS) {
      if (r === 0) continue;
      const reducedUnits = ingots * 100 * (1 - r / 100);
      const ideal = Math.ceil(reducedUnits / 5);
      const actual = calculateAlloyAllocation(reducedUnits, parts).totalNuggets;
      const loss = base - ideal - (base - actual);
      if (loss >= 18) {
        console.log(`${key} ingots=${ingots} r=${r}%: base=${base} ideal=${ideal} actual=${actual} loss=${loss}`);
      }
    }
  }
}
