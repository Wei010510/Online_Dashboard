import { SkuMappingRecord } from '../types/bi';
import { buildEnrichedRecords } from './biEngine';
import {
  SupervisorAccountingRecord,
  SupervisorCostKey,
  SupervisorFilters,
  SupervisorMonthlyRow,
  SupervisorOpMetrics,
  SupervisorOpSpuMetrics,
  SupervisorRecord,
  SupervisorShareItem,
  SupervisorSummary,
} from '../types/supervisor';

export const SUPERVISOR_COST_FIELDS: { key: SupervisorCostKey; label: string }[] = [
  { key: '采购成本', label: '采购%' },
  { key: '头程成本', label: '头程%' },
  { key: '尾程成本', label: '尾程%' },
  { key: '总平台费', label: '平台%' },
  { key: '人工成本', label: '人工%' },
  { key: '仓租', label: '仓租%' },
  { key: '广告费', label: '广告%' },
  { key: '售后', label: '售后%' },
  { key: '直接调整费', label: '直调%' },
  { key: '间接调整费', label: '间调%' },
];

const safeRatio = (value: number, total: number) => (total === 0 ? 0 : value / total);

function averageUnitSales(records: SupervisorRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, record) => {
    if (typeof record.单件销售额 === 'number' && Number.isFinite(record.单件销售额)) {
      return sum + record.单件销售额;
    }
    return sum + (record.销售数量 === 0 ? 0 : record.销售额 / record.销售数量);
  }, 0);
  return total / records.length;
}

export function buildSupervisorRecords(
  details: SupervisorAccountingRecord[],
  skuMappings: SkuMappingRecord[]
): {
  records: SupervisorRecord[];
  stats: { totalRows: number; skuMappedCount: number };
} {
  const detailMap = new Map(details.map((detail) => [detail.id, detail]));
  const { records, stats } = buildEnrichedRecords(details, [], skuMappings);
  const enriched = records.map((record) => {
    const source = detailMap.get(record.id);
    return {
      ...record,
      单件销售额: source?.单件销售额,
      单件成本: source?.单件成本,
    };
  });
  return {
    records: enriched,
    stats: { totalRows: stats.totalRows, skuMappedCount: stats.skuMappedCount },
  };
}

export function filterSupervisorRecords(
  records: SupervisorRecord[],
  filters: SupervisorFilters
): SupervisorRecord[] {
  const keyword = filters.search.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (filters.years.length && !filters.years.includes(record.年)) return false;
    if (filters.months.length && !filters.months.includes(record.月)) return false;
    if (filters.pms.length && !filters.pms.includes(record.PM)) return false;
    if (filters.productLines.length && !filters.productLines.includes(record.产品线)) return false;
    if (filters.markets.length && !filters.markets.includes(record.市场)) return false;
    if (filters.periods.length && !filters.periods.includes(record.周期)) return false;
    if (filters.ops.length && !filters.ops.includes(record.OP)) return false;
    if (filters.spus.length && !filters.spus.includes(record.SPU)) return false;
    if (filters.skus.length && !filters.skus.includes(record.修正SKU)) return false;
    if (!keyword) return true;
    return [record.年, record.月, record.周期, record.周期范围, record.平台, record.市场, record.SKU, record.修正SKU, record.SPU, record.BU, record.产品线, record.OP, record.PM]
      .join(' ')
      .toLocaleLowerCase()
      .includes(keyword);
  });
}

export function computeSupervisorSummary(records: SupervisorRecord[]): SupervisorSummary {
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

  for (const record of records) {
    gmv += record.销售额;
    profit += record.利润额;
    totalCost += record.总成本;
    quantity += record.销售数量;
    adCost += record.广告费;
    purchaseCost += record.采购成本;
    firstLegCost += record.头程成本;
    lastLegCost += record.尾程成本;
    platformFee += record.总平台费;
    laborCost += record.人工成本;
    warehouseRent += record.仓租;
    afterSalesCost += record.售后;
    directAdjustment += record.直接调整费;
    indirectAdjustment += record.间接调整费;
    if (record.OP) ops.add(record.OP);
  }

  const opCount = ops.size;
  return {
    gmv,
    profit,
    totalCost,
    quantity,
    aov: averageUnitSales(records),
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
    profitRate: safeRatio(profit, gmv),
    adRatio: safeRatio(adCost, gmv),
    afterSalesRatio: safeRatio(afterSalesCost, gmv),
    opCount,
    salesEfficiency: opCount === 0 ? 0 : gmv / opCount,
    profitEfficiency: opCount === 0 ? 0 : profit / opCount,
  };
}

function previousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthDelta(current: number, previous?: number): number | null {
  return previous === undefined || previous === 0 ? null : (current - previous) / Math.abs(previous);
}

export function computeSupervisorMonthly(
  filteredRecords: SupervisorRecord[],
  comparisonRecords: SupervisorRecord[]
): SupervisorMonthlyRow[] {
  const group = (records: SupervisorRecord[]) => {
    const map = new Map<string, SupervisorRecord[]>();
    for (const record of records) {
      const bucket = map.get(record.年月) ?? [];
      bucket.push(record);
      map.set(record.年月, bucket);
    }
    return map;
  };
  const filteredMap = group(filteredRecords);
  const comparisonMap = group(comparisonRecords);
  const comparisonSummaries = new Map<string, SupervisorSummary>();
  comparisonMap.forEach((records, yearMonth) => {
    comparisonSummaries.set(yearMonth, computeSupervisorSummary(records));
  });

  return Array.from(filteredMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, records]) => {
      const summary = computeSupervisorSummary(records);
      const previous = comparisonSummaries.get(previousYearMonth(yearMonth));
      const costs = Object.fromEntries(
        SUPERVISOR_COST_FIELDS.map(({ key }) => [key, records.reduce((sum, record) => sum + record[key], 0)])
      ) as Record<SupervisorCostKey, number>;
      const costRatios = Object.fromEntries(
        SUPERVISOR_COST_FIELDS.map(({ key }) => [key, safeRatio(costs[key], summary.gmv)])
      ) as Record<SupervisorCostKey, number>;
      return {
        ...summary,
        yearMonth,
        year: records[0].年,
        month: records[0].月,
        gmvMoM: monthDelta(summary.gmv, previous?.gmv),
        profitMoM: monthDelta(summary.profit, previous?.profit),
        gmvDiff: previous ? summary.gmv - previous.gmv : null,
        profitDiff: previous ? summary.profit - previous.profit : null,
        costs,
        costRatios,
      };
    });
}

export function computeSupervisorShares(
  records: SupervisorRecord[],
  dimension: 'OP' | '年月',
  metric: '销售额' | '销售数量'
): SupervisorShareItem[] {
  const values = new Map<string, number>();
  let total = 0;
  for (const record of records) {
    const key = record[dimension];
    const value = record[metric];
    values.set(key, (values.get(key) ?? 0) + value);
    total += value;
  }
  const items = Array.from(values.entries()).map(([key, value]) => ({
    key,
    label: dimension === '年月' ? key.slice(2) : key,
    value,
    share: safeRatio(value, total),
  }));
  return dimension === '年月'
    ? items.sort((a, b) => a.key.localeCompare(b.key))
    : items.sort((a, b) => b.value - a.value);
}

export function computeSupervisorOpMetrics(records: SupervisorRecord[]): SupervisorOpMetrics[] {
  const groups = new Map<string, SupervisorRecord[]>();
  for (const record of records) {
    const bucket = groups.get(record.OP) ?? [];
    bucket.push(record);
    groups.set(record.OP, bucket);
  }
  return Array.from(groups.entries())
    .map(([op, groupRecords]) => ({ op, ...computeSupervisorSummary(groupRecords) }))
    .sort((a, b) => b.gmv - a.gmv);
}

export function computeSupervisorOpSpuMetrics(records: SupervisorRecord[]): SupervisorOpSpuMetrics[] {
  const groups = new Map<string, SupervisorRecord[]>();
  for (const record of records) {
    const key = `${record.OP}__${record.SPU}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(record);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries())
    .map(([, groupRecords]) => ({
      op: groupRecords[0].OP,
      spu: groupRecords[0].SPU,
      ...computeSupervisorSummary(groupRecords),
    }))
    .sort((a, b) => b.gmv - a.gmv);
}
