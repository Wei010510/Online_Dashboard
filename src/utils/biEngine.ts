import {
  AccountingDetailRecord,
  CrossTabYearRow,
  DrilldownFilters,
  DrilldownSummaryRow,
  EnrichedRecord,
  MacroFilters,
  MonthlyMonitorRow,
  ParetoPoint,
  SkuMappingRecord,
  SummaryMetrics,
  TLRecord,
  TLShareItem,
  YoYYearSeries,
} from '../types/bi';

/**
 * Join raw accounting details with TL & Old-to-New SKU mapping tables.
 * Rules:
 * 1) 核算报表明细.SKU = 新老SKU匹配表.SKU AND 核算报表明细.市场 = 新老SKU匹配表.Sku-Market
 * 2) 修正SKU = IF ISNULL(NewestSKU) THEN SKU ELSE NewestSKU
 * 3) SPU = Regex ^[A-Za-z]{3} on 修正SKU
 * 4) TL.OP = 核算报表明细.OP
 */
export function buildEnrichedRecords(
  details: AccountingDetailRecord[],
  tlRecords: TLRecord[],
  skuMappings: SkuMappingRecord[]
): {
  records: EnrichedRecord[];
  stats: { totalRows: number; skuMappedCount: number; tlMatchedCount: number };
} {
  const tlMap = new Map<string, string>();
  for (const row of tlRecords) {
    if (row.OP) {
      tlMap.set(row.OP.trim(), row.TL.trim());
    }
  }

  const skuMap = new Map<string, string>();
  for (const row of skuMappings) {
    if (row.SKU && row.SkuMarket && row.NewestSKU) {
      const key = `${row.SkuMarket.trim().toUpperCase()}__${row.SKU.trim().toUpperCase()}`;
      skuMap.set(key, row.NewestSKU.trim());
    }
  }

  let skuMappedCount = 0;
  let tlMatchedCount = 0;

  const records: EnrichedRecord[] = details.map((d) => {
    const mapKey = `${d.市场.trim().toUpperCase()}__${d.SKU.trim().toUpperCase()}`;
    const newestSku = skuMap.get(mapKey);
    const correctedSku = newestSku ? newestSku : d.SKU.trim();
    if (newestSku) skuMappedCount++;

    const spuMatch = correctedSku.match(/^[A-Za-z]{3}/);
    const spu = spuMatch ? spuMatch[0].toUpperCase() : correctedSku.slice(0, 3).toUpperCase();

    const tl = tlMap.get(d.OP.trim()) ?? '未分配TL';
    if (tlMap.has(d.OP.trim())) tlMatchedCount++;

    const totalCost =
      d.广告费 +
      d.采购成本 +
      d.头程成本 +
      d.尾程成本 +
      d.总平台费 +
      d.人工成本 +
      d.仓租 +
      d.售后 +
      d.直接调整费 +
      d.间接调整费;

    const profit = typeof d.利润额 === 'number' ? d.利润额 : d.销售额 - totalCost;
    const monthStr = String(d.月).padStart(2, '0');

    return {
      ...d,
      TL: tl,
      修正SKU: correctedSku,
      SPU: spu,
      总成本: totalCost,
      利润额: profit,
      年月: `${d.年}-${monthStr}`,
      isSkuMapped: Boolean(newestSku),
    };
  });

  return {
    records,
    stats: {
      totalRows: records.length,
      skuMappedCount,
      tlMatchedCount,
    },
  };
}

export function filterMacroRecords(
  records: EnrichedRecord[],
  filters: MacroFilters
): EnrichedRecord[] {
  return records.filter((r) => {
    if (filters.years.length > 0 && !filters.years.includes(r.年)) return false;
    if (filters.months.length > 0 && !filters.months.includes(r.月)) return false;
    return true;
  });
}

export function filterDrilldownRecords(
  records: EnrichedRecord[],
  filters: DrilldownFilters
): EnrichedRecord[] {
  return records.filter((r) => {
    if (filters.years.length > 0 && !filters.years.includes(r.年)) return false;
    if (filters.months.length > 0 && !filters.months.includes(r.月)) return false;
    if (filters.markets.length > 0 && !filters.markets.includes(r.市场)) return false;
    if (filters.tls.length > 0 && !filters.tls.includes(r.TL)) return false;
    if (filters.spus.length > 0 && !filters.spus.includes(r.SPU)) return false;
    return true;
  });
}

export function computeSummaryMetrics(
  records: EnrichedRecord[],
  selectedYears: number[]
): SummaryMetrics {
  let gmv = 0;
  let profit = 0;
  let totalCost = 0;
  let quantity = 0;
  let adCost = 0;
  let purchaseCost = 0;
  let firstLegCost = 0;
  let lastLegCost = 0;
  let platformFee = 0;
  let laborCost = 0;
  let warehouseRent = 0;
  let afterSalesCost = 0;
  let directAdjustment = 0;
  let indirectAdjustment = 0;
  const ops = new Set<string>();

  for (const r of records) {
    gmv += r.销售额;
    profit += r.利润额;
    totalCost += r.总成本;
    quantity += r.销售数量;
    adCost += r.广告费;
    purchaseCost += r.采购成本;
    firstLegCost += r.头程成本;
    lastLegCost += r.尾程成本;
    platformFee += r.总平台费;
    laborCost += r.人工成本;
    warehouseRent += r.仓租;
    afterSalesCost += r.售后;
    directAdjustment += r.直接调整费;
    indirectAdjustment += r.间接调整费;
    if (r.OP) ops.add(r.OP);
  }

  const opCount = ops.size;
  const safeGmv = gmv === 0 ? 1 : gmv;
  const ratio = (v: number) => (gmv === 0 ? 0 : v / safeGmv);

  const yearsInRecords = Array.from(new Set(records.map((r) => r.年))).sort((a, b) => a - b);
  const activeYears = selectedYears.length > 0 ? [...selectedYears].sort((a, b) => a - b) : yearsInRecords;
  const yearLabel =
    activeYears.length === 0
      ? '暂无数据'
      : activeYears.length === 1
      ? `${activeYears[0]}年`
      : `${activeYears[0]}–${activeYears[activeYears.length - 1]}年 (${activeYears.length}个年度)`;

  const costBreakdown = [
    { key: 'purchaseCost', label: '采购成本', amount: purchaseCost, ratioToGmv: ratio(purchaseCost) },
    { key: 'platformFee', label: '总平台费', amount: platformFee, ratioToGmv: ratio(platformFee) },
    { key: 'adCost', label: '广告费 (Tcos)', amount: adCost, ratioToGmv: ratio(adCost) },
    { key: 'lastLegCost', label: '尾程', amount: lastLegCost, ratioToGmv: ratio(lastLegCost) },
    { key: 'firstLegCost', label: '头程', amount: firstLegCost, ratioToGmv: ratio(firstLegCost) },
    { key: 'laborCost', label: '人工成本', amount: laborCost, ratioToGmv: ratio(laborCost) },
    { key: 'warehouseRent', label: '仓租', amount: warehouseRent, ratioToGmv: ratio(warehouseRent) },
    { key: 'afterSalesCost', label: '售后', amount: afterSalesCost, ratioToGmv: ratio(afterSalesCost) },
    { key: 'directAdjustment', label: '直接调整费', amount: directAdjustment, ratioToGmv: ratio(directAdjustment) },
    { key: 'indirectAdjustment', label: '间接调整费', amount: indirectAdjustment, ratioToGmv: ratio(indirectAdjustment) },
  ];

  return {
    yearLabel,
    gmv,
    profit,
    profitRate: ratio(profit),
    totalCost,
    quantity,
    aov: quantity === 0 ? 0 : gmv / quantity,
    opCount,
    salesEfficiency: opCount === 0 ? 0 : gmv / opCount,
    profitEfficiency: opCount === 0 ? 0 : profit / opCount,
    tcos: ratio(adCost),
    adCost,
    purchaseCost,
    firstLegCost,
    lastLegCost,
    platformFee,
    laborCost,
    warehouseRent,
    afterSalesCost,
    directAdjustment,
    indirectAdjustment,
    costBreakdown,
  };
}

/**
 * Computes monthly monitoring series sorted chronologically,
 * including true MoM against the immediately preceding chronological month in the filtered dataset
 * (or globally if needed — here we compute MoM against the immediate prior calendar month present in allRecords so filtered single-month views still know MoM!).
 */
export function computeMonthlyMonitor(
  filteredRecords: EnrichedRecord[],
  allRecords: EnrichedRecord[]
): MonthlyMonitorRow[] {
  const aggregateByYM = (recs: EnrichedRecord[]) => {
    const map = new Map<
      string,
      {
        year: number;
        month: number;
        gmv: number;
        profit: number;
        quantity: number;
        ops: Set<string>;
      }
    >();
    for (const r of recs) {
      let bucket = map.get(r.年月);
      if (!bucket) {
        bucket = {
          year: r.年,
          month: r.月,
          gmv: 0,
          profit: 0,
          quantity: 0,
          ops: new Set<string>(),
        };
        map.set(r.年月, bucket);
      }
      bucket.gmv += r.销售额;
      bucket.profit += r.利润额;
      bucket.quantity += r.销售数量;
      if (r.OP) bucket.ops.add(r.OP);
    }
    return map;
  };

  const allMap = aggregateByYM(allRecords);
  const filteredMap = aggregateByYM(filteredRecords);

  const sortedAllKeys = Array.from(allMap.keys()).sort();
  const prevKeyLookup = new Map<string, string>();
  for (let i = 1; i < sortedAllKeys.length; i++) {
    prevKeyLookup.set(sortedAllKeys[i], sortedAllKeys[i - 1]);
  }

  const calcMoM = (curr: number, prev: number | undefined): number | null => {
    if (prev === undefined || prev === 0) return null;
    return (curr - prev) / Math.abs(prev);
  };

  const sortedFilteredKeys = Array.from(filteredMap.keys()).sort();

  return sortedFilteredKeys.map((ym) => {
    const cur = filteredMap.get(ym)!;
    const opCount = cur.ops.size;
    const salesEfficiency = opCount === 0 ? 0 : cur.gmv / opCount;
    const profitEfficiency = opCount === 0 ? 0 : cur.profit / opCount;

    const prevKey = prevKeyLookup.get(ym);
    const prev = prevKey ? allMap.get(prevKey) : undefined;
    const prevOpCount = prev ? prev.ops.size : 0;
    const prevSalesEff = prev && prevOpCount > 0 ? prev.gmv / prevOpCount : undefined;
    const prevProfitEff = prev && prevOpCount > 0 ? prev.profit / prevOpCount : undefined;

    return {
      yearMonth: ym,
      year: cur.year,
      month: cur.month,
      gmv: cur.gmv,
      gmvMoM: calcMoM(cur.gmv, prev?.gmv),
      profit: cur.profit,
      profitMoM: calcMoM(cur.profit, prev?.profit),
      profitRate: cur.gmv === 0 ? 0 : cur.profit / cur.gmv,
      quantity: cur.quantity,
      quantityMoM: calcMoM(cur.quantity, prev?.quantity),
      opCount,
      salesEfficiency,
      salesEfficiencyMoM: calcMoM(salesEfficiency, prevSalesEff),
      profitEfficiency,
      profitEfficiencyMoM: calcMoM(profitEfficiency, prevProfitEff),
    };
  });
}

export function computeTLShares(records: EnrichedRecord[]): TLShareItem[] {
  const map = new Map<string, { gmv: number; profit: number; ops: Set<string> }>();
  let totalGmv = 0;
  let totalProfit = 0;

  for (const r of records) {
    totalGmv += r.销售额;
    totalProfit += r.利润额;
    let bucket = map.get(r.TL);
    if (!bucket) {
      bucket = { gmv: 0, profit: 0, ops: new Set<string>() };
      map.set(r.TL, bucket);
    }
    bucket.gmv += r.销售额;
    bucket.profit += r.利润额;
    if (r.OP) bucket.ops.add(r.OP);
  }

  return Array.from(map.entries())
    .map(([tl, b]) => ({
      tl,
      gmv: b.gmv,
      gmvShare: totalGmv === 0 ? 0 : b.gmv / totalGmv,
      profit: b.profit,
      profitShare: totalProfit === 0 ? 0 : b.profit / Math.abs(totalProfit),
      opCount: b.ops.size,
      profitRate: b.gmv === 0 ? 0 : b.profit / b.gmv,
    }))
    .sort((a, b) => b.gmv - a.gmv);
}

/**
 * Builds Pareto efficiency series (value per month + cumulative contribution % along time/rank)
 */
export function computeParetoSeries(
  monthlyRows: MonthlyMonitorRow[],
  metric: 'salesEfficiency' | 'profitEfficiency'
): ParetoPoint[] {
  const total = monthlyRows.reduce((acc, row) => acc + Math.max(0, row[metric]), 0);
  let running = 0;
  return monthlyRows.map((row) => {
    const val = row[metric];
    running += Math.max(0, val);
    return {
      yearMonth: row.yearMonth,
      value: val,
      cumulativePct: total === 0 ? 0 : running / total,
      opCount: row.opCount,
      totalValue: metric === 'salesEfficiency' ? row.gmv : row.profit,
    };
  });
}

const YEAR_COLORS: Record<number, string> = {
  2021: '#64748B',
  2022: '#8B5CF6',
  2023: '#06B6D4',
  2024: '#3B82F6',
  2025: '#10B981',
};

export function computeYoYSeries(
  records: EnrichedRecord[],
  metric: '销售额' | '利润额' | '销售数量'
): YoYYearSeries[] {
  const yearMonthMap = new Map<number, Map<number, number>>();
  for (const r of records) {
    let mMap = yearMonthMap.get(r.年);
    if (!mMap) {
      mMap = new Map<number, number>();
      yearMonthMap.set(r.年, mMap);
    }
    mMap.set(r.月, (mMap.get(r.月) ?? 0) + r[metric]);
  }

  const years = Array.from(yearMonthMap.keys()).sort((a, b) => a - b);

  return years.map((year, idx) => {
    const mMap = yearMonthMap.get(year)!;
    const prevYearMap = idx > 0 ? yearMonthMap.get(years[idx - 1]) : undefined;
    const points = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const value = mMap.has(month) ? mMap.get(month)! : null;
      const prevVal = prevYearMap?.get(month);
      const yoyPct =
        value !== null && prevVal !== undefined && prevVal !== 0
          ? (value - prevVal) / Math.abs(prevVal)
          : null;
      return { month, value, yoyPct };
    });

    return {
      year,
      color: YEAR_COLORS[year] ?? '#F59E0B',
      points,
    };
  });
}

export function computeCrossTabMatrix(records: EnrichedRecord[]): {
  rows: CrossTabYearRow[];
  grandTotalsByMetric: Record<'GMV' | '利润额' | '销售数量', { months: number[]; total: number }>;
} {
  const years = Array.from(new Set(records.map((r) => r.年))).sort((a, b) => a - b);
  const metrics: ('GMV' | '利润额' | '销售数量')[] = ['GMV', '利润额', '销售数量'];

  const lookup = new Map<string, { GMV: number; 利润额: number; 销售数量: number }>();
  for (const r of records) {
    const key = `${r.年}-${r.月}`;
    let bucket = lookup.get(key);
    if (!bucket) {
      bucket = { GMV: 0, 利润额: 0, 销售数量: 0 };
      lookup.set(key, bucket);
    }
    bucket.GMV += r.销售额;
    bucket.利润额 += r.利润额;
    bucket.销售数量 += r.销售数量;
  }

  const rows: CrossTabYearRow[] = [];
  const grandTotalsByMetric: Record<'GMV' | '利润额' | '销售数量', { months: number[]; total: number }> = {
    GMV: { months: Array(12).fill(0), total: 0 },
    利润额: { months: Array(12).fill(0), total: 0 },
    销售数量: { months: Array(12).fill(0), total: 0 },
  };

  for (const metric of metrics) {
    for (const year of years) {
      const months: (number | null)[] = Array(12).fill(null);
      let yearTotal = 0;
      for (let m = 1; m <= 12; m++) {
        const bucket = lookup.get(`${year}-${m}`);
        if (bucket) {
          const val = bucket[metric];
          months[m - 1] = val;
          yearTotal += val;
          grandTotalsByMetric[metric].months[m - 1] += val;
          grandTotalsByMetric[metric].total += val;
        }
      }
      rows.push({
        year,
        metric,
        months,
        total: yearTotal,
      });
    }
  }

  return { rows, grandTotalsByMetric };
}

export function computeDrilldownRows(records: EnrichedRecord[]): DrilldownSummaryRow[] {
  const map = new Map<
    string,
    {
      spu: string;
      correctedSku: string;
      market: string;
      tl: string;
      gmv: number;
      profit: number;
      quantity: number;
      adCost: number;
      ops: Set<string>;
    }
  >();

  for (const r of records) {
    const key = `${r.SPU}__${r.修正SKU}__${r.市场}__${r.TL}`;
    let b = map.get(key);
    if (!b) {
      b = {
        spu: r.SPU,
        correctedSku: r.修正SKU,
        market: r.市场,
        tl: r.TL,
        gmv: 0,
        profit: 0,
        quantity: 0,
        adCost: 0,
        ops: new Set<string>(),
      };
      map.set(key, b);
    }
    b.gmv += r.销售额;
    b.profit += r.利润额;
    b.quantity += r.销售数量;
    b.adCost += r.广告费;
    if (r.OP) b.ops.add(r.OP);
  }

  return Array.from(map.values())
    .map((b) => ({
      spu: b.spu,
      correctedSku: b.correctedSku,
      market: b.market,
      tl: b.tl,
      gmv: b.gmv,
      profit: b.profit,
      profitRate: b.gmv === 0 ? 0 : b.profit / b.gmv,
      quantity: b.quantity,
      tcos: b.gmv === 0 ? 0 : b.adCost / b.gmv,
      opCount: b.ops.size,
    }))
    .sort((a, b) => b.gmv - a.gmv);
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 1_0000_0000) return `¥${(value / 1_0000_0000).toFixed(2)}亿`;
    if (abs >= 1_0000) return `¥${(value / 1_0000).toFixed(1)}万`;
  }
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(value: number | null, showSign = false): string {
  if (value === null || Number.isNaN(value)) return '—';
  const pct = (value * 100).toFixed(1);
  if (showSign && value > 0) return `+${pct}%`;
  return `${pct}%`;
}

// ============================================================================
// DRILLDOWN COMPUTATIONS (8 Components)
// ============================================================================

export interface SkuMarketGmvRow {
  skuMarket: string;
  correctedSku: string;
  market: string;
  spu: string;
  months: (number | null)[];
  total: number;
}

export function computeSkuMarketGmvTable(records: EnrichedRecord[]): SkuMarketGmvRow[] {
  const map = new Map<
    string,
    {
      skuMarket: string;
      correctedSku: string;
      market: string;
      spu: string;
      months: (number | null)[];
      total: number;
    }
  >();

  for (const r of records) {
    const skuMarket = `${r.修正SKU} (${r.市场})`;
    let entry = map.get(skuMarket);
    if (!entry) {
      entry = {
        skuMarket,
        correctedSku: r.修正SKU,
        market: r.市场,
        spu: r.SPU,
        months: Array(12).fill(null),
        total: 0,
      };
      map.set(skuMarket, entry);
    }
    const idx = r.月 - 1;
    if (idx >= 0 && idx < 12) {
      entry.months[idx] = (entry.months[idx] ?? 0) + r.销售额;
    }
    entry.total += r.销售额;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export interface MarketMultiAxisRow {
  market: string;
  gmv: number;
  gmvMoM: number | null;
  profit: number;
  profitRate: number;
  profitRateMoM: number | null;
  quantity: number;
}

export function computeMarketMultiAxisMetrics(
  records: EnrichedRecord[],
  scopeRecordsNoTimeFilter: EnrichedRecord[]
): MarketMultiAxisRow[] {
  // Aggregate totals per market for filtered records
  const totalsMap = new Map<string, { gmv: number; profit: number; quantity: number }>();
  const ymSet = new Set<string>();
  for (const r of records) {
    ymSet.add(r.年月);
    const b = totalsMap.get(r.市场) ?? { gmv: 0, profit: 0, quantity: 0 };
    b.gmv += r.销售额;
    b.profit += r.利润额;
    b.quantity += r.销售数量;
    totalsMap.set(r.市场, b);
  }

  // Determine latest month in filtered records & its immediate chronological predecessor in scope
  const sortedScopeYMs = Array.from(new Set(scopeRecordsNoTimeFilter.map((r) => r.年月))).sort();
  const sortedFilteredYMs = Array.from(ymSet).sort();
  const latestYM = sortedFilteredYMs[sortedFilteredYMs.length - 1];
  const latestIdx = latestYM ? sortedScopeYMs.indexOf(latestYM) : -1;
  const prevYM = latestIdx > 0 ? sortedScopeYMs[latestIdx - 1] : undefined;

  const byMarketYM = new Map<string, { gmv: number; profit: number }>();
  if (latestYM) {
    for (const r of scopeRecordsNoTimeFilter) {
      if (r.年月 === latestYM || r.年月 === prevYM) {
        const key = `${r.市场}__${r.年月}`;
        const b = byMarketYM.get(key) ?? { gmv: 0, profit: 0 };
        b.gmv += r.销售额;
        b.profit += r.利润额;
        byMarketYM.set(key, b);
      }
    }
  }

  return Array.from(totalsMap.entries())
    .map(([market, b]) => {
      const cur = latestYM ? byMarketYM.get(`${market}__${latestYM}`) : undefined;
      const prev = prevYM ? byMarketYM.get(`${market}__${prevYM}`) : undefined;

      const gmvMoM =
        cur && prev && prev.gmv !== 0 ? (cur.gmv - prev.gmv) / Math.abs(prev.gmv) : null;

      const curRate = cur && cur.gmv !== 0 ? cur.profit / cur.gmv : null;
      const prevRate = prev && prev.gmv !== 0 ? prev.profit / prev.gmv : null;
      const profitRateMoM =
        curRate !== null && prevRate !== null && prevRate !== 0
          ? (curRate - prevRate) / Math.abs(prevRate)
          : null;

      return {
        market,
        gmv: b.gmv,
        gmvMoM,
        profit: b.profit,
        profitRate: b.gmv === 0 ? 0 : b.profit / b.gmv,
        profitRateMoM,
        quantity: b.quantity,
      };
    })
    .sort((a, b) => a.market.localeCompare(b.market));
}

export interface TLMonthlySalesGroup {
  tl: string;
  year: number;
  monthsGmv: (number | null)[];
  totalGmv: number;
  monthsProfit: (number | null)[];
  totalProfit: number;
}

export function computeTLMonthlySalesRows(records: EnrichedRecord[]): TLMonthlySalesGroup[] {
  const map = new Map<string, TLMonthlySalesGroup>();

  for (const r of records) {
    const key = `${r.TL}__${r.年}`;
    let group = map.get(key);
    if (!group) {
      group = {
        tl: r.TL,
        year: r.年,
        monthsGmv: Array(12).fill(null),
        totalGmv: 0,
        monthsProfit: Array(12).fill(null),
        totalProfit: 0,
      };
      map.set(key, group);
    }
    const idx = r.月 - 1;
    if (idx >= 0 && idx < 12) {
      group.monthsGmv[idx] = (group.monthsGmv[idx] ?? 0) + r.销售额;
      group.monthsProfit[idx] = (group.monthsProfit[idx] ?? 0) + r.利润额;
    }
    group.totalGmv += r.销售额;
    group.totalProfit += r.利润额;
  }

  return Array.from(map.values()).sort((a, b) => {
    const cmp = a.tl.localeCompare(b.tl, 'zh-CN');
    return cmp !== 0 ? cmp : a.year - b.year;
  });
}

export interface TLPerformanceRow {
  tl: string;
  gmv: number;
  quantity: number;
  profit: number;
  profitRate: number;
}

export function computeTLPerformanceMetrics(records: EnrichedRecord[]): TLPerformanceRow[] {
  const map = new Map<string, { gmv: number; quantity: number; profit: number }>();
  for (const r of records) {
    const b = map.get(r.TL) ?? { gmv: 0, quantity: 0, profit: 0 };
    b.gmv += r.销售额;
    b.quantity += r.销售数量;
    b.profit += r.利润额;
    map.set(r.TL, b);
  }

  return Array.from(map.entries())
    .map(([tl, b]) => ({
      tl,
      gmv: b.gmv,
      quantity: b.quantity,
      profit: b.profit,
      profitRate: b.gmv === 0 ? 0 : b.profit / b.gmv,
    }))
    .sort((a, b) => b.gmv - a.gmv);
}

export interface SPUSalesTableRow {
  year: number;
  spu: string;
  months: (number | null)[];
  total: number;
}

export function computeSPUSalesTableRows(records: EnrichedRecord[]): SPUSalesTableRow[] {
  const map = new Map<string, SPUSalesTableRow>();
  for (const r of records) {
    const key = `${r.年}__${r.SPU}`;
    let row = map.get(key);
    if (!row) {
      row = {
        year: r.年,
        spu: r.SPU,
        months: Array(12).fill(null),
        total: 0,
      };
      map.set(key, row);
    }
    const idx = r.月 - 1;
    if (idx >= 0 && idx < 12) {
      row.months[idx] = (row.months[idx] ?? 0) + r.销售额;
    }
    row.total += r.销售额;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return b.total - a.total;
  });
}

export interface ExpenseRatioRow {
  year: number;
  metricKey: string;
  label: string;
  format: 'pct' | 'currency';
  months: (number | null)[];
}

export function computeExpenseRatioTable(records: EnrichedRecord[]): ExpenseRatioRow[] {
  const byYearMonth = new Map<
    string,
    {
      gmv: number;
      profit: number;
      qty: number;
      ad: number;
      purchase: number;
      firstLeg: number;
      lastLeg: number;
      platform: number;
      afterSales: number;
      rent: number;
      labor: number;
      directAdj: number;
      indirectAdj: number;
    }
  >();

  const years = new Set<number>();

  for (const r of records) {
    years.add(r.年);
    const key = `${r.年}__${r.月}`;
    let b = byYearMonth.get(key);
    if (!b) {
      b = {
        gmv: 0,
        profit: 0,
        qty: 0,
        ad: 0,
        purchase: 0,
        firstLeg: 0,
        lastLeg: 0,
        platform: 0,
        afterSales: 0,
        rent: 0,
        labor: 0,
        directAdj: 0,
        indirectAdj: 0,
      };
      byYearMonth.set(key, b);
    }
    b.gmv += r.销售额;
    b.profit += r.利润额;
    b.qty += r.销售数量;
    b.ad += r.广告费;
    b.purchase += r.采购成本;
    b.firstLeg += r.头程成本;
    b.lastLeg += r.尾程成本;
    b.platform += r.总平台费;
    b.afterSales += r.售后;
    b.rent += r.仓租;
    b.labor += r.人工成本;
    b.directAdj += r.直接调整费;
    b.indirectAdj += r.间接调整费;
  }

  const metricDefs: {
    key: string;
    label: string;
    format: 'pct' | 'currency';
    calc: (b: NonNullable<ReturnType<typeof byYearMonth.get>>) => number;
  }[] = [
    { key: 'profitRate', label: '利润率（加权）', format: 'pct', calc: (b) => (b.gmv ? b.profit / b.gmv : 0) },
    { key: 'aov', label: '客单价', format: 'currency', calc: (b) => (b.qty ? b.gmv / b.qty : 0) },
    { key: 'tcos', label: 'Tcos', format: 'pct', calc: (b) => (b.gmv ? b.ad / b.gmv : 0) },
    { key: 'purchase', label: '采购%', format: 'pct', calc: (b) => (b.gmv ? b.purchase / b.gmv : 0) },
    { key: 'firstLeg', label: '头程%', format: 'pct', calc: (b) => (b.gmv ? b.firstLeg / b.gmv : 0) },
    { key: 'lastLeg', label: '尾程%', format: 'pct', calc: (b) => (b.gmv ? b.lastLeg / b.gmv : 0) },
    { key: 'platform', label: '佣金/平台%', format: 'pct', calc: (b) => (b.gmv ? b.platform / b.gmv : 0) },
    { key: 'afterSales', label: '售后%', format: 'pct', calc: (b) => (b.gmv ? b.afterSales / b.gmv : 0) },
    { key: 'rent', label: '仓租%', format: 'pct', calc: (b) => (b.gmv ? b.rent / b.gmv : 0) },
    { key: 'labor', label: '人工%', format: 'pct', calc: (b) => (b.gmv ? b.labor / b.gmv : 0) },
    { key: 'directAdj', label: '直接调整%', format: 'pct', calc: (b) => (b.gmv ? b.directAdj / b.gmv : 0) },
    { key: 'indirectAdj', label: '间接调整%', format: 'pct', calc: (b) => (b.gmv ? b.indirectAdj / b.gmv : 0) },
  ];

  const sortedYears = Array.from(years).sort((a, b) => a - b);
  const rows: ExpenseRatioRow[] = [];

  for (const year of sortedYears) {
    for (const def of metricDefs) {
      const months: (number | null)[] = Array(12).fill(null);
      for (let m = 1; m <= 12; m++) {
        const b = byYearMonth.get(`${year}__${m}`);
        if (b) months[m - 1] = def.calc(b);
      }
      rows.push({
        year,
        metricKey: def.key,
        label: def.label,
        format: def.format,
        months,
      });
    }
  }

  return rows;
}

export interface CostAndAovPoint {
  yearMonth: string;
  totalCost: number;
  totalCostMoM: number | null;
  costRatioToGmv: number;
  aov: number;
  aovMoM: number | null;
  quantity: number;
  gmv: number;
}

export function computeCostAndAovTrends(
  filteredRecords: EnrichedRecord[],
  scopeRecordsForMoM: EnrichedRecord[]
): CostAndAovPoint[] {
  const agg = (recs: EnrichedRecord[]) => {
    const map = new Map<string, { cost: number; gmv: number; qty: number }>();
    for (const r of recs) {
      const b = map.get(r.年月) ?? { cost: 0, gmv: 0, qty: 0 };
      b.cost += r.总成本;
      b.gmv += r.销售额;
      b.qty += r.销售数量;
      map.set(r.年月, b);
    }
    return map;
  };

  const allMap = agg(scopeRecordsForMoM);
  const filteredMap = agg(filteredRecords);
  const sortedAll = Array.from(allMap.keys()).sort();
  const prevLookup = new Map<string, string>();
  for (let i = 1; i < sortedAll.length; i++) {
    prevLookup.set(sortedAll[i], sortedAll[i - 1]);
  }

  return Array.from(filteredMap.keys())
    .sort()
    .map((ym) => {
      const cur = filteredMap.get(ym)!;
      const curAov = cur.qty === 0 ? 0 : cur.gmv / cur.qty;
      const prevKey = prevLookup.get(ym);
      const prev = prevKey ? allMap.get(prevKey) : undefined;
      const prevAov = prev && prev.qty > 0 ? prev.gmv / prev.qty : undefined;

      return {
        yearMonth: ym,
        totalCost: cur.cost,
        totalCostMoM:
          prev && prev.cost !== 0 ? (cur.cost - prev.cost) / Math.abs(prev.cost) : null,
        costRatioToGmv: cur.gmv === 0 ? 0 : cur.cost / cur.gmv,
        aov: curAov,
        aovMoM:
          prevAov !== undefined && prevAov !== 0
            ? (curAov - prevAov) / Math.abs(prevAov)
            : null,
        quantity: cur.qty,
        gmv: cur.gmv,
      };
    });
}

