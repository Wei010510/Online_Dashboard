export type BoardId = 'home' | 'director' | 'orders_ads' | 'supervisor';
export type DataBoardId = 'director' | 'orders_ads' | 'supervisor';

export interface TLRecord {
  OP: string;
  TL: string;
}

export interface SkuMappingRecord {
  Country: string;
  SkuMarket: string; // Maps to 核算报表明细.市场
  SKU: string;       // Old SKU
  NewestSKU: string; // New SKU
}

export interface AccountingDetailRecord {
  id: string;
  周期: string;       // YYYY-MM
  周期范围: string;   // e.g. 2024-01-01 ~ 2024-01-31
  年: number;
  月: number;
  平台: string;
  市场: string;
  SKU: string;
  BU: string;
  产品线: string;
  OP: string;
  PM: string;
  销售数量: number;
  销售额: number;     // GMV
  广告费: number;
  采购成本: number;
  头程成本: number;
  尾程成本: number;
  总平台费: number;
  人工成本: number;
  仓租: number;
  售后: number;
  直接调整费: number;
  间接调整费: number;
  利润额?: number;    // If omitted, derived as 销售额 - 总成本
}

export interface EnrichedRecord extends AccountingDetailRecord {
  TL: string;
  修正SKU: string;
  SPU: string;
  总成本: number;
  利润额: number;
  年月: string; // YYYY-MM
  isSkuMapped: boolean;
}

export interface MacroFilters {
  years: number[];  // empty = all
  months: number[]; // empty = all
}

export interface DrilldownFilters {
  years: number[];
  months: number[];
  markets: string[];
  tls: string[];
  spus: string[];
}

export interface CostItemMetric {
  key: string;
  label: string;
  amount: number;
  ratioToGmv: number;
}

export interface SummaryMetrics {
  yearLabel: string;
  gmv: number;
  profit: number;
  profitRate: number;
  totalCost: number;
  quantity: number;
  aov: number; // 客单价
  opCount: number; // 人数 COUNTD(OP)
  salesEfficiency: number; // 销售额人效
  profitEfficiency: number; // 利润人效
  tcos: number; // 广告费 / GMV
  adCost: number;
  purchaseCost: number;
  firstLegCost: number;
  lastLegCost: number;
  platformFee: number;
  laborCost: number;
  warehouseRent: number;
  afterSalesCost: number;
  directAdjustment: number;
  indirectAdjustment: number;
  costBreakdown: CostItemMetric[];
}

export interface MonthlyMonitorRow {
  yearMonth: string; // YYYY-MM
  year: number;
  month: number;
  gmv: number;
  gmvMoM: number | null;
  profit: number;
  profitMoM: number | null;
  profitRate: number;
  quantity: number;
  quantityMoM: number | null;
  opCount: number;
  salesEfficiency: number;
  salesEfficiencyMoM: number | null;
  profitEfficiency: number;
  profitEfficiencyMoM: number | null;
}

export interface TLShareItem {
  tl: string;
  gmv: number;
  gmvShare: number;
  profit: number;
  profitShare: number;
  opCount: number;
  profitRate: number;
}

export interface ParetoPoint {
  yearMonth: string;
  value: number;
  cumulativePct: number;
  opCount: number;
  totalValue: number;
}

export interface YoYYearSeries {
  year: number;
  color: string;
  points: {
    month: number;
    value: number | null;
    yoyPct: number | null;
  }[];
}

export interface CrossTabYearRow {
  year: number;
  metric: 'GMV' | '利润额' | '销售数量';
  months: (number | null)[]; // index 0..11 for 1月..12月
  total: number;
}

export interface DrilldownSummaryRow {
  spu: string;
  correctedSku: string;
  market: string;
  tl: string;
  gmv: number;
  profit: number;
  profitRate: number;
  quantity: number;
  tcos: number;
  opCount: number;
}

export interface DatasetBundle {
  tlRecords: TLRecord[];
  skuMappings: SkuMappingRecord[];
  accountingDetails: AccountingDetailRecord[];
  sourceLabel: string;
  updatedAt: string;
  isCustom?: boolean;
}

export interface BoardTableDataset {
  boardId: 'orders_ads' | 'supervisor';
  sourceLabel: string;
  fileName: string;
  fileNames?: string[];
  columns: string[];
  rows: Record<string, unknown>[];
  updatedAt: string;
  isCustom: boolean;
}
