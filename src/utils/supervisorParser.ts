import { SkuMappingRecord } from '../types/bi';
import { parseSkuMappingRows } from './excelParser';
import { SupervisorAccountingRecord } from '../types/supervisor';

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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[,¥$￥%\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toString(value: unknown, fallback = ''): string {
  return value === undefined || value === null ? fallback : String(value).trim();
}

function parsePeriod(periodValue: unknown, yearValue: unknown, monthValue: unknown) {
  const explicitYear = toNumber(yearValue);
  const explicitMonth = toNumber(monthValue);
  if (explicitYear >= 2000 && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth, period: `${explicitYear}-${String(explicitMonth).padStart(2, '0')}` };
  }

  const raw = toString(periodValue);
  const match = raw.match(/(20\d{2})\s*(?:[-/.年M])\s*(\d{1,2})/i);
  const compact = raw.match(/^(20\d{2})(\d{2})$/);
  const year = Number(match?.[1] ?? compact?.[1] ?? 2024);
  const month = Number(match?.[2] ?? compact?.[2] ?? 1);
  const validMonth = month >= 1 && month <= 12 ? month : 1;
  return { year, month: validMonth, period: `${year}-${String(validMonth).padStart(2, '0')}` };
}

export function parseSupervisorAccountingRows(
  rows: Record<string, unknown>[],
  idPrefix = 'SUP-IMP'
): SupervisorAccountingRecord[] {
  return rows.map((row, index) => {
    const periodRaw = getField(row, ['周期', '年月', '月份', '时间']);
    const { year, month, period } = parsePeriod(
      periodRaw,
      getField(row, ['年', '年份', 'Year']),
      getField(row, ['月', '月份', 'Month'])
    );
    const gmv = toNumber(getField(row, ['销售额', 'GMV', '销售金额', '营收']));
    const quantity = toNumber(getField(row, ['销售数量', '销量', '订单量', 'Units', 'Qty']));
    const unitSalesRaw = getField(row, ['单件销售额', '单件售价', '客单价', 'AOV']);
    const unitCostRaw = getField(row, ['单件成本', '单位成本']);
    const profitRaw = getField(row, ['利润额', '净利润', '毛利润', '利润', 'Profit']);

    return {
      id: `${idPrefix}-${index + 1}`,
      周期: period,
      周期范围: toString(getField(row, ['周期范围', '日期范围']), period),
      年: year,
      月: month,
      平台: toString(getField(row, ['平台', 'Platform']), 'Amazon'),
      市场: toString(getField(row, ['市场', '站点', 'Market', 'Sku-Market']), 'US'),
      SKU: toString(getField(row, ['SKU', '产品SKU', '老SKU'])),
      BU: toString(getField(row, ['BU', '事业部']), '默认BU'),
      产品线: toString(getField(row, ['产品线', '品类', 'ProductLine']), '标准线'),
      OP: toString(getField(row, ['OP', '运营', '负责人']), '未指定OP'),
      PM: toString(getField(row, ['PM', '产品经理']), '未指定PM'),
      销售数量: quantity,
      销售额: gmv,
      广告费: toNumber(getField(row, ['广告费', '广告成本', '推广费', 'Ads'])),
      采购成本: toNumber(getField(row, ['采购成本', '产品成本', '货值', 'COGS'])),
      头程成本: toNumber(getField(row, ['头程成本', '头程', '头程运费'])),
      尾程成本: toNumber(getField(row, ['尾程成本', '尾程', '尾程运费', 'FBA配送费'])),
      总平台费: toNumber(getField(row, ['总平台费', '平台费', '佣金', '平台费用'])),
      人工成本: toNumber(getField(row, ['人工成本', '人工费用', '人力成本'])),
      仓租: toNumber(getField(row, ['仓租', '仓储费', '仓储成本'])),
      售后: toNumber(getField(row, ['售后', '售后费用', '退款损失'])),
      直接调整费: toNumber(getField(row, ['直接调整费', '直接调整'])),
      间接调整费: toNumber(getField(row, ['间接调整费', '间接调整'])),
      利润额: profitRaw !== undefined && profitRaw !== '' ? toNumber(profitRaw) : undefined,
      单件销售额: unitSalesRaw !== undefined && unitSalesRaw !== '' ? toNumber(unitSalesRaw) : quantity > 0 ? gmv / quantity : undefined,
      单件成本: unitCostRaw !== undefined && unitCostRaw !== '' ? toNumber(unitCostRaw) : undefined,
    };
  });
}

export function detectSupervisorTableType(
  rows: Record<string, unknown>[],
  fileName: string
): 'sku' | 'accounting' | 'unknown' {
  const firstRow = rows[0];
  if (!firstRow) return 'unknown';
  const keys = Object.keys(firstRow).map(normalizeKey);
  const hasAny = (candidates: string[]) => candidates.some((candidate) => keys.includes(normalizeKey(candidate)));
  const isAccounting = hasAny(['销售额', 'GMV', '销售金额', '采购成本', '头程成本', '尾程成本', '尾程运费', '销售数量', '广告费']);
  if (isAccounting) return 'accounting';
  const isSku = hasAny(['NewestSKU', 'Newest-SKU', '新SKU', '最新SKU']) && hasAny(['SKU', '老SKU', 'OldSKU']);
  if (isSku) return 'sku';
  const lower = fileName.toLowerCase();
  if (lower.includes('sku') || lower.includes('匹配')) return 'sku';
  if (lower.includes('核算') || lower.includes('财报') || lower.includes('明细')) return 'accounting';
  return 'unknown';
}

export function parseSupervisorSkuRows(rows: Record<string, unknown>[]): SkuMappingRecord[] {
  return parseSkuMappingRows(rows);
}
