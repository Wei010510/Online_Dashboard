import { SkuMappingRecord, TLRecord } from '../types/bi';
import { OrdersAdsProductRecord } from '../types/ordersAds';
import { parseSkuMappingRows, parseTLRows } from './excelParser';

function normalizeKey(key: string): string {
  return key.replace(/\s+/g, '').replace(/[_-]/g, '').toLowerCase();
}

function getField(row: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const found = entries.find(([key]) => normalizeKey(key) === target);
    if (found) return found[1];
  }
  return undefined;
}

function toString(value: unknown, fallback = ''): string {
  return value === undefined || value === null ? fallback : String(value).trim();
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[,¥$￥%\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function formatDateParts(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseExcelSerialDate(serial: number): string {
  if (!Number.isFinite(serial) || serial <= 0) return '';
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function parseDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'number') return parseExcelSerialDate(value);

  const text = toString(value);
  if (!text) return '';
  const matched = text.match(/^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})(?:\s*日)?(?:\s|$|T)/);
  if (matched) return formatDateParts(Number(matched[1]), Number(matched[2]), Number(matched[3]));
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return formatDateParts(Number(compact[1]), Number(compact[2]), Number(compact[3]));
  if (/^\d+(?:\.\d+)?$/.test(text)) return parseExcelSerialDate(Number(text));
  return '';
}

export function parseOrdersAdsProductRows(
  rows: Record<string, unknown>[],
  idPrefix = 'OA-IMP'
): OrdersAdsProductRecord[] {
  return rows.map((row, index) => {
    const adSpend = toNumber(getField(row, ['广告花费', '广告费', '广告成本', '广告支出', 'AdSpend', 'Ad Spend', 'AdvertisingCost', 'Advertising Cost', 'Spend']));
    const op = toString(getField(row, ['OP', '运营', '运营人员', '负责人', 'Owner']));
    const record: OrdersAdsProductRecord = {
      id: `${idPrefix}-${index + 1}`,
      日期: parseDate(getField(row, ['日期', 'Date', '业务日期', '报告日期', '统计日期', 'Day'])),
      父ASIN: toString(getField(row, ['父ASIN', 'ParentASIN', 'Parent ASIN', '父体ASIN'])),
      ASIN: toString(getField(row, ['ASIN', 'Asin', '子ASIN'])),
      MSKU: toString(getField(row, ['MSKU', 'M SKU', 'MerchantSKU', 'Merchant SKU', 'SellerSKU', 'Seller SKU', '卖家SKU'])),
      SKU: toString(getField(row, ['SKU', '产品SKU', '老SKU', 'OriginalSKU'])),
      国家: toString(getField(row, ['国家', 'Country', '国家/地区', 'Country/Region', '市场', 'Market', '站点', 'SkuMarket', 'Sku-Market'])),
      SessionsTotal: toNumber(getField(row, ['SessionsTotal', 'Sessions Total', 'Sessions', '会话数', '总会话数', '会话', '访问量'])),
      SessionsPercentage: toNumber(getField(row, ['SessionsPercentage', 'Sessions Percentage', 'SessionPercentage', 'Sessions %', '会话百分比', '会话占比'])),
      PVTotal: toNumber(getField(row, ['PVTotal', 'PV Total', 'PV', 'PageViews', 'Page Views', '浏览量', '页面浏览量'])),
      PVPercentage: toNumber(getField(row, ['PVPercentage', 'PV Percentage', 'PageViewsPercentage', 'Page Views Percentage', 'PV占比', '浏览量占比'])),
      UnitSessionsPercentage: toNumber(getField(row, ['UnitSessionsPercentage', 'Unit Session Percentage', 'Unit Sessions Percentage', 'UnitSessionPercentage', 'ConversionRate', '订单转化率', '单位会话百分比'])),
      销量: toNumber(getField(row, ['销量', '销售数量', 'Units', 'UnitsSold', 'Units Sold', 'Units Ordered', 'Quantity', 'Qty'])),
      订单量: toNumber(getField(row, ['订单量', '订单数', '订单总数', 'Orders', 'OrderCount', 'Order Count', 'Total Order Items'])),
      销售额: toNumber(getField(row, ['销售额', '销售金额', 'GMV', '营收', 'Sales', 'Revenue', 'OrderedProductSales', 'Ordered Product Sales'])),
      净销售额: toNumber(getField(row, ['净销售额', 'NetSales', 'Net Sales', 'NetRevenue', 'Net Revenue'])),
      大类排名: toNumber(getField(row, ['大类排名', 'MainCategoryRank', 'Main Category Rank', 'CategoryRank', 'Category Rank', 'SalesRank', 'Sales Rank'])),
      小类排名: toNumber(getField(row, ['小类排名', 'SubCategoryRank', 'Sub Category Rank', 'SubcategoryRank'])),
      评分: toNumber(getField(row, ['评分', 'Rating', 'ReviewRating', 'Review Rating', 'AverageRating', 'Average Rating'])),
      评论数: toNumber(getField(row, ['评论数', 'ReviewCount', 'Review Count', 'Reviews', 'NumberOfReviews', 'RatingsCount'])),
      展示: toNumber(getField(row, ['展示', '展示量', '曝光', '曝光量', 'Impressions', 'Impression'])),
      点击: toNumber(getField(row, ['点击', '点击量', 'Clicks', 'Click'])),
      广告花费: adSpend === 0 ? 0 : -Math.abs(adSpend),
      广告销售额: toNumber(getField(row, ['广告销售额', '广告销售', 'AdSales', 'Ad Sales', 'AdvertisingSales', 'Advertising Sales', 'AttributedSales'])),
      广告订单量: toNumber(getField(row, ['广告订单量', '广告订单数', 'AdOrders', 'Ad Orders', 'AdvertisingOrders', 'Advertising Orders'])),
    };
    if (op) record.OP = op;
    return record;
  }).filter((record) => record.日期 && (record.MSKU || record.ASIN));
}

export function detectOrdersAdsTableType(
  rows: Record<string, unknown>[],
  fileName: string
): 'product' | 'sku' | 'tl' | 'unknown' {
  const firstRow = rows[0];
  if (firstRow) {
    const keys = Object.keys(firstRow).map(normalizeKey);
    const hasAny = (candidates: string[]) => candidates.some((candidate) => keys.includes(normalizeKey(candidate)));

    const isTl = hasAny(['OP', '运营', '运营人员', '负责人']) && hasAny(['TL', '组长', '所属组长', '运营组长', '主管']);
    if (isTl) return 'tl';

    const isSku = hasAny(['NewestSKU', 'Newest-SKU', '新SKU', '最新SKU']) && hasAny(['SKU', '老SKU', 'OldSKU']);
    if (isSku) return 'sku';

    const isProduct =
      hasAny(['日期', 'Date', '业务日期', '报告日期', '统计日期', 'Day']) &&
      hasAny(['MSKU', 'M SKU', 'MerchantSKU', 'SellerSKU', '卖家SKU', 'ASIN', 'Asin', '子ASIN']) &&
      hasAny([
        '销售额', '销售金额', 'GMV', 'OrderedProductSales', 'Sales', 'Revenue',
        '销量', '销售数量', 'Units', 'UnitsSold', '订单量', '订单数', 'Orders',
        'SessionsTotal', 'Sessions', '会话数', 'PVTotal', 'PageViews', '浏览量',
        '展示', '展示量', '曝光', '曝光量', 'Impressions', '点击', '点击量', 'Clicks',
        '广告花费', '广告费', '广告成本', 'AdSpend', 'AdvertisingCost', 'Spend',
        '广告销售额', 'AdSales', 'AdvertisingSales', '广告订单量', 'AdOrders', 'AdvertisingOrders',
      ]);
    if (isProduct) return 'product';
  }

  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.includes('tl') || lowerFileName.includes('组长')) return 'tl';
  if (lowerFileName.includes('sku') || lowerFileName.includes('匹配')) return 'sku';
  if (lowerFileName.includes('产品') || lowerFileName.includes('表现') || lowerFileName.includes('product') || lowerFileName.includes('广告')) return 'product';
  return 'unknown';
}

export function parseOrdersAdsSkuRows(rows: Record<string, unknown>[]): SkuMappingRecord[] {
  return parseSkuMappingRows(rows);
}

export function parseOrdersAdsTlRows(rows: Record<string, unknown>[]): TLRecord[] {
  return parseTLRows(rows);
}
