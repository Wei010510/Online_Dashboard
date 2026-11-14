import { EnrichedRecord, SkuMappingRecord, TLRecord } from '../types/bi';
import {
  OrdersAdsAlertLevel,
  OrdersAdsDailyMetrics,
  OrdersAdsDailyPoint,
  OrdersAdsDirection,
  OrdersAdsFilters,
  OrdersAdsMetricKey,
  OrdersAdsProductRecord,
  OrdersAdsRecord,
  OrdersAdsSpuDelta,
  OrdersAdsSpuMovingRow,
  OrdersAdsSpuWeeklyRow,
  OrdersAdsTlTrendRow,
} from '../types/ordersAds';

export type OrdersAdsMarketMetricKey = 'gmv' | 'quantity' | 'clicks';

export interface OrdersAdsMarketShare {
  market: string;
  value: number;
  share: number;
}

export interface OrdersAdsMarketRow {
  market: string;
  metrics: OrdersAdsDailyMetrics;
}

const DAY_MS = 86_400_000;

function skuMarketKey(sku: string, market: string): string {
  return `${market.trim().toUpperCase()}__${sku.trim().toUpperCase()}`;
}

function toUtcDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateDerivedFields(date: string): Pick<OrdersAdsRecord, '年' | '月' | '日' | '周' | '周开始日期'> {
  const value = toUtcDate(date);
  const weekday = value.getUTCDay() || 7;
  const isoWeekDate = new Date(value);
  isoWeekDate.setUTCDate(isoWeekDate.getUTCDate() + 4 - weekday);
  const isoYearStart = new Date(Date.UTC(isoWeekDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((isoWeekDate.getTime() - isoYearStart.getTime()) / DAY_MS / 7 + 1 / 7);
  const weekStart = new Date(value);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekday + 1);

  return {
    年: value.getUTCFullYear(),
    月: value.getUTCMonth() + 1,
    日: value.getUTCDate(),
    周: week,
    周开始日期: formatIsoDate(weekStart),
  };
}

export function buildOrdersAdsRecords(
  productRecords: OrdersAdsProductRecord[],
  tlRecords: TLRecord[],
  skuMappings: SkuMappingRecord[],
  ownerRecords: EnrichedRecord[] = []
): {
  records: OrdersAdsRecord[];
  stats: { totalRows: number; skuMappedCount: number; tlMatchedCount: number };
} {
  const skuMap = new Map<string, string>();
  for (const mapping of skuMappings) {
    if (mapping.SKU && mapping.SkuMarket && mapping.NewestSKU) {
      skuMap.set(skuMarketKey(mapping.SKU, mapping.SkuMarket), mapping.NewestSKU.trim());
    }
  }

  const tlMap = new Map<string, string>();
  for (const record of tlRecords) {
    if (record.OP.trim() && record.TL.trim()) tlMap.set(record.OP.trim(), record.TL.trim());
  }

  const ownerMap = new Map<string, string>();
  for (const record of ownerRecords) {
    if (record.修正SKU && record.市场 && record.OP.trim()) {
      ownerMap.set(skuMarketKey(record.修正SKU, record.市场), record.OP.trim());
    }
  }

  let skuMappedCount = 0;
  let tlMatchedCount = 0;
  const records = productRecords.map((record) => {
    const msku = record.MSKU.trim();
    const extractedSku = msku.toLowerCase().startsWith('amzn') ? msku.slice(8, 19) : msku.slice(0, 11);
    const newestSku = skuMap.get(skuMarketKey(extractedSku, record.国家));
    const correctedSku = newestSku || extractedSku;
    const isSkuMapped = Boolean(newestSku);
    if (isSkuMapped) skuMappedCount++;

    const spuMatch = correctedSku.match(/^[A-Za-z]{3}/);
    const spu = spuMatch ? spuMatch[0].toUpperCase() : correctedSku.slice(0, 3).toUpperCase();
    const productOp = record.OP?.trim();
    const op = productOp || ownerMap.get(skuMarketKey(correctedSku, record.国家)) || '';
    const matchedTl = op ? tlMap.get(op) : undefined;
    const isTlMatched = Boolean(matchedTl);
    if (isTlMatched) tlMatchedCount++;

    return {
      ...record,
      ...getDateDerivedFields(record.日期),
      修正SKU: correctedSku,
      SPU: spu,
      OP: op,
      TL: matchedTl ?? '未分配TL',
      isSkuMapped,
      isTlMatched,
    };
  });

  return {
    records,
    stats: { totalRows: records.length, skuMappedCount, tlMatchedCount },
  };
}

export function filterOrdersAdsRecords(
  records: OrdersAdsRecord[],
  filters: OrdersAdsFilters
): OrdersAdsRecord[] {
  return records.filter((record) => {
    if (filters.markets.length && !filters.markets.includes(record.国家)) return false;
    if (filters.tls.length && !filters.tls.includes(record.TL)) return false;
    if (filters.spus.length && !filters.spus.includes(record.SPU)) return false;
    return true;
  });
}

export function shiftOrdersAdsDate(date: string, days: number): string {
  const shifted = toUtcDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return formatIsoDate(shifted);
}

export function formatOrdersAdsDate(date: string): string {
  const value = toUtcDate(date);
  return `${value.getUTCFullYear()}/${value.getUTCMonth() + 1}/${value.getUTCDate()}`;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function aggregateOrdersAdsMetrics(records: OrdersAdsRecord[]): OrdersAdsDailyMetrics {
  let gmv = 0;
  let orders = 0;
  let quantity = 0;
  let netSales = 0;
  let sessions = 0;
  let pv = 0;
  let impressions = 0;
  let clicks = 0;
  let adSpend = 0;
  let adSales = 0;
  let adOrders = 0;

  for (const record of records) {
    gmv += record.销售额;
    orders += record.订单量;
    quantity += record.销量;
    netSales += record.净销售额;
    sessions += record.SessionsTotal;
    pv += record.PVTotal;
    impressions += record.展示;
    clicks += record.点击;
    adSpend -= record.广告花费;
    adSales += record.广告销售额;
    adOrders += record.广告订单量;
  }

  return {
    gmv,
    orders,
    quantity,
    netSales,
    sessions,
    pv,
    impressions,
    clicks,
    adSpend,
    adSales,
    adOrders,
    acos: ratio(adSpend, adSales),
    cpc: ratio(adSpend, clicks),
    ctr: ratio(clicks, impressions),
    cvr: ratio(orders, clicks),
    tcos: ratio(adSpend, gmv),
    adCvr: ratio(adOrders, clicks),
  };
}

export function computeOrdersAdsDailyPoint(records: OrdersAdsRecord[], date: string): OrdersAdsDailyPoint {
  return {
    date,
    metrics: aggregateOrdersAdsMetrics(records.filter((record) => record.日期 === date)),
  };
}

export function computeOrdersAdsDailySeries(
  records: OrdersAdsRecord[],
  endDate: string,
  days = 30
): OrdersAdsDailyPoint[] {
  const count = Math.max(0, Math.floor(days));
  const byDate = new Map<string, OrdersAdsRecord[]>();
  for (const record of records) {
    const bucket = byDate.get(record.日期) ?? [];
    bucket.push(record);
    byDate.set(record.日期, bucket);
  }

  return Array.from({ length: count }, (_, index) => {
    const date = shiftOrdersAdsDate(endDate, index - count + 1);
    return { date, metrics: aggregateOrdersAdsMetrics(byDate.get(date) ?? []) };
  });
}

export function computeOrdersAdsSpuDeltas(records: OrdersAdsRecord[], date: string): OrdersAdsSpuDelta[] {
  const yesterdayDate = shiftOrdersAdsDate(date, -1);
  const groups = new Map<string, { today: OrdersAdsRecord[]; yesterday: OrdersAdsRecord[] }>();

  for (const record of records) {
    const group = groups.get(record.SPU) ?? { today: [], yesterday: [] };
    if (record.日期 === date) group.today.push(record);
    if (record.日期 === yesterdayDate) group.yesterday.push(record);
    groups.set(record.SPU, group);
  }

  return Array.from(groups.entries()).map(([spu, group]) => {
    const today = aggregateOrdersAdsMetrics(group.today);
    const yesterday = aggregateOrdersAdsMetrics(group.yesterday);
    return {
      spu,
      today,
      yesterday,
      gmvDelta: today.gmv - yesterday.gmv,
      ordersDelta: today.orders - yesterday.orders,
      quantityDelta: today.quantity - yesterday.quantity,
    };
  });
}

export function getOrdersAdsWeekStart(date: string): string {
  const value = toUtcDate(date);
  const weekday = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - weekday + 1);
  return formatIsoDate(value);
}

export function computeOrdersAdsWeeklyPoint(records: OrdersAdsRecord[], weekStart: string): OrdersAdsDailyPoint {
  return {
    date: weekStart,
    metrics: aggregateOrdersAdsMetrics(records.filter((record) => record.周开始日期 === weekStart)),
  };
}

export function computeOrdersAdsWeeklySeries(
  records: OrdersAdsRecord[],
  endWeek: string,
  weeks = 12
): OrdersAdsDailyPoint[] {
  const count = Math.max(0, Math.floor(weeks));
  const byWeek = new Map<string, OrdersAdsRecord[]>();
  for (const record of records) {
    const bucket = byWeek.get(record.周开始日期) ?? [];
    bucket.push(record);
    byWeek.set(record.周开始日期, bucket);
  }

  return Array.from({ length: count }, (_, index) => {
    const weekStart = shiftOrdersAdsDate(endWeek, (index - count + 1) * 7);
    return { date: weekStart, metrics: aggregateOrdersAdsMetrics(byWeek.get(weekStart) ?? []) };
  });
}

export function computeOrdersAdsSpuWeeklyDeltas(records: OrdersAdsRecord[], weekStart: string): OrdersAdsSpuDelta[] {
  const previousWeekStart = shiftOrdersAdsDate(weekStart, -7);
  const groups = new Map<string, { current: OrdersAdsRecord[]; previous: OrdersAdsRecord[] }>();

  for (const record of records) {
    const group = groups.get(record.SPU) ?? { current: [], previous: [] };
    if (record.周开始日期 === weekStart) group.current.push(record);
    if (record.周开始日期 === previousWeekStart) group.previous.push(record);
    groups.set(record.SPU, group);
  }

  return Array.from(groups.entries()).map(([spu, group]) => {
    const current = aggregateOrdersAdsMetrics(group.current);
    const previous = aggregateOrdersAdsMetrics(group.previous);
    return {
      spu,
      today: current,
      yesterday: previous,
      gmvDelta: current.gmv - previous.gmv,
      ordersDelta: current.orders - previous.orders,
      quantityDelta: current.quantity - previous.quantity,
    };
  });
}

function diffRatio(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

export function computeOrdersAdsSpuWeeklyRows(records: OrdersAdsRecord[], weekStart: string): OrdersAdsSpuWeeklyRow[] {
  const previousWeekStart = shiftOrdersAdsDate(weekStart, -7);
  const groups = new Map<string, { current: OrdersAdsRecord[]; previous: OrdersAdsRecord[] }>();

  for (const record of records) {
    const group = groups.get(record.SPU) ?? { current: [], previous: [] };
    if (record.周开始日期 === weekStart) group.current.push(record);
    if (record.周开始日期 === previousWeekStart) group.previous.push(record);
    groups.set(record.SPU, group);
  }

  return Array.from(groups.entries())
    .map(([spu, group]) => {
      const current = aggregateOrdersAdsMetrics(group.current);
      const previous = aggregateOrdersAdsMetrics(group.previous);
      return {
        spu,
        current,
        previous,
        ctrDelta: diffRatio(current.ctr, previous.ctr),
        cvrDelta: diffRatio(current.cvr, previous.cvr),
        tcosDelta: diffRatio(current.tcos, previous.tcos),
      };
    })
    .sort((a, b) => b.current.gmv - a.current.gmv);
}

export function computeOrdersAdsMarketShares(records: OrdersAdsRecord[], metric: OrdersAdsMarketMetricKey): OrdersAdsMarketShare[] {
  const groups = new Map<string, OrdersAdsRecord[]>();
  for (const record of records) {
    const bucket = groups.get(record.国家) ?? [];
    bucket.push(record);
    groups.set(record.国家, bucket);
  }

  const rows = Array.from(groups.entries()).map(([market, marketRecords]) => {
    const metrics = aggregateOrdersAdsMetrics(marketRecords);
    const value = metric === 'gmv' ? metrics.gmv : metric === 'quantity' ? metrics.quantity : metrics.clicks;
    return { market, value, share: 0 };
  });
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows
    .map((row) => ({ ...row, share: total === 0 ? 0 : row.value / total }))
    .sort((a, b) => b.value - a.value);
}

export function computeOrdersAdsMarketRows(records: OrdersAdsRecord[]): OrdersAdsMarketRow[] {
  const groups = new Map<string, OrdersAdsRecord[]>();
  for (const record of records) {
    const bucket = groups.get(record.国家) ?? [];
    bucket.push(record);
    groups.set(record.国家, bucket);
  }

  return Array.from(groups.entries())
    .map(([market, marketRecords]) => ({ market, metrics: aggregateOrdersAdsMetrics(marketRecords) }))
    .sort((a, b) => b.metrics.gmv - a.metrics.gmv);
}

export function computeOrdersAdsSpuMovingRows(records: OrdersAdsRecord[], today: string): OrdersAdsSpuMovingRow[] {
  const date16Before = shiftOrdersAdsDate(today, -16);
  const date8Before = shiftOrdersAdsDate(today, -8);
  const date31Before = shiftOrdersAdsDate(today, -31);

  const bySpu = new Map<string, { today: number; d15: number; week: number; month: number }>();
  for (const record of records) {
    const d = record.日期;
    if (d > today) continue;
    const spu = record.SPU;
    const bucket = bySpu.get(spu) ?? { today: 0, d15: 0, week: 0, month: 0 };
    if (d === today) bucket.today += record.销量;
    if (d >= date16Before && d < today) bucket.d15 += record.销量;
    if (d >= date8Before && d < today) bucket.week += record.销量;
    if (d >= date31Before && d < today) bucket.month += record.销量;
    bySpu.set(spu, bucket);
  }

  const rows = Array.from(bySpu.entries()).map(([spu, b]) => {
    const avg15d = b.d15 / 15;
    const avgWeek = b.week / 7;
    const avgMonth = b.month / 30;
    const weightedDaily = avgWeek * 0.5 + avg15d * 0.3 + avgMonth * 0.2;
    const weightedDelta = b.today - weightedDaily;

    let weightedGapRate: number | null;
    if (weightedDaily === 0) {
      weightedGapRate = 0;
    } else if (weightedDelta === 0) {
      weightedGapRate = null;
    } else {
      weightedGapRate = weightedDelta / weightedDaily;
    }

    const absRate = Math.abs(weightedGapRate ?? 0);
    let alert: OrdersAdsAlertLevel;
    let weight: number;
    if (absRate >= 0.5) {
      alert = '高异动';
      weight = 3;
    } else if (absRate >= 0.3) {
      alert = '中异动';
      weight = 2;
    } else if (absRate >= 0.2) {
      alert = '低异动';
      weight = 1;
    } else {
      alert = '正常';
      weight = 0;
    }

    const direction: OrdersAdsDirection = weightedDelta > 0 ? '上涨' : weightedDelta < 0 ? '下跌' : '持平';
    const intensityScore = absRate * weight;

    return {
      spu,
      todayQuantity: b.today,
      avg15d,
      avgWeek,
      avgMonth,
      weightedDaily,
      weightedDelta,
      weightedGapRate,
      alert,
      direction,
      intensityScore,
    };
  });

  const ALERT_PRIORITY: Record<OrdersAdsAlertLevel, number> = { 高异动: 0, 中异动: 1, 低异动: 2, 正常: 3 };
  return rows.sort(
    (a, b) =>
      ALERT_PRIORITY[a.alert] - ALERT_PRIORITY[b.alert] ||
      b.intensityScore - a.intensityScore ||
      a.spu.localeCompare(b.spu)
  );
}

export function computeOrdersAdsTlTrendRows(
  records: OrdersAdsRecord[],
  date: string,
  metric: OrdersAdsMetricKey,
  days = 30
): OrdersAdsTlTrendRow[] {
  const field = metric === 'gmv' ? '销售额' : metric === 'orders' ? '订单量' : '销量';
  const groups = new Map<string, { daily: Map<string, number>; cumulative: number }>();

  for (const record of records) {
    const group = groups.get(record.TL) ?? { daily: new Map<string, number>(), cumulative: 0 };
    group.daily.set(record.日期, (group.daily.get(record.日期) ?? 0) + record[field]);
    if (record.日期 <= date) group.cumulative += record[field];
    groups.set(record.TL, group);
  }

  const count = Math.max(0, Math.floor(days));
  const yesterdayDate = shiftOrdersAdsDate(date, -1);
  return Array.from(groups.entries()).map(([tl, group]) => {
    const today = group.daily.get(date) ?? 0;
    const yesterday = group.daily.get(yesterdayDate) ?? 0;
    const delta = today - yesterday;
    const momentum = yesterday !== 0 ? delta / Math.abs(yesterday) : today !== 0 ? null : 0;
    const trend = Array.from({ length: count }, (_, index) => {
      const trendDate = shiftOrdersAdsDate(date, index - count + 1);
      return { date: trendDate, value: group.daily.get(trendDate) ?? 0 };
    });
    return { tl, today, yesterday, delta, momentum, cumulative: group.cumulative, trend };
  });
}
