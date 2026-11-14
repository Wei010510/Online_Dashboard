import { SkuMappingRecord, TLRecord } from './bi';

export interface OrdersAdsProductRecord {
  id: string;
  日期: string;
  父ASIN: string;
  ASIN: string;
  MSKU: string;
  SKU: string;
  国家: string;
  SessionsTotal: number;
  SessionsPercentage: number;
  PVTotal: number;
  PVPercentage: number;
  UnitSessionsPercentage: number;
  销量: number;
  订单量: number;
  销售额: number;
  净销售额: number;
  大类排名: number;
  小类排名: number;
  评分: number;
  评论数: number;
  展示: number;
  点击: number;
  广告花费: number;
  广告销售额: number;
  广告订单量: number;
  OP?: string;
}

export interface OrdersAdsRecord extends OrdersAdsProductRecord {
  年: number;
  月: number;
  日: number;
  周: number;
  周开始日期: string;
  修正SKU: string;
  SPU: string;
  OP: string;
  TL: string;
  isSkuMapped: boolean;
  isTlMatched: boolean;
}

export interface OrdersAdsDataset {
  boardId: 'orders_ads';
  productRecords: OrdersAdsProductRecord[];
  tlRecords: TLRecord[];
  skuMappings: SkuMappingRecord[];
  sourceLabel: string;
  fileNames: string[];
  updatedAt: string;
  isCustom: boolean;
}

export interface OrdersAdsFilters {
  markets: string[];
  tls: string[];
  spus: string[];
}

export const EMPTY_ORDERS_ADS_FILTERS: OrdersAdsFilters = {
  markets: [],
  tls: [],
  spus: [],
};

export type OrdersAdsMetricKey = 'gmv' | 'orders' | 'quantity';

export interface OrdersAdsDailyMetrics {
  gmv: number;
  orders: number;
  quantity: number;
  netSales: number;
  sessions: number;
  pv: number;
  impressions: number;
  clicks: number;
  adSpend: number;
  adSales: number;
  adOrders: number;
  acos: number | null;
  cpc: number | null;
  ctr: number | null;
  cvr: number | null;
  tcos: number | null;
  adCvr: number | null;
}

export interface OrdersAdsDailyPoint {
  date: string;
  metrics: OrdersAdsDailyMetrics;
}

export interface OrdersAdsSpuDelta {
  spu: string;
  today: OrdersAdsDailyMetrics;
  yesterday: OrdersAdsDailyMetrics;
  gmvDelta: number;
  ordersDelta: number;
  quantityDelta: number;
}

export interface OrdersAdsTlTrendRow {
  tl: string;
  today: number;
  yesterday: number;
  delta: number;
  momentum: number | null;
  cumulative: number;
  trend: { date: string; value: number }[];
}

export interface OrdersAdsSpuWeeklyRow {
  spu: string;
  current: OrdersAdsDailyMetrics;
  previous: OrdersAdsDailyMetrics;
  ctrDelta: number | null;
  cvrDelta: number | null;
  tcosDelta: number | null;
}

export type OrdersAdsAlertLevel = '高异动' | '中异动' | '低异动' | '正常';
export type OrdersAdsDirection = '上涨' | '下跌' | '持平';

export interface OrdersAdsSpuMovingRow {
  spu: string;
  todayQuantity: number;
  avg15d: number;
  avgWeek: number;
  avgMonth: number;
  weightedDaily: number;
  weightedDelta: number;
  weightedGapRate: number | null;
  alert: OrdersAdsAlertLevel;
  direction: OrdersAdsDirection;
  intensityScore: number;
}
