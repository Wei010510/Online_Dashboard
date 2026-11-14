import { SkuMappingRecord } from '../types/bi';
import { SupervisorAccountingRecord, SupervisorDataset } from '../types/supervisor';

interface SupervisorSkuSeed {
  sku: string;
  newestSku?: string;
  country: string;
  market: string;
  platform: string;
  line: string;
  op: string;
  pm: string;
  price: number;
  units: number;
  purchaseRatio: number;
  adRatio: number;
}

const SEEDS: SupervisorSkuSeed[] = [
  { sku: 'OLD-AUR-01', newestSku: 'AUR-US-101', country: '美国', market: 'US', platform: 'Amazon', line: '智能照明', op: '顾清扬', pm: '沈产品', price: 298, units: 520, purchaseRatio: 0.25, adRatio: 0.105 },
  { sku: 'AUR-DE-102', country: '德国', market: 'DE', platform: 'Amazon', line: '智能照明', op: '苏念', pm: '沈产品', price: 276, units: 390, purchaseRatio: 0.27, adRatio: 0.118 },
  { sku: 'OLD-LUM-01', newestSku: 'LUM-UK-201', country: '英国', market: 'UK', platform: 'Amazon', line: '桌面音频', op: '林拓', pm: '叶产品', price: 428, units: 350, purchaseRatio: 0.29, adRatio: 0.098 },
  { sku: 'LUM-US-202', country: '美国', market: 'US', platform: 'Shopify', line: '桌面音频', op: '周琪', pm: '叶产品', price: 458, units: 310, purchaseRatio: 0.28, adRatio: 0.132 },
  { sku: 'OLD-KNT-01', newestSku: 'KNT-US-301', country: '美国', market: 'US', platform: 'TikTok Shop', line: '个人护理', op: '陈星', pm: '韩产品', price: 238, units: 640, purchaseRatio: 0.235, adRatio: 0.142 },
  { sku: 'KNT-JP-302', country: '日本', market: 'JP', platform: 'Amazon', line: '个人护理', op: '江月', pm: '韩产品', price: 256, units: 420, purchaseRatio: 0.245, adRatio: 0.112 },
  { sku: 'OLD-VLT-01', newestSku: 'VLT-JP-401', country: '日本', market: 'JP', platform: 'Amazon', line: '运动出行', op: '许川', pm: '唐产品', price: 398, units: 290, purchaseRatio: 0.30, adRatio: 0.096 },
  { sku: 'VLT-US-402', country: '美国', market: 'US', platform: 'Amazon', line: '运动出行', op: '郑好', pm: '唐产品', price: 418, units: 380, purchaseRatio: 0.285, adRatio: 0.115 },
  { sku: 'OLD-ZPH-01', newestSku: 'ZPH-US-501', country: '美国', market: 'US', platform: 'Amazon', line: '健康穿戴', op: '唐宁', pm: '秦产品', price: 328, units: 470, purchaseRatio: 0.255, adRatio: 0.121 },
  { sku: 'ZPH-UK-502', country: '英国', market: 'UK', platform: 'Shopify', line: '健康穿戴', op: '罗成', pm: '秦产品', price: 348, units: 280, purchaseRatio: 0.265, adRatio: 0.137 },
  { sku: 'OLD-NXS-01', newestSku: 'NXS-US-601', country: '美国', market: 'US', platform: 'Amazon', line: '环境传感', op: '韩笑', pm: '沈产品', price: 218, units: 510, purchaseRatio: 0.24, adRatio: 0.116 },
  { sku: 'NXS-DE-602', country: '德国', market: 'DE', platform: 'Amazon', line: '环境传感', op: '白露', pm: '沈产品', price: 228, units: 360, purchaseRatio: 0.25, adRatio: 0.108 },
  { sku: 'OLD-AUR-03', newestSku: 'AUR-JP-103', country: '日本', market: 'JP', platform: 'Amazon', line: '智能照明', op: '顾清扬', pm: '沈产品', price: 286, units: 260, purchaseRatio: 0.26, adRatio: 0.111 },
  { sku: 'OLD-LUM-03', newestSku: 'LUM-DE-203', country: '德国', market: 'DE', platform: 'Amazon', line: '便携储能', op: '林拓', pm: '叶产品', price: 538, units: 220, purchaseRatio: 0.31, adRatio: 0.092 },
  { sku: 'KNT-UK-303', country: '英国', market: 'UK', platform: 'TikTok Shop', line: '个人护理', op: '陈星', pm: '韩产品', price: 268, units: 330, purchaseRatio: 0.24, adRatio: 0.148 },
  { sku: 'VLT-DE-403', country: '德国', market: 'DE', platform: 'Shopify', line: '运动出行', op: '许川', pm: '唐产品', price: 448, units: 210, purchaseRatio: 0.295, adRatio: 0.126 },
];

const MONTH_SEASONALITY = [0.82, 0.76, 0.94, 0.98, 1.03, 1.08, 1.20, 1.04, 1.10, 1.17, 1.46, 1.36];

function seededNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 31.4159) * 43758.5453;
  return value - Math.floor(value);
}

function buildSkuMappings(): SkuMappingRecord[] {
  return SEEDS.filter((seed) => seed.newestSku).map((seed) => ({
    Country: seed.country,
    SkuMarket: seed.market,
    SKU: seed.sku,
    NewestSKU: seed.newestSku!,
  }));
}

function buildAccountingDetails(): SupervisorAccountingRecord[] {
  const rows: SupervisorAccountingRecord[] = [];
  let index = 1;

  for (const year of [2024, 2025]) {
    for (let month = 1; month <= 12; month++) {
      const monthText = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();

      SEEDS.forEach((seed, seedIndex) => {
        const noise = 0.90 + seededNoise(year * 1000 + month * 41 + seedIndex * 17) * 0.22;
        const yearGrowth = year === 2025 ? 1.18 + seedIndex * 0.002 : 1;
        const quantity = Math.max(1, Math.round(seed.units * MONTH_SEASONALITY[month - 1] * yearGrowth * noise));
        const unitPrice = seed.price * (0.97 + seededNoise(year * 97 + month * 23 + seedIndex) * 0.07);
        const gmv = Math.round(quantity * unitPrice);
        const adPeak = month === 7 || month === 11 ? 1.13 : month === 2 ? 0.93 : 1;
        const purchaseCost = Math.round(gmv * seed.purchaseRatio * (year === 2025 ? 0.97 : 1));
        const adCost = Math.round(gmv * seed.adRatio * adPeak);
        const firstLegCost = Math.round(gmv * (0.041 + seededNoise(seedIndex * 29 + month) * 0.012));
        const lastLegCost = Math.round(gmv * (0.082 + seededNoise(seedIndex * 13 + year) * 0.016));
        const platformFee = Math.round(gmv * (seed.platform === 'Amazon' ? 0.142 : seed.platform === 'Shopify' ? 0.072 : 0.098));
        const laborCost = Math.round(gmv * (year === 2025 ? 0.032 : 0.035));
        const warehouseRent = Math.round(gmv * (month >= 11 ? 0.027 : 0.019));
        const afterSales = Math.round(gmv * (0.013 + seededNoise(month * 31 + seedIndex * 7) * 0.009));
        const directAdjustment = Math.round(gmv * (0.003 + seededNoise(year + seedIndex * 11) * 0.003));
        const indirectAdjustment = Math.round(gmv * 0.0032);
        const totalCost = purchaseCost + adCost + firstLegCost + lastLegCost + platformFee + laborCost + warehouseRent + afterSales + directAdjustment + indirectAdjustment;

        rows.push({
          id: `SUP-${year}${monthText}-${String(index++).padStart(4, '0')}`,
          周期: `${year}-${monthText}`,
          周期范围: `${year}-${monthText}-01 ~ ${year}-${monthText}-${lastDay}`,
          年: year,
          月: month,
          平台: seed.platform,
          市场: seed.market,
          SKU: seed.sku,
          BU: `${seed.line}BU`,
          产品线: seed.line,
          OP: seed.op,
          PM: seed.pm,
          销售数量: quantity,
          销售额: gmv,
          广告费: adCost,
          采购成本: purchaseCost,
          头程成本: firstLegCost,
          尾程成本: lastLegCost,
          总平台费: platformFee,
          人工成本: laborCost,
          仓租: warehouseRent,
          售后: afterSales,
          直接调整费: directAdjustment,
          间接调整费: indirectAdjustment,
          利润额: gmv - totalCost,
          单件销售额: Number((gmv / quantity).toFixed(2)),
          单件成本: Number((totalCost / quantity).toFixed(2)),
        });
      });
    }
  }

  return rows;
}

export const SUPERVISOR_SAMPLE_DATASET: SupervisorDataset = {
  boardId: 'supervisor',
  skuMappings: buildSkuMappings(),
  accountingDetails: buildAccountingDetails(),
  sourceLabel: '主管独立模拟财报数据集（2024–2025 全年）',
  fileNames: ['内置主管模拟财报', '内置新老SKU匹配表'],
  updatedAt: '2025-12-31',
  isCustom: false,
};
