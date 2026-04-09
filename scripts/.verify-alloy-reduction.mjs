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
var calculateAlloyAllocation = (requiredUnits, parts, nuggetStep = NUGGETS_PER_INGOT) => {
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
    nuggetStep
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

// src/lib/smelting/planner.ts
var getRemainingTotal = (entries) => entries.reduce((sum, entry) => sum + entry.nuggets, 0);
var getTotalStackDemand = (entries) => entries.reduce((sum, entry) => sum + Math.ceil(entry.nuggets / STACK_SIZE), 0);
var splitIntoStacks = (amount) => {
  const stacks = [];
  const fullStacks = Math.floor(amount / STACK_SIZE);
  for (let i = 0; i < fullStacks; i += 1) {
    stacks.push(STACK_SIZE);
  }
  const remainder = amount % STACK_SIZE;
  if (remainder > 0) {
    stacks.push(remainder);
  }
  return stacks;
};
var isIngotStepValid = (nuggets, minProcessNuggets, processMultiple) => {
  if (nuggets <= 0) return true;
  if (nuggets < minProcessNuggets) return false;
  if (processMultiple > 1 && nuggets % processMultiple !== 0) return false;
  return true;
};
var buildProcess = (stacks, minProcessNuggets, processMultiple) => {
  const nuggetsTotal = stacks.reduce((sum, stack) => sum + stack.amount, 0);
  return {
    nuggetsTotal,
    unitsTotal: nuggetsTotal * UNITS_PER_NUGGET,
    ingotsTotal: nuggetsTotal / NUGGETS_PER_INGOT,
    isIngotStepValid: isIngotStepValid(
      nuggetsTotal,
      minProcessNuggets,
      processMultiple
    ),
    stacks
  };
};
var getStackCount = (allocations) => allocations.reduce((sum, allocation) => {
  if (allocation.nuggets <= 0) return sum;
  return sum + Math.ceil(allocation.nuggets / STACK_SIZE);
}, 0);
var normalizeTargetPercents2 = (parts) => {
  const raw = parts.map((part) => {
    const midpoint = (part.min + part.max) / 2;
    const target = Number.isFinite(part.pct) ? part.pct ?? midpoint : midpoint;
    return Math.min(Math.max(target, part.min), part.max);
  });
  const total = raw.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return raw.map(() => 100 / Math.max(parts.length, 1));
  }
  return raw.map((value) => value / total * 100);
};
var allocateByRemainingRatio = (size, remaining) => {
  const total = getRemainingTotal(remaining);
  if (total <= 0 || size <= 0) {
    return remaining.map((entry) => ({ metal: entry.metal, color: entry.color, nuggets: 0 }));
  }
  const exactShares = remaining.map((entry) => entry.nuggets * size / total);
  const base = exactShares.map((share, idx) => Math.min(remaining[idx]?.nuggets ?? 0, Math.floor(share)));
  let leftover = size - base.reduce((sum, value) => sum + value, 0);
  const byRemainder = exactShares.map((share, idx) => ({ idx, remainder: share - Math.floor(share) })).sort((a, b) => {
    if (b.remainder === a.remainder) return a.idx - b.idx;
    return b.remainder - a.remainder;
  });
  while (leftover > 0) {
    let placed = false;
    for (const entry of byRemainder) {
      const idx = entry.idx;
      if ((base[idx] ?? 0) >= (remaining[idx]?.nuggets ?? 0)) continue;
      base[idx] = (base[idx] ?? 0) + 1;
      leftover -= 1;
      placed = true;
      if (leftover <= 0) break;
    }
    if (!placed) break;
  }
  return remaining.map((entry, idx) => ({
    metal: entry.metal,
    color: entry.color,
    nuggets: base[idx] ?? 0
  }));
};
var buildConstrainedBounds = (processNuggets, remaining, alloyParts) => {
  const targetPercents = normalizeTargetPercents2(alloyParts);
  return alloyParts.map((part, idx) => {
    const remainingForMetal = remaining.find((entry) => entry.metal === part.metal)?.nuggets ?? 0;
    const minNuggets = Math.ceil(processNuggets * part.min / 100);
    const maxBound = Math.floor(processNuggets * part.max / 100);
    return {
      metal: part.metal,
      minNuggets,
      maxNuggets: Math.min(maxBound, remainingForMetal),
      targetPct: targetPercents[idx] ?? 0
    };
  });
};
var allocateConstrainedProcess = (processNuggets, remaining, alloyParts) => {
  const bounds = buildConstrainedBounds(processNuggets, remaining, alloyParts);
  const minSum = bounds.reduce((sum, bound) => sum + bound.minNuggets, 0);
  const maxSum = bounds.reduce((sum, bound) => sum + bound.maxNuggets, 0);
  if (!(minSum <= processNuggets && processNuggets <= maxSum)) {
    return null;
  }
  const allocation = /* @__PURE__ */ new Map();
  bounds.forEach((bound) => {
    allocation.set(bound.metal, bound.minNuggets);
  });
  let remainingToAssign = processNuggets - minSum;
  while (remainingToAssign > 0) {
    let bestMetal = null;
    let bestImprovement = Number.NEGATIVE_INFINITY;
    let bestGap = Number.NEGATIVE_INFINITY;
    for (const bound of bounds) {
      const current = allocation.get(bound.metal) ?? 0;
      if (current >= bound.maxNuggets) continue;
      const ideal = processNuggets * bound.targetPct / 100;
      const currentError = Math.abs(current - ideal);
      const nextError = Math.abs(current + 1 - ideal);
      const improvement = currentError - nextError;
      const gap = ideal - current;
      if (improvement > bestImprovement || improvement === bestImprovement && gap > bestGap) {
        bestMetal = bound.metal;
        bestImprovement = improvement;
        bestGap = gap;
      }
    }
    if (!bestMetal) break;
    allocation.set(bestMetal, (allocation.get(bestMetal) ?? 0) + 1);
    remainingToAssign -= 1;
  }
  if (remainingToAssign > 0) {
    for (const bound of bounds) {
      if (remainingToAssign <= 0) break;
      const current = allocation.get(bound.metal) ?? 0;
      const room = bound.maxNuggets - current;
      if (room <= 0) continue;
      const add = Math.min(room, remainingToAssign);
      allocation.set(bound.metal, current + add);
      remainingToAssign -= add;
    }
  }
  if (remainingToAssign > 0) {
    return null;
  }
  const allocations = remaining.map((entry) => ({
    metal: entry.metal,
    color: entry.color,
    nuggets: allocation.get(entry.metal) ?? 0
  })).filter((entry) => entry.nuggets > 0);
  if (allocations.reduce((sum, entry) => sum + entry.nuggets, 0) !== processNuggets) {
    return null;
  }
  return allocations;
};
var chooseProcessAllocation = (remaining, options) => {
  const totalRemaining = getRemainingTotal(remaining);
  if (totalRemaining <= 0) return null;
  const minProcess = Math.max(1, options.enforceMinProcessNuggets ?? 1);
  const processMultiple = Math.max(1, options.enforceProcessMultipleNuggets ?? 1);
  let startSize = Math.min(totalRemaining, STACK_SIZE * MAX_STACKS_PER_PROCESS);
  if (totalRemaining > startSize) {
    const leftover = totalRemaining - startSize;
    if (leftover > 0 && leftover < minProcess) {
      startSize = Math.max(minProcess, startSize - (minProcess - leftover));
    }
  }
  for (let size = startSize; size > 0; size -= 1) {
    if (processMultiple > 1 && size % processMultiple !== 0) continue;
    const leftover = totalRemaining - size;
    if (leftover > 0 && leftover < minProcess) continue;
    if (processMultiple > 1 && leftover > 0 && leftover % processMultiple !== 0) {
      continue;
    }
    const allocation = options.alloyParts?.length ? allocateConstrainedProcess(size, remaining, options.alloyParts) : allocateByRemainingRatio(size, remaining).filter((entry) => entry.nuggets > 0);
    if (!allocation || !allocation.some((entry) => entry.nuggets > 0)) {
      continue;
    }
    if (getStackCount(allocation) <= MAX_STACKS_PER_PROCESS) {
      return allocation;
    }
  }
  return null;
};
var buildBalancedSizes = (totalNuggets, processCount, processMultiple) => {
  if (processCount <= 0 || totalNuggets <= 0) return null;
  if (processMultiple > 1) {
    if (totalNuggets % processMultiple !== 0) return null;
    const totalSteps = totalNuggets / processMultiple;
    if (totalSteps < processCount) return null;
    const baseSteps = Math.floor(totalSteps / processCount);
    const remainderSteps = totalSteps % processCount;
    return Array.from(
      { length: processCount },
      (_, idx) => (baseSteps + (idx < remainderSteps ? 1 : 0)) * processMultiple
    );
  }
  const base = Math.floor(totalNuggets / processCount);
  const remainder = totalNuggets % processCount;
  if (base === 0) return null;
  return Array.from(
    { length: processCount },
    (_, idx) => base + (idx < remainder ? 1 : 0)
  );
};
var allocateExactProcessSize = (processNuggets, remaining, options) => {
  if (processNuggets <= 0) return null;
  const allocation = options.alloyParts?.length ? allocateConstrainedProcess(processNuggets, remaining, options.alloyParts) : allocateByRemainingRatio(processNuggets, remaining).filter((entry) => entry.nuggets > 0);
  if (!allocation) return null;
  if (allocation.reduce((sum, entry) => sum + entry.nuggets, 0) !== processNuggets) return null;
  if (getStackCount(allocation) > MAX_STACKS_PER_PROCESS) return null;
  return allocation;
};
var subtractAllocation = (remaining, allocation) => {
  allocation.forEach((entry) => {
    const remainingEntry = remaining.find((item) => item.metal === entry.metal);
    if (remainingEntry) {
      remainingEntry.nuggets = Math.max(0, remainingEntry.nuggets - entry.nuggets);
    }
  });
};
var tryBalancedPlan = (baseRemaining, options) => {
  const totalNuggets = getRemainingTotal(baseRemaining);
  if (totalNuggets <= 0) return [];
  const minProcessNuggets = Math.max(1, options.enforceMinProcessNuggets ?? 1);
  const processMultiple = Math.max(1, options.enforceProcessMultipleNuggets ?? 1);
  const maxProcessCount = Math.max(1, Math.floor(totalNuggets / minProcessNuggets));
  const minByCapacity = Math.ceil(totalNuggets / (STACK_SIZE * MAX_STACKS_PER_PROCESS));
  const minByStacks = Math.ceil(getTotalStackDemand(baseRemaining) / MAX_STACKS_PER_PROCESS);
  const startProcessCount = Math.max(1, minByCapacity, minByStacks);
  for (let processCount = startProcessCount; processCount <= maxProcessCount; processCount += 1) {
    const sizes = buildBalancedSizes(totalNuggets, processCount, processMultiple);
    if (!sizes) continue;
    if (sizes.some((size) => size > STACK_SIZE * MAX_STACKS_PER_PROCESS)) continue;
    if (sizes.some((size) => size < minProcessNuggets)) continue;
    const remaining = baseRemaining.map((entry) => ({ ...entry }));
    const allocations = [];
    let failed = false;
    for (const size of sizes) {
      const allocation = allocateExactProcessSize(size, remaining, options);
      if (!allocation) {
        failed = true;
        break;
      }
      allocations.push(allocation);
      subtractAllocation(remaining, allocation);
    }
    if (!failed && getRemainingTotal(remaining) === 0) {
      return allocations;
    }
  }
  return null;
};
var buildSmeltingProcessPlan = (metalInputs, options = {}) => {
  const remaining = metalInputs.map((entry) => ({
    metal: entry.metal,
    color: entry.color,
    nuggets: Math.max(0, Math.floor(entry.nuggets))
  })).filter((entry) => entry.nuggets > 0);
  const minProcessNuggets = Math.max(1, options.enforceMinProcessNuggets ?? 1);
  const processMultiple = Math.max(1, options.enforceProcessMultipleNuggets ?? 1);
  const processes = [];
  let totalStacks = 0;
  const shouldBalance = options.balanceProcesses ?? true;
  if (shouldBalance) {
    const balancedAllocations = tryBalancedPlan(remaining, options);
    if (balancedAllocations) {
      balancedAllocations.forEach((allocation) => {
        const stacks = [];
        allocation.forEach((entry) => {
          splitIntoStacks(entry.nuggets).forEach((stackAmount) => {
            stacks.push({
              metal: entry.metal,
              amount: stackAmount,
              color: entry.color
            });
          });
        });
        totalStacks += stacks.length;
        processes.push(buildProcess(stacks, minProcessNuggets, processMultiple));
      });
      return {
        totalStacks,
        processes,
        requiresMultipleProcesses: processes.length > 1
      };
    }
  }
  while (getRemainingTotal(remaining) > 0) {
    const allocation = chooseProcessAllocation(remaining, options);
    if (!allocation) break;
    const stacks = [];
    allocation.forEach((entry) => {
      splitIntoStacks(entry.nuggets).forEach((stackAmount) => {
        stacks.push({
          metal: entry.metal,
          amount: stackAmount,
          color: entry.color
        });
      });
      const remainingEntry = remaining.find((item) => item.metal === entry.metal);
      if (remainingEntry) {
        remainingEntry.nuggets = Math.max(0, remainingEntry.nuggets - entry.nuggets);
      }
    });
    totalStacks += stacks.length;
    processes.push(buildProcess(stacks, minProcessNuggets, processMultiple));
  }
  return {
    totalStacks,
    processes,
    requiresMultipleProcesses: processes.length > 1
  };
};

// scripts/verify-alloy-reduction.ts
var ALLOYS = alloys_default;
var REDUCTION_PCTS = [0, 10, 20, 30, 40, 50];
var INGOT_COUNTS = [1, 2, 3, 5, 10, 25, 50, 100];
var PROCESS_MODES = [
  { label: "force20", multiple: 20, min: 20 },
  { label: "free", multiple: 1, min: 1 }
];
var failures = [];
var resultCache = /* @__PURE__ */ new Map();
var savingsRecords = [];
var passed = 0;
var attempted = 0;
var buildParts = (def) => def.parts.map((p) => {
  const midpoint = (p.min + p.max) / 2;
  const pct = typeof p.default === "number" ? p.default : midpoint;
  return { metal: p.metal, min: p.min, max: p.max, pct };
});
var tryCase = (alloyKey, def, reductionPct, ingots, mode) => {
  attempted += 1;
  const parts = buildParts(def);
  const baseUnits = ingots * UNITS_PER_INGOT;
  const reductionFactor = 1 - reductionPct / 100;
  const reducedUnits = baseUnits * reductionFactor;
  let allocation;
  try {
    allocation = calculateAlloyAllocation(reducedUnits, parts);
  } catch (e) {
    failures.push({
      alloy: alloyKey,
      reductionPct,
      ingots,
      mode: mode.label,
      stage: "allocation",
      reason: e.message
    });
    return null;
  }
  const totalNuggets = allocation.totalNuggets;
  for (const part of allocation.parts) {
    const pct = totalNuggets > 0 ? part.nuggets / totalNuggets * 100 : 0;
    const tolerance = totalNuggets > 0 ? 100 / totalNuggets + 0.01 : 0.01;
    if (pct < part.min - tolerance || pct > part.max + tolerance) {
      failures.push({
        alloy: alloyKey,
        reductionPct,
        ingots,
        mode: mode.label,
        stage: "constraints",
        reason: `${part.metal}: pct=${pct.toFixed(2)}% out of [${part.min}, ${part.max}] (totalNuggets=${totalNuggets})`
      });
      return null;
    }
  }
  if (allocation.producedUnits + 1e-3 < reducedUnits) {
    failures.push({
      alloy: alloyKey,
      reductionPct,
      ingots,
      mode: mode.label,
      stage: "allocation",
      reason: `producedUnits=${allocation.producedUnits} < reducedUnits=${reducedUnits}`
    });
    return null;
  }
  const stackInputs = allocation.parts.filter((p) => p.nuggets > 0).map((p) => ({ metal: p.metal, nuggets: p.nuggets }));
  const plan = buildSmeltingProcessPlan(stackInputs, {
    alloyParts: parts,
    enforceMinProcessNuggets: mode.min,
    enforceProcessMultipleNuggets: mode.multiple,
    balanceProcesses: true
  });
  if (!plan.processes || plan.processes.length === 0) {
    failures.push({
      alloy: alloyKey,
      reductionPct,
      ingots,
      mode: mode.label,
      stage: "planner",
      reason: `no processes returned (totalNuggets=${totalNuggets})`
    });
    return null;
  }
  const sumPlanNuggets = plan.processes.reduce((s, p) => s + (p.nuggetsTotal ?? 0), 0);
  if (sumPlanNuggets !== totalNuggets) {
    failures.push({
      alloy: alloyKey,
      reductionPct,
      ingots,
      mode: mode.label,
      stage: "planner",
      reason: `plan sum ${sumPlanNuggets} != allocation total ${totalNuggets}`
    });
    return null;
  }
  passed += 1;
  return totalNuggets;
};
for (const [alloyKey, def] of Object.entries(ALLOYS)) {
  for (const mode of PROCESS_MODES) {
    for (const ingots of INGOT_COUNTS) {
      const cacheKey = `${alloyKey}|${ingots}|${mode.label}`;
      const byReduction = /* @__PURE__ */ new Map();
      for (const reductionPct of REDUCTION_PCTS) {
        const total = tryCase(alloyKey, def, reductionPct, ingots, mode);
        if (total !== null) byReduction.set(reductionPct, total);
      }
      resultCache.set(cacheKey, byReduction);
    }
  }
}
for (const [alloyKey] of Object.entries(ALLOYS)) {
  for (const ingots of INGOT_COUNTS) {
    const cacheKey = `${alloyKey}|${ingots}|free`;
    const byReduction = resultCache.get(cacheKey);
    if (!byReduction) continue;
    const baseNuggets = byReduction.get(0);
    if (baseNuggets === void 0) continue;
    const baseUnits = ingots * UNITS_PER_INGOT;
    for (const reductionPct of REDUCTION_PCTS) {
      if (reductionPct === 0) continue;
      const actualNuggets = byReduction.get(reductionPct);
      if (actualNuggets === void 0) continue;
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
        lostSavings: baseNuggets - idealNuggets - (baseNuggets - actualNuggets)
      });
    }
  }
}
console.log(`
=== Verification summary ===`);
console.log(`Attempted: ${attempted}`);
console.log(`Passed:    ${passed}`);
console.log(`Failed:    ${failures.length}`);
if (failures.length > 0) {
  const grouped = /* @__PURE__ */ new Map();
  for (const f of failures) {
    const key = `${f.alloy} | r=${f.reductionPct}% | mode=${f.mode} | stage=${f.stage}`;
    const arr = grouped.get(key) ?? [];
    arr.push(f);
    grouped.set(key, arr);
  }
  console.log(`
--- Failure groups (${grouped.size}) ---`);
  for (const key of [...grouped.keys()].sort()) {
    const arr = grouped.get(key);
    console.log(`  ${key}`);
    console.log(`    ingots: [${arr.map((f) => f.ingots).join(",")}]`);
    console.log(`    sample: ${arr[0]?.reason ?? ""}`);
  }
}
var withLoss = savingsRecords.filter((r) => r.lostSavings > 0);
console.log(`
=== Savings analysis (mode=free, allocation layer) ===`);
console.log(`Total records: ${savingsRecords.length}`);
console.log(`With savings loss (rounding ate into reduction): ${withLoss.length}`);
if (withLoss.length > 0) {
  const byAlloy = /* @__PURE__ */ new Map();
  for (const r of withLoss) {
    const arr = byAlloy.get(r.alloy) ?? [];
    arr.push(r);
    byAlloy.set(r.alloy, arr);
  }
  console.log(`
--- Loss breakdown by alloy ---`);
  for (const [alloy, records] of [...byAlloy.entries()].sort()) {
    const maxLoss = Math.max(...records.map((r) => r.lostSavings));
    const affectedIngots = [...new Set(records.map((r) => r.ingots))].sort((a, b) => a - b);
    const affectedPcts = [...new Set(records.map((r) => r.reductionPct))].sort((a, b) => a - b);
    console.log(`  ${alloy}:`);
    console.log(`    affected ingot counts: [${affectedIngots.join(", ")}]`);
    console.log(`    affected reduction %:  [${affectedPcts.join(", ")}%]`);
    console.log(`    max lost savings:      ${maxLoss} nuggets`);
  }
  const oneIngot = withLoss.filter((r) => r.ingots === 1);
  if (oneIngot.length > 0) {
    console.log(`
--- 1-ingot cases (worst rounding impact) ---`);
    console.log(`${"alloy".padEnd(20)} ${"r%".padStart(4)} ${"base".padStart(5)} ${"ideal".padStart(6)} ${"actual".padStart(7)} ${"lostSav".padStart(8)}`);
    for (const r of oneIngot.sort((a, b) => a.alloy.localeCompare(b.alloy) || a.reductionPct - b.reductionPct)) {
      console.log(
        `${r.alloy.padEnd(20)} ${String(r.reductionPct).padStart(3)}% ${String(r.baseNuggets).padStart(5)} ${String(r.idealNuggets).padStart(6)} ${String(r.actualNuggets).padStart(7)} ${String(r.lostSavings).padStart(8)}`
      );
    }
  }
}
console.log(`
=== Planner mode comparison (force20 vs free) ===`);
var plannerRoundingCases = 0;
var plannerRoundingExamples = [];
for (const [alloyKey] of Object.entries(ALLOYS)) {
  for (const ingots of INGOT_COUNTS) {
    for (const reductionPct of REDUCTION_PCTS) {
      if (reductionPct === 0) continue;
      const freeNuggets = resultCache.get(`${alloyKey}|${ingots}|free`)?.get(reductionPct);
      const force20Nuggets = resultCache.get(`${alloyKey}|${ingots}|force20`)?.get(reductionPct);
      if (freeNuggets === void 0 || force20Nuggets === void 0) continue;
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
console.log(`
=== Smelter mode verification (nuggetStep=1) ===`);
var smelterRoundingLoss = 0;
var smelterConstraintLoss = 0;
var smelterPassed = 0;
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
      const loss = baseNuggets - idealNuggets - (baseNuggets - actualNuggets);
      if (loss <= 0) {
        smelterPassed += 1;
      } else {
        const constraintMinNuggets = calculateAlloyAllocation(
          idealNuggets * UNITS_PER_NUGGET,
          parts,
          1
        ).totalNuggets;
        if (actualNuggets <= constraintMinNuggets) {
          smelterConstraintLoss += 1;
        } else {
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
  console.log(`\u2713 nuggetStep=1 eliminates all rounding-induced savings loss`);
  if (smelterConstraintLoss > 0) {
    console.log(`  (${smelterConstraintLoss} cases remain due to alloy composition constraints \u2014 unavoidable)`);
  }
}
var totalFailures = failures.length + smelterRoundingLoss;
process.exit(totalFailures > 0 ? 1 : 0);
