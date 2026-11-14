import * as XLSX from 'xlsx';
import { AccountingDetailRecord, SkuMappingRecord, TLRecord } from '../types/bi';

function normalizeKey(key: string): string {
  return key.replace(/\s+/g, '').replace(/[_-]/g, '').toLowerCase();
}

function getField(row: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const cand of candidates) {
    const target = normalizeKey(cand);
    const found = entries.find(([k]) => normalizeKey(k) === target);
    if (found !== undefined) return found[1];
  }
  return undefined;
}

function toNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[,¥$￥%\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toStr(val: unknown, fallback = ''): string {
  if (val === undefined || val === null) return fallback;
  return String(val).trim();
}

function parseYearMonth(periodVal: unknown, yearVal: unknown, monthVal: unknown): { year: number; month: number; period: string } {
  const explicitYear = toNumber(yearVal, 0);
  const explicitMonth = toNumber(monthVal, 0);
  if (explicitYear >= 2000 && explicitMonth >= 1 && explicitMonth <= 12) {
    return {
      year: explicitYear,
      month: explicitMonth,
      period: `${explicitYear}-${String(explicitMonth).padStart(2, '0')}`,
    };
  }

  const raw = toStr(periodVal);
  const match = raw.match(/(20\d{2})[-/.年](\d{1,2})/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    return { year: y, month: m, period: `${y}-${String(m).padStart(2, '0')}` };
  }

  // Fallback for compact YYYYMM like 202405
  const compact = raw.match(/^(20\d{2})(\d{2})$/);
  if (compact) {
    const y = Number(compact[1]);
    const m = Number(compact[2]);
    return { year: y, month: m, period: `${y}-${String(m).padStart(2, '0')}` };
  }

  return { year: 2024, month: 1, period: '2024-01' };
}

export async function readExcelRows(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

export function parseTLRows(rows: Record<string, unknown>[]): TLRecord[] {
  return rows
    .map((r) => ({
      OP: toStr(getField(r, ['OP', '运营', '运营人员', '负责人'])),
      TL: toStr(getField(r, ['TL', '组长', '所属组长', '运营组长', '主管'])),
    }))
    .filter((r) => r.OP && r.TL);
}

export function parseSkuMappingRows(rows: Record<string, unknown>[]): SkuMappingRecord[] {
  return rows
    .map((r) => ({
      Country: toStr(getField(r, ['Country', '国家', '地区'])),
      SkuMarket: toStr(getField(r, ['Sku-Market', 'SkuMarket', '市场', '站点'])),
      SKU: toStr(getField(r, ['SKU', '老SKU', 'OldSKU'])),
      NewestSKU: toStr(getField(r, ['NewestSKU', 'Newest-SKU', '新SKU', '最新SKU'])),
    }))
    .filter((r) => r.SKU && r.NewestSKU);
}

export function parseAccountingDetailRows(
  rows: Record<string, unknown>[],
  idPrefix = 'IMP'
): AccountingDetailRecord[] {
  return rows.map((r, index) => {
    const periodRaw = getField(r, ['周期', '年月', '月份', '时间']);
    const yearRaw = getField(r, ['年', '年份', 'Year']);
    const monthRaw = getField(r, ['月', '月份', 'Month']);
    const { year, month, period } = parseYearMonth(periodRaw, yearRaw, monthRaw);

    const gmv = toNumber(getField(r, ['销售额', 'GMV', '销售金额', '营收']));
    const adCost = toNumber(getField(r, ['广告费', '广告成本', '推广费', 'Ads']));
    const purchaseCost = toNumber(getField(r, ['采购成本', '产品成本', '货值', 'COGS']));
    const firstLeg = toNumber(getField(r, ['头程成本', '头程', '头程运费']));
    const lastLeg = toNumber(getField(r, ['尾程成本', '尾程', '尾程运费', 'FBA配送费']));
    const platformFee = toNumber(getField(r, ['总平台费', '平台费', '佣金', '平台费用']));
    const laborCost = toNumber(getField(r, ['人工成本', '人工费用', '人力成本']));
    const warehouseRent = toNumber(getField(r, ['仓租', '仓储费', '仓储成本']));
    const afterSales = toNumber(getField(r, ['售后', '售后费用', '退款损失']));
    const directAdj = toNumber(getField(r, ['直接调整费', '直接调整']));
    const indirectAdj = toNumber(getField(r, ['间接调整费', '间接调整']));
    const profitField = getField(r, ['利润额', '净利润', '毛利润', '利润', 'Profit']);

    return {
      id: `${idPrefix}-${index + 1}`,
      周期: period,
      周期范围: toStr(getField(r, ['周期范围', '日期范围']), period),
      年: year,
      月: month,
      平台: toStr(getField(r, ['平台', 'Platform']), 'Amazon'),
      市场: toStr(getField(r, ['市场', '站点', 'Market', 'Sku-Market']), 'US'),
      SKU: toStr(getField(r, ['SKU', '产品SKU'])),
      BU: toStr(getField(r, ['BU', '事业部']), '默认BU'),
      产品线: toStr(getField(r, ['产品线', '品类', 'ProductLine']), '标准线'),
      OP: toStr(getField(r, ['OP', '运营', '负责人']), '未指定OP'),
      PM: toStr(getField(r, ['PM', '产品经理']), '未指定PM'),
      销售数量: toNumber(getField(r, ['销售数量', '销量', '订单量', 'Units', 'Qty'])),
      销售额: gmv,
      广告费: adCost,
      采购成本: purchaseCost,
      头程成本: firstLeg,
      尾程成本: lastLeg,
      总平台费: platformFee,
      人工成本: laborCost,
      仓租: warehouseRent,
      售后: afterSales,
      直接调整费: directAdj,
      间接调整费: indirectAdj,
      利润额: profitField !== undefined && profitField !== '' ? toNumber(profitField) : undefined,
    };
  });
}

export function detectDirectorTableType(
  rows: Record<string, unknown>[],
  fileName: string
): 'tl' | 'sku' | 'accounting' | 'unknown' {
  const firstRow = rows[0];
  if (!firstRow) return 'unknown';

  const keys = Object.keys(firstRow).map(normalizeKey);
  const hasAny = (candidates: string[]) =>
    candidates.some((c) => keys.includes(normalizeKey(c)));

  const isAccounting = hasAny([
    '销售额',
    'GMV',
    '销售金额',
    '采购成本',
    '头程成本',
    '尾程成本',
    '总平台费',
    '销售数量',
    '广告费',
  ]);
  if (isAccounting) return 'accounting';

  const isSkuMapping =
    hasAny(['NewestSKU', 'Newest-SKU', '新SKU', '最新SKU']) &&
    hasAny(['SKU', '老SKU', 'OldSKU']);
  if (isSkuMapping) return 'sku';

  const isTL =
    hasAny(['OP', '运营', '运营人员', '负责人']) &&
    hasAny(['TL', '组长', '所属组长', '运营组长', '主管']);
  if (isTL) return 'tl';

  const lower = fileName.toLowerCase();
  if (lower.includes('sku') || lower.includes('匹配')) return 'sku';
  if (lower.includes('tl') || lower.includes('组长')) return 'tl';
  if (lower.includes('核算') || lower.includes('报表') || lower.includes('明细')) return 'accounting';

  return 'unknown';
}

export function dedupeTLRecords(records: TLRecord[]): TLRecord[] {
  const map = new Map<string, TLRecord>();
  for (const r of records) {
    if (!r.OP || !r.TL) continue;
    map.set(r.OP.trim().toLowerCase(), { OP: r.OP.trim(), TL: r.TL.trim() });
  }
  return Array.from(map.values());
}

export function dedupeSkuMappings(records: SkuMappingRecord[]): SkuMappingRecord[] {
  const map = new Map<string, SkuMappingRecord>();
  for (const r of records) {
    if (!r.SKU || !r.NewestSKU) continue;
    const key = `${r.SKU.trim().toLowerCase()}__${r.SkuMarket.trim().toLowerCase()}__${r.Country.trim().toLowerCase()}`;
    map.set(key, r);
  }
  return Array.from(map.values());
}

export function mergeGenericTableBatches(
  existingColumns: string[],
  existingRows: Record<string, unknown>[],
  batches: { columns: string[]; rows: Record<string, unknown>[] }[]
): { columns: string[]; rows: Record<string, unknown>[] } {
  const colSet = new Set<string>(existingColumns);
  const mergedRows: Record<string, unknown>[] = [...existingRows];

  for (const batch of batches) {
    for (const c of batch.columns) {
      if (c && !colSet.has(c)) colSet.add(c);
    }
    for (const row of batch.rows) {
      mergedRows.push(row);
    }
  }

  return {
    columns: Array.from(colSet),
    rows: mergedRows,
  };
}
