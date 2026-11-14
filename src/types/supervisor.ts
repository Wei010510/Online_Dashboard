import { AccountingDetailRecord, EnrichedRecord, SkuMappingRecord } from './bi';

export interface SupervisorAccountingRecord extends AccountingDetailRecord {
  单件销售额?: number;
  单件成本?: number;
}

export interface SupervisorRecord extends EnrichedRecord {
  单件销售额?: number;
  单件成本?: number;
}

export interface SupervisorDataset {
  boardId: 'supervisor';
  skuMappings: SkuMappingRecord[];
  accountingDetails: SupervisorAccountingRecord[];
  sourceLabel: string;
  fileNames: string[];
  updatedAt: string;
  isCustom: boolean;
}

export type SupervisorCostKey =
  | '采购成本'
  | '头程成本'
  | '尾程成本'
  | '总平台费'
  | '人工成本'
  | '仓租'
  | '广告费'
  | '售后'
  | '直接调整费'
  | '间接调整费';

export interface SupervisorFilters {
  years: number[];
  months: number[];
  pms: string[];
  productLines: string[];
  markets: string[];
  periods: string[];
  ops: string[];
  spus: string[];
  skus: string[];
  search: string;
}

export type SupervisorDimensionFilter = Exclude<keyof SupervisorFilters, 'search'>;

export interface SupervisorSummary {
  gmv: number;
  profit: number;
  totalCost: number;
  quantity: number;
  aov: number;
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
  profitRate: number;
  adRatio: number;
  afterSalesRatio: number;
  opCount: number;
  salesEfficiency: number;
  profitEfficiency: number;
}

export interface SupervisorMonthlyRow extends SupervisorSummary {
  yearMonth: string;
  year: number;
  month: number;
  gmvMoM: number | null;
  profitMoM: number | null;
  gmvDiff: number | null;
  profitDiff: number | null;
  costs: Record<SupervisorCostKey, number>;
  costRatios: Record<SupervisorCostKey, number>;
}

export interface SupervisorShareItem {
  key: string;
  label: string;
  value: number;
  share: number;
}

export interface SupervisorOpMetrics extends SupervisorSummary {
  op: string;
}

export interface SupervisorOpSpuMetrics extends SupervisorSummary {
  op: string;
  spu: string;
}

export const EMPTY_SUPERVISOR_FILTERS: SupervisorFilters = {
  years: [],
  months: [],
  pms: [],
  productLines: [],
  markets: [],
  periods: [],
  ops: [],
  spus: [],
  skus: [],
  search: '',
};
