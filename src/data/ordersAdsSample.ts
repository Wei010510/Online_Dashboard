import { SkuMappingRecord, TLRecord } from '../types/bi';
import { OrdersAdsDataset, OrdersAdsProductRecord } from '../types/ordersAds';

interface SkuSeed {
  sku: string;
  matchSku?: string;
  newestSku?: string;
  country: string;
  market: string;
  op: string;
  price: number;
  dailyUnits: number;
  adRatio: number;
}

const SEEDS: SkuSeed[] = [
  { sku: 'OLD-AUR-101', newestSku: 'AUR-US-2024A', country: '美国', market: 'US', op: '张浩然', price: 285, dailyUnits: 24, adRatio: 0.118 },
  { sku: 'AUR-US-2024X', matchSku: 'AUR-US-2024', newestSku: 'AUR-US-2024X', country: '美国', market: 'US', op: '王宇航', price: 340, dailyUnits: 16, adRatio: 0.136 },
  { sku: 'OLD-LUM-201', newestSku: 'LUM-UK-2024A', country: '英国', market: 'UK', op: '陈梦洁', price: 410, dailyUnits: 14, adRatio: 0.108 },
  { sku: 'LUM-US-301', newestSku: 'LUM-US-30100', country: '美国', market: 'US', op: '杨子墨', price: 445, dailyUnits: 19, adRatio: 0.124 },
  { sku: 'OLD-KNT-305', newestSku: 'KNT-US-2024C', country: '美国', market: 'US', op: '徐梓轩', price: 230, dailyUnits: 27, adRatio: 0.142 },
  { sku: 'KNT-JP-309', newestSku: 'KNT-JP-30900', country: '日本', market: 'JP', op: '孙雨桐', price: 245, dailyUnits: 16, adRatio: 0.116 },
  { sku: 'OLD-VLT-401', newestSku: 'VLT-JP-2024A', country: '日本', market: 'JP', op: '高嘉诚', price: 380, dailyUnits: 13, adRatio: 0.102 },
  { sku: 'VLT-US-405', newestSku: 'VLT-US-40500', country: '美国', market: 'US', op: '林语嫣', price: 395, dailyUnits: 18, adRatio: 0.12 },
  { sku: 'OLD-ZPH-502', newestSku: 'ZPH-US-2024B', country: '美国', market: 'US', op: '马知行', price: 315, dailyUnits: 21, adRatio: 0.126 },
  { sku: 'ZPH-UK-508', newestSku: 'ZPH-UK-50800', country: '英国', market: 'UK', op: '罗清妍', price: 325, dailyUnits: 13, adRatio: 0.132 },
  { sku: 'NXS-US-601', newestSku: 'NXS-US-60100', country: '美国', market: 'US', op: '刘佳怡', price: 215, dailyUnits: 22, adRatio: 0.119 },
  { sku: 'NXS-DE-602', newestSku: 'NXS-DE-60200', country: '德国', market: 'DE', op: '周俊杰', price: 225, dailyUnits: 14, adRatio: 0.112 },
  { sku: 'OLD-ARO-701', newestSku: 'ARO-US-3001', country: '美国', market: 'US', op: '李昊然', price: 188, dailyUnits: 31, adRatio: 0.127 },
  { sku: 'ARO-CA-702', newestSku: 'ARO-CA-3002', country: '加拿大', market: 'CA', op: '何思颖', price: 176, dailyUnits: 20, adRatio: 0.114 },
  { sku: 'OLD-BRX-801', newestSku: 'BRX-DE-3003', country: '德国', market: 'DE', op: '沈子墨', price: 268, dailyUnits: 17, adRatio: 0.131 },
  { sku: 'BRX-JP-802', newestSku: 'BRX-JP-3004', country: '日本', market: 'JP', op: '苏语桐', price: 299, dailyUnits: 15, adRatio: 0.118 },
  { sku: 'OLD-CYN-901', newestSku: 'CYN-US-3005', country: '美国', market: 'US', op: '叶承泽', price: 159, dailyUnits: 36, adRatio: 0.133 },
  { sku: 'CYN-UK-902', newestSku: 'CYN-UK-3006', country: '英国', market: 'UK', op: '夏安然', price: 172, dailyUnits: 25, adRatio: 0.121 },
  { sku: 'OLD-DRX-1001', newestSku: 'DRX-US-3007', country: '美国', market: 'US', op: '韩沐风', price: 520, dailyUnits: 12, adRatio: 0.109 },
  { sku: 'DRX-AU-1002', newestSku: 'DRX-AU-3008', country: '澳大利亚', market: 'AU', op: '姚若曦', price: 498, dailyUnits: 11, adRatio: 0.104 },
  { sku: 'OLD-ELM-1101', newestSku: 'ELM-US-3009', country: '美国', market: 'US', op: '傅景行', price: 205, dailyUnits: 28, adRatio: 0.125 },
  { sku: 'ELM-DE-1102', newestSku: 'ELM-DE-3010', country: '德国', market: 'DE', op: '姜清欢', price: 218, dailyUnits: 22, adRatio: 0.116 },
  { sku: 'OLD-FLA-1201', newestSku: 'FLA-JP-3011', country: '日本', market: 'JP', op: '韦子衿', price: 336, dailyUnits: 16, adRatio: 0.111 },
  { sku: 'FLA-CA-1202', newestSku: 'FLA-CA-3012', country: '加拿大', market: 'CA', op: '任星阑', price: 322, dailyUnits: 18, adRatio: 0.122 },
  { sku: 'OLD-GLM-1301', newestSku: 'GLM-US-3013', country: '美国', market: 'US', op: '薛念安', price: 462, dailyUnits: 13, adRatio: 0.107 },
  { sku: 'GLM-UK-1302', newestSku: 'GLM-UK-3014', country: '英国', market: 'UK', op: '段云舒', price: 438, dailyUnits: 15, adRatio: 0.119 },
  { sku: 'OLD-HLY-1401', newestSku: 'HLY-US-3015', country: '美国', market: 'US', op: '陆景明', price: 279, dailyUnits: 23, adRatio: 0.128 },
  { sku: 'HLY-AU-1402', newestSku: 'HLY-AU-3016', country: '澳大利亚', market: 'AU', op: '程予安', price: 291, dailyUnits: 21, adRatio: 0.117 },
  { sku: 'OLD-INO-1501', newestSku: 'INO-US-3017', country: '美国', market: 'US', op: '白书瑶', price: 166, dailyUnits: 34, adRatio: 0.134 },
  { sku: 'INO-DE-1502', newestSku: 'INO-DE-3018', country: '德国', market: 'DE', op: '常知夏', price: 174, dailyUnits: 26, adRatio: 0.123 },
];

const EXTRA_SPU_CODES = [
  'JAX', 'KYL', 'LYR', 'MNO', 'NRT', 'ORV', 'PQL', 'QRV', 'RST', 'SUV',
  'TUV', 'UVW', 'VWX', 'WXY', 'XYZ', 'YZA', 'ZAB', 'ABC', 'BCD', 'CDE',
  'DEF', 'EFG', 'FGH', 'GHI', 'HIJ', 'IJK', 'JKL', 'KLM', 'LMN', 'NOP',
];
const EXTRA_MARKETS = ['US', 'UK', 'JP', 'DE', 'CA', 'AU'];
const EXTRA_COUNTRIES: Record<string, string> = { US: '美国', UK: '英国', JP: '日本', DE: '德国', CA: '加拿大', AU: '澳大利亚' };
const EXTRA_OPS = [
  '苏景行', '林知意', '顾南洲', '沈听澜', '宋时予', '陆延之', '江予安', '程司辰', '谢明烛', '温景澄',
  '卫昭', '蒋砚', '沈砚之', '楚临风', '霍衍', '裴行简', '燕怀瑾', '萧景行', '季衍之', '晏清',
  '秦墨', '墨白', '钟离', '欧阳澈', '上官瑾', '东方彧', '皇甫澈', '夏侯瑾', '诸葛衍', '闻人澈',
];
const EXTRA_TLS = ['顾明轩', '宋致远', '苏婉晴', '周子昂', '林晓曼', '陈志远'];

const TL_RECORDS: TLRecord[] = [
  { OP: '张浩然', TL: '陈志远' }, { OP: '王宇航', TL: '陈志远' }, { OP: '刘佳怡', TL: '陈志远' },
  { OP: '李昊然', TL: '陈志远' }, { OP: '叶承泽', TL: '陈志远' },
  { OP: '陈梦洁', TL: '林晓曼' }, { OP: '杨子墨', TL: '林晓曼' }, { OP: '周俊杰', TL: '林晓曼' },
  { OP: '何思颖', TL: '林晓曼' }, { OP: '夏安然', TL: '林晓曼' },
  { OP: '徐梓轩', TL: '周子昂' }, { OP: '孙雨桐', TL: '周子昂' }, { OP: '沈子墨', TL: '周子昂' },
  { OP: '苏语桐', TL: '周子昂' }, { OP: '韦子衿', TL: '周子昂' },
  { OP: '高嘉诚', TL: '苏婉晴' }, { OP: '林语嫣', TL: '苏婉晴' }, { OP: '韩沐风', TL: '苏婉晴' },
  { OP: '姚若曦', TL: '苏婉晴' }, { OP: '薛念安', TL: '苏婉晴' },
  { OP: '马知行', TL: '顾明轩' }, { OP: '罗清妍', TL: '顾明轩' }, { OP: '傅景行', TL: '顾明轩' },
  { OP: '姜清欢', TL: '顾明轩' }, { OP: '任星阑', TL: '顾明轩' },
  { OP: '段云舒', TL: '宋致远' }, { OP: '陆景明', TL: '宋致远' }, { OP: '程予安', TL: '宋致远' },
  { OP: '白书瑶', TL: '宋致远' }, { OP: '常知夏', TL: '宋致远' },
];

for (let i = 0; i < EXTRA_SPU_CODES.length; i++) {
  const code = EXTRA_SPU_CODES[i];
  const market = EXTRA_MARKETS[i % EXTRA_MARKETS.length];
  const op = EXTRA_OPS[i];
  SEEDS.push({
    sku: `${code}-${market}-${String(5000 + i * 3).slice(0, 4)}`,
    newestSku: `${code}-${market}-${5000 + i * 3}`,
    country: EXTRA_COUNTRIES[market],
    market,
    op,
    price: 120 + ((i * 37) % 380),
    dailyUnits: 6 + ((i * 13) % 38),
    adRatio: 0.095 + ((i * 7) % 50) / 1000,
  });
  TL_RECORDS.push({ OP: op, TL: EXTRA_TLS[i % EXTRA_TLS.length] });
}

const SKU_MAPPINGS: SkuMappingRecord[] = SEEDS.filter((seed) => seed.newestSku).map((seed) => ({
  Country: seed.country,
  SkuMarket: seed.market,
  SKU: seed.matchSku ?? seed.sku,
  NewestSKU: seed.newestSku!,
}));

const MONTH_SEASONALITY = [0.86, 0.82, 0.94, 0.97, 1.02, 1.05, 1.18, 1.04, 1.09, 1.15, 1.38, 1.31];
const TOTAL_DAYS = 120;

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildProductRecords(): OrdersAdsProductRecord[] {
  const records: OrdersAdsProductRecord[] = [];

  for (let dayIndex = 0; dayIndex < TOTAL_DAYS; dayIndex++) {
    const date = new Date(Date.UTC(2025, 5, 1 + dayIndex));
    const dateText = formatDate(date);
    const dayRecords: OrdersAdsProductRecord[] = [];
    let daySessions = 0;
    let dayPv = 0;

    const finalWeekFactors: Record<number, { qty: number; orders: number; price: number }> = {
      0: { qty: 1.52, orders: 1.34, price: 1.16 },
      1: { qty: 1.28, orders: 0.84, price: 1.12 },
      2: { qty: 1.14, orders: 1.18, price: 0.9 },
      3: { qty: 0.74, orders: 1.21, price: 1.14 },
      4: { qty: 0.68, orders: 0.86, price: 1.08 },
      5: { qty: 0.58, orders: 1.16, price: 0.92 },
    };

    SEEDS.forEach((seed, seedIndex) => {
      const wave = 1 + 0.18 * Math.sin(dayIndex * 0.29 + seedIndex * 0.83) + 0.07 * Math.cos(dayIndex * 0.09 + seedIndex);
      const isFinalWeek = dayIndex >= TOTAL_DAYS - 7;
      const finalFactor = isFinalWeek ? finalWeekFactors[seedIndex % 6] : { qty: 1, orders: 1, price: 1 };
      const quantity = Math.max(1, Math.round(seed.dailyUnits * MONTH_SEASONALITY[date.getUTCMonth()] * wave * finalFactor.qty));
      const price = seed.price * (1 + 0.025 * Math.sin(dayIndex * 0.07 + seedIndex)) * finalFactor.price;
      const gmv = Math.round(quantity * price);
      const orders = Math.max(1, Math.round(quantity * (0.82 + 0.06 * Math.sin(seedIndex + dayIndex * 0.05)) * finalFactor.orders));
      const sessions = Math.max(1, Math.round(quantity * (11 + seedIndex % 5) * (1 + 0.08 * Math.cos(dayIndex * 0.17 + seedIndex))));
      const pv = Math.round(sessions * (1.45 + 0.08 * (seedIndex % 4)));
      const impressions = Math.round(sessions * (22 + seedIndex % 4) * (1 + 0.1 * Math.sin(dayIndex * 0.13 + seedIndex)));
      const clicks = Math.max(1, Math.round(impressions * (0.035 + 0.005 * (seedIndex % 4))));
      const isAmazonSku = seed.sku.startsWith('OLD-');
      const msku = isAmazonSku
        ? `${seedIndex % 2 === 0 ? 'amzn.us.' : 'AMZN.US.'}${seed.sku}`
        : seed.sku;

      const record: OrdersAdsProductRecord = {
        id: `OA-${dateText.replace(/-/g, '')}-${String(seedIndex + 1).padStart(3, '0')}`,
        日期: dateText,
        父ASIN: `B0P${String(Math.floor(seedIndex / 2) + 1).padStart(7, '0')}`,
        ASIN: `B0A${String(seedIndex + 1).padStart(7, '0')}`,
        MSKU: msku,
        SKU: isAmazonSku ? seed.sku : msku.slice(0, 11),
        国家: seed.market,
        SessionsTotal: sessions,
        SessionsPercentage: 0,
        PVTotal: pv,
        PVPercentage: 0,
        UnitSessionsPercentage: Number((quantity / sessions * 100).toFixed(4)),
        销量: quantity,
        订单量: orders,
        销售额: gmv,
        净销售额: Math.round(gmv * (0.93 + 0.015 * Math.cos(dayIndex * 0.11 + seedIndex))),
        大类排名: 80 + seedIndex * 23 + Math.round(8 * Math.sin(dayIndex * 0.19 + seedIndex)),
        小类排名: 8 + seedIndex * 3 + Math.round(3 * Math.cos(dayIndex * 0.16 + seedIndex)),
        评分: Number((4.15 + (seedIndex % 6) * 0.1 + 0.03 * Math.sin(dayIndex * 0.03 + seedIndex)).toFixed(2)),
        评论数: 180 + seedIndex * 57 + Math.floor(dayIndex / 7) * (1 + seedIndex % 3),
        展示: impressions,
        点击: clicks,
        广告花费: -Math.max(1, Math.round(gmv * (seed.adRatio + 0.008 * Math.sin(dayIndex * 0.21 + seedIndex)))),
        广告销售额: Math.round(gmv * (0.31 + 0.02 * (seedIndex % 4))),
        广告订单量: Math.max(1, Math.round(orders * (0.34 + 0.04 * (seedIndex % 3)))),
        OP: seed.op,
      };

      daySessions += sessions;
      dayPv += pv;
      dayRecords.push(record);
      records.push(record);
    });

    for (const record of dayRecords) {
      record.SessionsPercentage = Number((record.SessionsTotal / daySessions * 100).toFixed(4));
      record.PVPercentage = Number((record.PVTotal / dayPv * 100).toFixed(4));
    }
  }

  return records;
}

export const ORDERS_ADS_SAMPLE_DATASET: OrdersAdsDataset = {
  boardId: 'orders_ads',
  productRecords: buildProductRecords(),
  tlRecords: TL_RECORDS,
  skuMappings: SKU_MAPPINGS,
  sourceLabel: '内置订单广告模拟数据集（2025-06-01 至 2025-09-28）',
  fileNames: ['内置产品表现表', '内置新老SKU匹配表', '内置TL表'],
  updatedAt: '2025-09-28T12:00:00.000Z',
  isCustom: false,
};
