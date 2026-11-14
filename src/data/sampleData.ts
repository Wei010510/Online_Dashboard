import { AccountingDetailRecord, DatasetBundle, SkuMappingRecord, TLRecord } from '../types/bi';

const TL_TABLE: TLRecord[] = [
  { OP: '张浩然', TL: '陈志远' },
  { OP: '李思琪', TL: '陈志远' },
  { OP: '王宇航', TL: '陈志远' },
  { OP: '刘佳怡', TL: '陈志远' },
  { OP: '赵泽宇', TL: '陈志远' },
  { OP: '陈梦洁', TL: '林晓曼' },
  { OP: '杨子墨', TL: '林晓曼' },
  { OP: '黄诗涵', TL: '林晓曼' },
  { OP: '周俊杰', TL: '林晓曼' },
  { OP: '吴若曦', TL: '林晓曼' },
  { OP: '徐梓轩', TL: '周子昂' },
  { OP: '孙雨桐', TL: '周子昂' },
  { OP: '胡明哲', TL: '周子昂' },
  { OP: '朱可馨', TL: '周子昂' },
  { OP: '高嘉诚', TL: '苏婉晴' },
  { OP: '林语嫣', TL: '苏婉晴' },
  { OP: '何一鸣', TL: '苏婉晴' },
  { OP: '郭思远', TL: '苏婉晴' },
  { OP: '马知行', TL: '顾明轩' },
  { OP: '罗清妍', TL: '顾明轩' },
  { OP: '梁宇轩', TL: '顾明轩' },
  { OP: '宋嘉敏', TL: '顾明轩' },
];

const SKU_MAPPINGS: SkuMappingRecord[] = [
  { Country: '美国', SkuMarket: 'US', SKU: 'OLD-AUR-101', NewestSKU: 'AUR-US-2024A' },
  { Country: '德国', SkuMarket: 'DE', SKU: 'OLD-AUR-102', NewestSKU: 'AUR-DE-2024B' },
  { Country: '英国', SkuMarket: 'UK', SKU: 'OLD-LUM-201', NewestSKU: 'LUM-UK-2024A' },
  { Country: '美国', SkuMarket: 'US', SKU: 'OLD-KNT-305', NewestSKU: 'KNT-US-2024C' },
  { Country: '日本', SkuMarket: 'JP', SKU: 'OLD-VLT-401', NewestSKU: 'VLT-JP-2024A' },
  { Country: '美国', SkuMarket: 'US', SKU: 'OLD-ZPH-502', NewestSKU: 'ZPH-US-2024B' },
];

interface SkuSeed {
  sku: string;
  market: string;
  platform: string;
  bu: string;
  line: string;
  op: string;
  pm: string;
  basePrice: number;
  baseMonthlyUnits: number;
  cogsRatio: number;
  adRatio: number;
}

const SKU_SEEDS: SkuSeed[] = [
  { sku: 'OLD-AUR-101', market: 'US', platform: 'Amazon', bu: '智能家居BU', line: '氛围照明线', op: '张浩然', pm: '沈文博', basePrice: 285, baseMonthlyUnits: 620, cogsRatio: 0.27, adRatio: 0.135 },
  { sku: 'OLD-AUR-102', market: 'DE', platform: 'Amazon', bu: '智能家居BU', line: '氛围照明线', op: '李思琪', pm: '沈文博', basePrice: 260, baseMonthlyUnits: 410, cogsRatio: 0.28, adRatio: 0.125 },
  { sku: 'AUR-US-2024X', market: 'US', platform: 'Shopify', bu: '智能家居BU', line: '户外庭院线', op: '王宇航', pm: '沈文博', basePrice: 340, baseMonthlyUnits: 380, cogsRatio: 0.26, adRatio: 0.155 },
  { sku: 'OLD-LUM-201', market: 'UK', platform: 'Amazon', bu: '消费电子BU', line: '桌面音频线', op: '陈梦洁', pm: '叶青松', basePrice: 410, baseMonthlyUnits: 350, cogsRatio: 0.30, adRatio: 0.120 },
  { sku: 'LUM-US-301', market: 'US', platform: 'Amazon', bu: '消费电子BU', line: '桌面音频线', op: '杨子墨', pm: '叶青松', basePrice: 445, baseMonthlyUnits: 490, cogsRatio: 0.29, adRatio: 0.140 },
  { sku: 'LUM-DE-302', market: 'DE', platform: 'Amazon', bu: '消费电子BU', line: '便携储能线', op: '黄诗涵', pm: '叶青松', basePrice: 520, baseMonthlyUnits: 240, cogsRatio: 0.32, adRatio: 0.115 },
  { sku: 'OLD-KNT-305', market: 'US', platform: 'TikTok Shop', bu: '个人护理BU', line: '高速吹护线', op: '徐梓轩', pm: '韩慕白', basePrice: 230, baseMonthlyUnits: 710, cogsRatio: 0.24, adRatio: 0.165 },
  { sku: 'KNT-JP-309', market: 'JP', platform: 'Amazon', bu: '个人护理BU', line: '高速吹护线', op: '孙雨桐', pm: '韩慕白', basePrice: 245, baseMonthlyUnits: 360, cogsRatio: 0.25, adRatio: 0.128 },
  { sku: 'OLD-VLT-401', market: 'JP', platform: 'Amazon', bu: '运动出行BU', line: '智能骑行线', op: '高嘉诚', pm: '唐思聪', basePrice: 380, baseMonthlyUnits: 295, cogsRatio: 0.31, adRatio: 0.110 },
  { sku: 'VLT-US-405', market: 'US', platform: 'Amazon', bu: '运动出行BU', line: '智能骑行线', op: '林语嫣', pm: '唐思聪', basePrice: 395, baseMonthlyUnits: 430, cogsRatio: 0.29, adRatio: 0.132 },
  { sku: 'OLD-ZPH-502', market: 'US', platform: 'Amazon', bu: '健康穿戴BU', line: '光学监测线', op: '马知行', pm: '秦若水', basePrice: 315, baseMonthlyUnits: 510, cogsRatio: 0.26, adRatio: 0.138 },
  { sku: 'ZPH-UK-508', market: 'UK', platform: 'Shopify', bu: '健康穿戴BU', line: '光学监测线', op: '罗清妍', pm: '秦若水', basePrice: 325, baseMonthlyUnits: 270, cogsRatio: 0.27, adRatio: 0.145 },
  { sku: 'NXS-US-601', market: 'US', platform: 'Amazon', bu: '智能家居BU', line: '环境传感线', op: '刘佳怡', pm: '沈文博', basePrice: 215, baseMonthlyUnits: 480, cogsRatio: 0.25, adRatio: 0.130 },
  { sku: 'NXS-DE-602', market: 'DE', platform: 'Amazon', bu: '智能家居BU', line: '环境传感线', op: '周俊杰', pm: '叶青松', basePrice: 225, baseMonthlyUnits: 310, cogsRatio: 0.26, adRatio: 0.122 },
];

// Additional OPs rotating into later years to reflect realistic team scaling (COUNTD(OP))
const EXPANSION_SEEDS: SkuSeed[] = [
  { sku: 'AUR-JP-2025A', market: 'JP', platform: 'Amazon', bu: '智能家居BU', line: '氛围照明线', op: '赵泽宇', pm: '沈文博', basePrice: 290, baseMonthlyUnits: 260, cogsRatio: 0.26, adRatio: 0.125 },
  { sku: 'LUM-UK-310', market: 'UK', platform: 'TikTok Shop', bu: '消费电子BU', line: '桌面音频线', op: '吴若曦', pm: '叶青松', basePrice: 360, baseMonthlyUnits: 290, cogsRatio: 0.28, adRatio: 0.148 },
  { sku: 'KNT-US-318', market: 'US', platform: 'Amazon', bu: '个人护理BU', line: '美姿造型线', op: '胡明哲', pm: '韩慕白', basePrice: 265, baseMonthlyUnits: 420, cogsRatio: 0.24, adRatio: 0.150 },
  { sku: 'KNT-DE-320', market: 'DE', platform: 'Amazon', bu: '个人护理BU', line: '美姿造型线', op: '朱可馨', pm: '韩慕白', basePrice: 275, baseMonthlyUnits: 240, cogsRatio: 0.25, adRatio: 0.135 },
  { sku: 'VLT-UK-412', market: 'UK', platform: 'Amazon', bu: '运动出行BU', line: '户外便携线', op: '何一鸣', pm: '唐思聪', basePrice: 410, baseMonthlyUnits: 215, cogsRatio: 0.29, adRatio: 0.120 },
  { sku: 'VLT-DE-415', market: 'DE', platform: 'Shopify', bu: '运动出行BU', line: '户外便携线', op: '郭思远', pm: '唐思聪', basePrice: 430, baseMonthlyUnits: 195, cogsRatio: 0.30, adRatio: 0.140 },
  { sku: 'ZPH-JP-515', market: 'JP', platform: 'Amazon', bu: '健康穿戴BU', line: '睡眠监测线', op: '梁宇轩', pm: '秦若水', basePrice: 345, baseMonthlyUnits: 280, cogsRatio: 0.25, adRatio: 0.122 },
  { sku: 'NXS-US-618', market: 'US', platform: 'TikTok Shop', bu: '智能家居BU', line: '环境传感线', op: '宋嘉敏', pm: '沈文博', basePrice: 205, baseMonthlyUnits: 390, cogsRatio: 0.24, adRatio: 0.158 },
];

// Deterministic pseudo-random generator so sample metrics stay stable across reloads
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Seasonality weights (Jan–Dec) reflecting cross-border e-commerce peaks (Jul Prime Day, Nov BFCM, Dec Holiday)
const MONTH_SEASONALITY = [
  0.84, // 1月
  0.76, // 2月
  0.93, // 3月
  0.96, // 4月
  1.02, // 5月
  1.08, // 6月
  1.21, // 7月 Prime Day
  1.05, // 8月
  1.09, // 9月
  1.16, // 10月
  1.48, // 11月 BFCM
  1.38, // 12月 Holiday
];

const YEAR_GROWTH: Record<number, number> = {
  2021: 0.72,
  2023: 1.00,
  2024: 1.24,
  2025: 1.42,
};

function generateAccountingDetails(): AccountingDetailRecord[] {
  const rows: AccountingDetailRecord[] = [];
  const yearConfigs: { year: number; maxMonth: number }[] = [
    { year: 2021, maxMonth: 12 },
    { year: 2023, maxMonth: 12 },
    { year: 2024, maxMonth: 12 },
    { year: 2025, maxMonth: 9 }, // 2025年1-9月
  ];

  let idx = 1;
  for (const { year, maxMonth } of yearConfigs) {
    const activeSeeds =
      year === 2021
        ? SKU_SEEDS.slice(0, 11)
        : year === 2023
        ? [...SKU_SEEDS, ...EXPANSION_SEEDS.slice(0, 4)]
        : [...SKU_SEEDS, ...EXPANSION_SEEDS];

    const growth = YEAR_GROWTH[year] ?? 1;

    for (let month = 1; month <= maxMonth; month++) {
      const season = MONTH_SEASONALITY[month - 1];
      const monthStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();

      for (let sIdx = 0; sIdx < activeSeeds.length; sIdx++) {
        const seed = activeSeeds[sIdx];
        const noise = 0.91 + seededNoise(year * 1000 + month * 37 + sIdx * 13) * 0.20;
        const priceNoise = 0.96 + seededNoise(year * 500 + month * 19 + sIdx * 7) * 0.08;

        const units = Math.round(seed.baseMonthlyUnits * growth * season * noise);
        const price = seed.basePrice * priceNoise;
        const gmv = Math.round(units * price);

        // Peak ad months (Jul, Nov) have slightly higher ad ratio
        const adPeakFactor = month === 7 || month === 11 ? 1.14 : month === 2 ? 0.92 : 1.0;
        // Operational efficiency improves slightly in 2024-2025
        const yearMarginBoost = year === 2025 ? 0.94 : year === 2024 ? 0.96 : year === 2021 ? 1.04 : 1.0;

        const purchaseCost = Math.round(gmv * seed.cogsRatio * yearMarginBoost);
        const adCost = Math.round(gmv * seed.adRatio * adPeakFactor);
        const firstLeg = Math.round(gmv * (0.048 + seededNoise(sIdx + month) * 0.012));
        const lastLeg = Math.round(gmv * (0.095 + seededNoise(sIdx * 3 + year) * 0.018));
        const platformFee = Math.round(gmv * (seed.platform === 'Amazon' ? 0.148 : 0.068));
        const laborCost = Math.round(gmv * (0.036 / (year >= 2024 ? 1.08 : 1.0)));
        const warehouseRent = Math.round(gmv * (month === 11 || month === 12 ? 0.029 : 0.021));
        const afterSales = Math.round(gmv * (0.016 + seededNoise(month * sIdx) * 0.008));
        const directAdj = Math.round(gmv * (0.004 + seededNoise(year + sIdx) * 0.004));
        const indirectAdj = Math.round(gmv * 0.0035);

        rows.push({
          id: `ACC-${year}${monthStr}-${String(idx++).padStart(4, '0')}`,
          周期: `${year}-${monthStr}`,
          周期范围: `${year}-${monthStr}-01 ~ ${year}-${monthStr}-${lastDay}`,
          年: year,
          月: month,
          平台: seed.platform,
          市场: seed.market,
          SKU: seed.sku,
          BU: seed.bu,
          产品线: seed.line,
          OP: seed.op,
          PM: seed.pm,
          销售数量: units,
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
        });
      }
    }
  }

  return rows;
}

export const SAMPLE_DATASET: DatasetBundle = {
  tlRecords: TL_TABLE,
  skuMappings: SKU_MAPPINGS,
  accountingDetails: generateAccountingDetails(),
  sourceLabel: '内置模拟财务数据集 (2021、2023、2024全年 & 2025年1–9月)',
  updatedAt: '2025-09-30',
};
