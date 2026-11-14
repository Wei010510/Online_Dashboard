import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Filter,
  RotateCcw,
} from 'lucide-react';
import {
  DrilldownFilters,
  EnrichedRecord,
  MacroFilters,
} from '../types/bi';
import {
  computeCostAndAovTrends,
  computeCrossTabMatrix,
  computeExpenseRatioTable,
  computeMarketMultiAxisMetrics,
  computeMonthlyMonitor,
  computeParetoSeries,
  computeSkuMarketGmvTable,
  computeSPUSalesTableRows,
  computeSummaryMetrics,
  computeTLMonthlySalesRows,
  computeTLPerformanceMetrics,
  computeTLShares,
  computeYoYSeries,
  filterDrilldownRecords,
  filterMacroRecords,
  formatCurrency,
  formatNumber,
  formatPct,
} from '../utils/biEngine';
import {
  DonutChartCard,
  GmvProfitContrastChart,
  MoMGrowthChart,
  ParetoEfficiencyChart,
  YoYLineChart,
} from './charts/InteractiveCharts';
import {
  DualComboTrendChart,
  MarketMultiAxisChart,
  TLMultiAxisChart,
} from './DrilldownCharts';

interface DirectorDashboardProps {
  allRecords: EnrichedRecord[];
  joinStats: { totalRows: number; skuMappedCount: number; tlMatchedCount: number };
}

const MoMCell: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) {
    return <span className="text-slate-400 dark:text-slate-600">—</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center justify-end gap-0.5 font-mono text-xs tabular-nums font-medium ${
        positive
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-rose-600 dark:text-rose-400'
      }`}
    >
      <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
      <span>{formatPct(value, true)}</span>
    </span>
  );
};

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({
  allRecords,
  joinStats,
}) => {
  const macroRef = useRef<HTMLElement>(null);
  const drilldownRef = useRef<HTMLElement>(null);

  const availableYears = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.年))).sort((a, b) => a - b),
    [allRecords]
  );
  const availableMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const availableMarkets = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.市场))).sort(),
    [allRecords]
  );
  const availableTLs = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.TL))).sort(),
    [allRecords]
  );
  const availableSPUs = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.SPU))).sort(),
    [allRecords]
  );

  // Macro Dashboard Filters (年, 月)
  const [macroFilters, setMacroFilters] = useState<MacroFilters>({
    years: [],
    months: [],
  });

  // Drilldown Dashboard Filters (年, 月, 市场, TL, SPU)
  const [drillFilters, setDrillFilters] = useState<DrilldownFilters>({
    years: [],
    months: [],
    markets: [],
    tls: [],
    spus: [],
  });

  // Macro Dashboard Cross-Filter Links (clicking TL donut, YM bar/row, etc.)
  const [selectedMacroTL, setSelectedMacroTL] = useState<string | null>(null);
  const [selectedMacroYM, setSelectedMacroYM] = useState<string | null>(null);

  // Drilldown Dashboard Cross-Filter Links (clicking charts/tables inside Drilldown)
  const [selectedDrillYM, setSelectedDrillYM] = useState<string | null>(null);
  const [selectedSkuMarket, setSelectedSkuMarket] = useState<string | null>(null);

  // Table sort & cross-tab metric view
  const [monitorSortDesc, setMonitorSortDesc] = useState(true);
  const [crossTabFilter, setCrossTabFilter] = useState<'ALL' | 'GMV' | '利润额' | '销售数量'>('ALL');

  const toggleMacroYear = (y: number) => {
    setSelectedMacroYM(null);
    setMacroFilters((prev) => ({
      ...prev,
      years: prev.years.includes(y) ? prev.years.filter((x) => x !== y) : [...prev.years, y],
    }));
  };

  const toggleMacroMonth = (m: number) => {
    setSelectedMacroYM(null);
    setMacroFilters((prev) => ({
      ...prev,
      months: prev.months.includes(m) ? prev.months.filter((x) => x !== m) : [...prev.months, m],
    }));
  };

  const toggleMacroTL = (tl: string) => {
    setSelectedMacroTL((prev) => (prev === tl ? null : tl));
  };

  const toggleMacroYM = (ym: string) => {
    setSelectedMacroYM((prev) => (prev === ym ? null : ym));
  };

  // Base Macro records from Year/Month filters
  const macroBaseRecords = useMemo(
    () => filterMacroRecords(allRecords, macroFilters),
    [allRecords, macroFilters]
  );

  // Records filtered by TL link (for time-series & tables so all months stay visible under selected TL)
  const macroTLFilteredRecords = useMemo(
    () =>
      selectedMacroTL
        ? macroBaseRecords.filter((r) => r.TL === selectedMacroTL)
        : macroBaseRecords,
    [macroBaseRecords, selectedMacroTL]
  );

  // Records filtered by YM link (for TL Donuts so all TLs stay visible under selected month)
  const macroYMFilteredRecords = useMemo(
    () =>
      selectedMacroYM
        ? macroBaseRecords.filter((r) => r.年月 === selectedMacroYM)
        : macroBaseRecords,
    [macroBaseRecords, selectedMacroYM]
  );

  // Full cross-filtered Macro records (both TL + YM links) for KPIs & Cost Structure
  const macroRecords = useMemo(
    () =>
      macroTLFilteredRecords.filter((r) =>
        selectedMacroYM ? r.年月 === selectedMacroYM : true
      ),
    [macroTLFilteredRecords, selectedMacroYM]
  );

  const summary = useMemo(
    () => computeSummaryMetrics(macroRecords, macroFilters.years),
    [macroRecords, macroFilters.years]
  );

  // All-records scope for accurate MoM calculation under selected TL
  const allRecordsForMoM = useMemo(
    () => (selectedMacroTL ? allRecords.filter((r) => r.TL === selectedMacroTL) : allRecords),
    [allRecords, selectedMacroTL]
  );

  const monthlyRows = useMemo(
    () => computeMonthlyMonitor(macroTLFilteredRecords, allRecordsForMoM),
    [macroTLFilteredRecords, allRecordsForMoM]
  );

  const sortedMonitorRows = useMemo(
    () => (monitorSortDesc ? [...monthlyRows].reverse() : monthlyRows),
    [monthlyRows, monitorSortDesc]
  );

  const tlShares = useMemo(
    () => computeTLShares(macroYMFilteredRecords),
    [macroYMFilteredRecords]
  );
  const salesPareto = useMemo(
    () => computeParetoSeries(monthlyRows, 'salesEfficiency'),
    [monthlyRows]
  );
  const profitPareto = useMemo(
    () => computeParetoSeries(monthlyRows, 'profitEfficiency'),
    [monthlyRows]
  );

  // YoY charts compare across years under selected TL & Year/Month filters
  const yoyRecords = useMemo(() => {
    const base = filterMacroRecords(allRecords, {
      years: macroFilters.years,
      months: macroFilters.months,
    });
    return selectedMacroTL ? base.filter((r) => r.TL === selectedMacroTL) : base;
  }, [allRecords, macroFilters.years, macroFilters.months, selectedMacroTL]);

  const gmvYoY = useMemo(() => computeYoYSeries(yoyRecords, '销售额'), [yoyRecords]);
  const profitYoY = useMemo(() => computeYoYSeries(yoyRecords, '利润额'), [yoyRecords]);
  const qtyYoY = useMemo(() => computeYoYSeries(yoyRecords, '销售数量'), [yoyRecords]);

  const crossTab = useMemo(() => computeCrossTabMatrix(macroTLFilteredRecords), [macroTLFilteredRecords]);
  const visibleCrossTabRows = useMemo(
    () =>
      crossTabFilter === 'ALL'
        ? crossTab.rows
        : crossTab.rows.filter((r) => r.metric === crossTabFilter),
    [crossTab.rows, crossTabFilter]
  );

  // =========================================================================
  // Drilldown computations with independent internal cross-filtering
  // =========================================================================
  const toggleDrillMarket = (mkt: string) => {
    setDrillFilters((p) => ({
      ...p,
      markets: p.markets[0] === mkt ? [] : [mkt],
    }));
  };

  const toggleDrillTL = (tl: string) => {
    setDrillFilters((p) => ({
      ...p,
      tls: p.tls[0] === tl ? [] : [tl],
    }));
  };

  const toggleDrillSPU = (spu: string) => {
    setDrillFilters((p) => ({
      ...p,
      spus: p.spus[0] === spu ? [] : [spu],
    }));
  };

  const toggleDrillYear = (year: number) => {
    setSelectedDrillYM(null);
    setDrillFilters((p) => ({
      ...p,
      years: p.years[0] === year ? [] : [year],
    }));
  };

  const toggleDrillYM = (ym: string) => {
    setSelectedDrillYM((prev) => (prev === ym ? null : ym));
  };

  const toggleSkuMarket = (skuMarket: string) => {
    setSelectedSkuMarket((prev) => (prev === skuMarket ? null : skuMarket));
  };

  const resetAllDrillFilters = () => {
    setDrillFilters({ years: [], months: [], markets: [], tls: [], spus: [] });
    setSelectedDrillYM(null);
    setSelectedSkuMarket(null);
  };

  const drillBaseRecords = useMemo(() => {
    const base = filterDrilldownRecords(allRecords, drillFilters);
    return selectedSkuMarket
      ? base.filter((r) => `${r.修正SKU} (${r.市场})` === selectedSkuMarket)
      : base;
  }, [allRecords, drillFilters, selectedSkuMarket]);

  const drillRecordsWithYM = useMemo(
    () =>
      selectedDrillYM
        ? drillBaseRecords.filter((r) => r.年月 === selectedDrillYM)
        : drillBaseRecords,
    [drillBaseRecords, selectedDrillYM]
  );

  const drillSummary = useMemo(
    () => computeSummaryMetrics(drillRecordsWithYM, drillFilters.years),
    [drillRecordsWithYM, drillFilters.years]
  );

  // 1. GMV表格 (SKU-MARKET x 1-12月): keep SKU-Market rows filterable by other filters while highlighting active SKU-Market
  const drillSkuMarketScope = useMemo(() => {
    const base = filterDrilldownRecords(allRecords, drillFilters);
    return selectedDrillYM ? base.filter((r) => r.年月 === selectedDrillYM) : base;
  }, [allRecords, drillFilters, selectedDrillYM]);

  const skuMarketGmvRows = useMemo(
    () => computeSkuMarketGmvTable(drillSkuMarketScope),
    [drillSkuMarketScope]
  );

  // 2. 市场销售额&利润&销量趋势: omit markets filter so sibling markets stay visible
  const drillMarketScope = useMemo(() => {
    const base = filterDrilldownRecords(allRecords, { ...drillFilters, markets: [] });
    const withSku = selectedSkuMarket
      ? base.filter((r) => `${r.修正SKU} (${r.市场})` === selectedSkuMarket)
      : base;
    return selectedDrillYM ? withSku.filter((r) => r.年月 === selectedDrillYM) : withSku;
  }, [allRecords, drillFilters, selectedSkuMarket, selectedDrillYM]);

  const drillMarketNoTimeScope = useMemo(() => {
    const base = filterDrilldownRecords(allRecords, {
      ...drillFilters,
      years: [],
      months: [],
      markets: [],
    });
    return selectedSkuMarket
      ? base.filter((r) => `${r.修正SKU} (${r.市场})` === selectedSkuMarket)
      : base;
  }, [allRecords, drillFilters, selectedSkuMarket]);

  const marketMultiAxisRows = useMemo(
    () => computeMarketMultiAxisMetrics(drillMarketScope, drillMarketNoTimeScope),
    [drillMarketScope, drillMarketNoTimeScope]
  );

  // 3. TL月度销售数据表
  const tlMonthlySalesGroups = useMemo(
    () => computeTLMonthlySalesRows(drillBaseRecords),
    [drillBaseRecords]
  );

  // 4. TL销售表现: omit tls filter so sibling TLs stay visible
  const drillTLScope = useMemo(() => {
    const base = filterDrilldownRecords(allRecords, { ...drillFilters, tls: [] });
    const withSku = selectedSkuMarket
      ? base.filter((r) => `${r.修正SKU} (${r.市场})` === selectedSkuMarket)
      : base;
    return selectedDrillYM ? withSku.filter((r) => r.年月 === selectedDrillYM) : withSku;
  }, [allRecords, drillFilters, selectedSkuMarket, selectedDrillYM]);

  const tlPerformanceRows = useMemo(
    () => computeTLPerformanceMetrics(drillTLScope),
    [drillTLScope]
  );

  // 5. SPU销售数据表
  const spuSalesRows = useMemo(
    () => computeSPUSalesTableRows(drillBaseRecords),
    [drillBaseRecords]
  );

  // 6. 费用占比数据表格
  const expenseRatioRows = useMemo(
    () => computeExpenseRatioTable(drillBaseRecords),
    [drillBaseRecords]
  );

  // 7. 总成本趋势图 & 8. 客单价趋势图
  const drillMoMScope = useMemo(() => {
    const base = filterDrilldownRecords(allRecords, {
      ...drillFilters,
      years: [],
      months: [],
    });
    return selectedSkuMarket
      ? base.filter((r) => `${r.修正SKU} (${r.市场})` === selectedSkuMarket)
      : base;
  }, [allRecords, drillFilters, selectedSkuMarket]);

  const costAndAovPoints = useMemo(
    () => computeCostAndAovTrends(drillBaseRecords, drillMoMScope),
    [drillBaseRecords, drillMoMScope]
  );

  const hasActiveDrillFilter =
    drillFilters.years.length > 0 ||
    drillFilters.months.length > 0 ||
    drillFilters.markets.length > 0 ||
    drillFilters.tls.length > 0 ||
    drillFilters.spus.length > 0 ||
    selectedDrillYM !== null ||
    selectedSkuMarket !== null;

  const regionSummaryText = useMemo(() => {
    const mkts = Array.from(new Set(macroRecords.map((r) => r.市场))).sort();
    const minYM = monthlyRows[0]?.yearMonth ?? '—';
    const maxYM = monthlyRows[monthlyRows.length - 1]?.yearMonth ?? '—';
    return `覆盖市场: ${mkts.join(' / ') || '暂无'} · 数据周期: ${minYM} 至 ${maxYM}`;
  }, [macroRecords, monthlyRows]);

  const handleExportMonitorCSV = () => {
    const headers = [
      '年月',
      'GMV',
      '销售额月环比',
      '利润额',
      '利润额月环比',
      '人数',
      '销售额人效',
      '销售额人效环比',
      '利润人效',
      '利润人效环比',
    ];
    const lines = monthlyRows.map((r) =>
      [
        r.yearMonth,
        r.gmv,
        formatPct(r.gmvMoM),
        r.profit,
        formatPct(r.profitMoM),
        r.opCount,
        r.salesEfficiency.toFixed(0),
        formatPct(r.salesEfficiencyMoM),
        r.profitEfficiency.toFixed(0),
        formatPct(r.profitEfficiencyMoM),
      ].join(',')
    );
    const csv = '\uFEFF' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `人效监控明细_${summary.yearLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full">
      {/* ===================================================================== */}
      {/* BLOCK 1: 大盘数据看板 (Macro Overview Dashboard)                      */}
      {/* ===================================================================== */}
      <section ref={macroRef} className="w-full px-5 lg:px-10 py-6 space-y-6">
        {/* Title + Region/Time Metadata + Scroll-down Quick Trigger */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>总监财报看板</span>
              <span aria-hidden="true">·</span>
              <span>{regionSummaryText}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                SKU 替换 {joinStats.skuMappedCount.toLocaleString()} 条 · TL 关联 {joinStats.tlMatchedCount.toLocaleString()} 条
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              大盘数据看板
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => drilldownRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>下钻看板</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Macro Filter Bar: 年、月 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4"
        >
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <span>年份筛选</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setMacroFilters((p) => ({ ...p, years: [] }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    macroFilters.years.length === 0
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  全部年份
                </button>
                {availableYears.map((y) => {
                  const active = macroFilters.years.includes(y);
                  return (
                    <button
                      key={y}
                      onClick={() => toggleMacroYear(y)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap tabular-nums ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {y}年
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                月份筛选
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setMacroFilters((p) => ({ ...p, months: [] }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    macroFilters.months.length === 0
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  全年
                </button>
                {availableMonths.map((m) => {
                  const active = macroFilters.months.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleMacroMonth(m)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap tabular-nums ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {m}月
                    </button>
                  );
                })}
              </div>

              {(macroFilters.years.length > 0 ||
                macroFilters.months.length > 0 ||
                selectedMacroTL !== null ||
                selectedMacroYM !== null) && (
                <button
                  onClick={() => {
                    setMacroFilters({ years: [], months: [] });
                    setSelectedMacroTL(null);
                    setSelectedMacroYM(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置全部</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Cross-Filter Banner inside Macro Dashboard */}
          {(selectedMacroTL || selectedMacroYM) && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">大盘图表明细联动中:</span>
              {selectedMacroTL && (
                <button
                  onClick={() => setSelectedMacroTL(null)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors"
                >
                  TL 团队: {selectedMacroTL} ×
                </button>
              )}
              {selectedMacroYM && (
                <button
                  onClick={() => setSelectedMacroYM(null)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-medium hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors"
                >
                  年月: {selectedMacroYM} ×
                </button>
              )}
              <span className="text-[11px] text-slate-400">
                再次点击图表高亮项或上方标签可取消联动
              </span>
            </div>
          )}
        </motion.div>

        {/* 1. 汇总数据 (Summary KPIs & Full Cost Breakdown) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {/* Top Headline Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
              <div className="text-xs text-slate-500 dark:text-slate-400">统计年份 · 周期</div>
              <div className="mt-2 font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums truncate">
                {summary.yearLabel}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                在岗运营人数: {summary.opCount} 人
              </div>
            </div>

            <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
              <div className="text-xs text-slate-500 dark:text-slate-400">GMV (总销售额)</div>
              <div className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(summary.gmv, true)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                销售额人效: {formatCurrency(summary.salesEfficiency, true)}
              </div>
            </div>

            <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-emerald-500/30">
              <div className="text-xs text-slate-500 dark:text-slate-400">利润额 (净利润)</div>
              <div className="mt-2 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(summary.profit, true)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                利润率: {formatPct(summary.profitRate)} · 人效 {formatCurrency(summary.profitEfficiency, true)}
              </div>
            </div>

            <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
              <div className="text-xs text-slate-500 dark:text-slate-400">总成本</div>
              <div className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(summary.totalCost, true)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                占GMV比: {formatPct(summary.gmv === 0 ? 0 : summary.totalCost / summary.gmv)}
              </div>
            </div>

            <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
              <div className="text-xs text-slate-500 dark:text-slate-400">销售数量</div>
              <div className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatNumber(summary.quantity)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                客单价 (AOV): {formatCurrency(summary.aov)}
              </div>
            </div>

            <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-amber-500/30">
              <div className="text-xs text-slate-500 dark:text-slate-400">广告费 & Tcos</div>
              <div className="mt-2 font-mono text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatCurrency(summary.adCost, true)}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Tcos (广告占比): {formatPct(summary.tcos)}
              </div>
            </div>
          </div>

          {/* All Cost Items Grid (采购成本, 头程, 尾程, 总平台费, 人工成本, 仓租, 售后, 直接调整费, 间接调整费 + 占比) */}
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  汇总数据 · 全口径成本结构与 GMV 占比
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  涵盖采购、头尾程物流、平台费、人工、仓租、售后及直/间接调整费（占比 = 成本项 ÷ GMV）
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                总成本合计: {formatCurrency(summary.totalCost)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {summary.costBreakdown.map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-slate-100 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatPct(item.ratioToGmv)}
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(item.amount, true)}
                  </div>
                  <div className="mt-2 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500/80"
                      style={{ width: `${Math.min(100, item.ratioToGmv * 240)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 2. 各TL_GMV占比 (环形图) + TL利润占比 (环形图) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <DonutChartCard
            title="各 TL · GMV 占比（环形图）"
            subtitle="悬停查看明细，点击任意 TL 切片或图例即可联动筛选大盘"
            items={tlShares}
            mode="gmv"
            selectedTL={selectedMacroTL}
            onSelectTL={toggleMacroTL}
          />
          <DonutChartCard
            title="各 TL · 利润占比（环形图）"
            subtitle="悬停查看利润率，点击任意 TL 切片或图例即可联动筛选大盘"
            items={tlShares}
            mode="profit"
            selectedTL={selectedMacroTL}
            onSelectTL={toggleMacroTL}
          />
        </motion.div>

        {/* 3. 人效监控表格 */}
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                人效监控表格
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                人数 = COUNTD(OP)，销售额人效 = GMV / 人数，利润人效 = 利润额 / 人数，支持按年月排序与 CSV 导出
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonitorSortDesc((v) => !v)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{monitorSortDesc ? '最新年月优先' : '时间正序'}</span>
              </button>
              <button
                onClick={handleExportMonitorCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto erp-scroll max-h-[380px] rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[920px]">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5">年月</th>
                  <th className="py-2.5 px-3.5 text-right">GMV</th>
                  <th className="py-2.5 px-3.5 text-right">销售额月环比</th>
                  <th className="py-2.5 px-3.5 text-right">利润额</th>
                  <th className="py-2.5 px-3.5 text-right">利润额月环比</th>
                  <th className="py-2.5 px-3.5 text-right">人数</th>
                  <th className="py-2.5 px-3.5 text-right">销售额人效</th>
                  <th className="py-2.5 px-3.5 text-right">销售额人效环比</th>
                  <th className="py-2.5 px-3.5 text-right">利润人效</th>
                  <th className="py-2.5 px-3.5 text-right">利润人效环比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono tabular-nums">
                {sortedMonitorRows.map((row) => {
                  const isRowSel = selectedMacroYM === row.yearMonth;
                  return (
                  <tr
                    key={row.yearMonth}
                    onClick={() => toggleMacroYM(row.yearMonth)}
                    title="点击该行按年月联动筛选大盘"
                    className={`cursor-pointer transition-colors ${
                      isRowSel
                        ? 'bg-blue-50/90 dark:bg-blue-500/15'
                        : 'hover:bg-blue-50/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-slate-100">
                      {row.yearMonth}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-800 dark:text-slate-200">
                      {formatCurrency(row.gmv)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <MoMCell value={row.gmvMoM} />
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-800 dark:text-slate-200">
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <MoMCell value={row.profitMoM} />
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-600 dark:text-slate-300">
                      {row.opCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-blue-600 dark:text-blue-400 font-medium">
                      {formatCurrency(row.salesEfficiency)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <MoMCell value={row.salesEfficiencyMoM} />
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(row.profitEfficiency)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <MoMCell value={row.profitEfficiencyMoM} />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. 人效趋势图（上下两块：销售额人效趋势图 + 利润人效趋势图，帕累托图） */}
        <div className="space-y-4">
          <ParetoEfficiencyChart
            title="人效趋势图 · 上：销售额人效趋势（帕累托图）"
            subtitle="柱状图展示各月人均 GMV 产出，点击柱体可联动筛选对应年月"
            data={salesPareto}
            barColor="#3B82F6"
            lineColor="#F59E0B"
            metricLabel="销售额人效"
            selectedYearMonth={selectedMacroYM}
            onSelectYearMonth={toggleMacroYM}
          />
          <ParetoEfficiencyChart
            title="人效趋势图 · 下：利润人效趋势（帕累托图）"
            subtitle="柱状图展示各月人均净利润产出，点击柱体可联动筛选对应年月"
            data={profitPareto}
            barColor="#10B981"
            lineColor="#8B5CF6"
            metricLabel="利润人效"
            selectedYearMonth={selectedMacroYM}
            onSelectYearMonth={toggleMacroYM}
          />
        </div>

        {/* 5. GMV & 利润趋势图（透明宽柱 + 不透明窄柱反差对比） */}
        <GmvProfitContrastChart
          rows={monthlyRows}
          selectedYearMonth={selectedMacroYM}
          onSelectYearMonth={toggleMacroYM}
        />

        {/* 6. 销售额利润对比表格（左边 GMV / 利润额 / 销售数量 + 合计，年为行组，右侧为 1月-12月） */}
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                销售额 · 利润 · 销量跨年对比矩阵表
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                左侧展示 GMV、利润额、销售数量及年度维度，右侧横向展开 1–12 月度明细与全期合计
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
              {(['ALL', 'GMV', '利润额', '销售数量'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCrossTabFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    crossTabFilter === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? '全部指标' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto erp-scroll rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[1160px]">
              <thead className="bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 z-10 bg-slate-100 dark:bg-slate-900 min-w-[96px]">
                    指标
                  </th>
                  <th className="py-2.5 px-3 sticky left-[96px] z-10 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-w-[72px]">
                    年份
                  </th>
                  {availableMonths.map((m) => (
                    <th key={m} className="py-2.5 px-2.5 text-right font-mono">
                      {m}月
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right font-mono bg-slate-200/60 dark:bg-slate-800/80">
                    合计
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono tabular-nums">
                {(['GMV', '利润额', '销售数量'] as const)
                  .filter((m) => crossTabFilter === 'ALL' || crossTabFilter === m)
                  .map((metric) => {
                    const metricRows = visibleCrossTabRows.filter((r) => r.metric === metric);
                    const totalData = crossTab.grandTotalsByMetric[metric];
                    const fmt = (v: number) =>
                      metric === '销售数量' ? formatNumber(v) : formatCurrency(v, true);

                    return (
                      <React.Fragment key={metric}>
                        {metricRows.map((row) => (
                          <tr
                            key={`${row.metric}-${row.year}`}
                            onClick={() => toggleMacroYear(row.year)}
                            title={`点击按 ${row.year} 年联动筛选`}
                            className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-[#111827]">
                              {row.metric}
                            </td>
                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400 sticky left-[96px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800">
                              {row.year}
                            </td>
                            {row.months.map((val, idx) => (
                              <td
                                key={idx}
                                className="py-2 px-2.5 text-right text-slate-700 dark:text-slate-300"
                              >
                                {val === null ? (
                                  <span className="text-slate-300 dark:text-slate-700">—</span>
                                ) : (
                                  fmt(val)
                                )}
                              </td>
                            ))}
                            <td className="py-2 px-3 text-right font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50">
                              {fmt(row.total)}
                            </td>
                          </tr>
                        ))}
                        {/* Metric Subtotal Row */}
                        <tr className="bg-slate-50/90 dark:bg-slate-800/50 font-semibold border-b-2 border-slate-200 dark:border-slate-700">
                          <td className="py-2 px-3 font-sans text-blue-600 dark:text-blue-400 sticky left-0 bg-slate-50 dark:bg-slate-800">
                            {metric} 合计
                          </td>
                          <td className="py-2 px-3 text-slate-500 dark:text-slate-400 sticky left-[96px] bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                            全期
                          </td>
                          {totalData.months.map((val, idx) => (
                            <td key={idx} className="py-2 px-2.5 text-right text-slate-900 dark:text-slate-100">
                              {val === 0 ? '—' : fmt(val)}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30">
                            {fmt(totalData.total)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. GMV & 利润 & 销量年同比（三个折线图） */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <YoYLineChart
            title="GMV 年同比（折线图）"
            series={gmvYoY}
            valueType="currency"
            onToggleYear={toggleMacroYear}
            onSelectMonth={toggleMacroMonth}
          />
          <YoYLineChart
            title="利润额 年同比（折线图）"
            series={profitYoY}
            valueType="currency"
            onToggleYear={toggleMacroYear}
            onSelectMonth={toggleMacroMonth}
          />
          <YoYLineChart
            title="销售数量 年同比（折线图）"
            series={qtyYoY}
            valueType="units"
            onToggleYear={toggleMacroYear}
            onSelectMonth={toggleMacroMonth}
          />
        </div>

        {/* 8. 销售额、销量、利润额月环比 */}
        <MoMGrowthChart
          rows={monthlyRows}
          selectedYearMonth={selectedMacroYM}
          onSelectYearMonth={toggleMacroYM}
        />
      </section>

      {/* ===================================================================== */}
      {/* BLOCK 2: 下钻看板 (Drill-down Section - Smooth Scroll Transition)     */}
      {/* ===================================================================== */}
      <section
        ref={drilldownRef}
        className="w-full px-5 lg:px-10 pt-10 pb-16 border-t-2 border-dashed border-slate-200 dark:border-slate-800 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>总监财报看板</span>
              <span aria-hidden="true">·</span>
              <span>多维下钻分析区</span>
              <span aria-hidden="true">·</span>
              <span>已启用 修正SKU & SPU 正则映射</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              下钻看板（市场 · TL · SPU 维度）
            </h2>
          </div>

          <button
            onClick={() => macroRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>返回大盘看板</span>
          </button>
        </div>

        {/* Drilldown 5 Filters: 年、月、市场、TL、SPU + Active Cross-Filter Banner */}
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                年份 (年)
              </label>
              <select
                value={drillFilters.years[0] ?? ''}
                onChange={(e) => {
                  setSelectedDrillYM(null);
                  setDrillFilters((p) => ({
                    ...p,
                    years: e.target.value ? [Number(e.target.value)] : [],
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部年份</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                月份 (月)
              </label>
              <select
                value={drillFilters.months[0] ?? ''}
                onChange={(e) => {
                  setSelectedDrillYM(null);
                  setDrillFilters((p) => ({
                    ...p,
                    months: e.target.value ? [Number(e.target.value)] : [],
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部月份</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                市场 (Market)
              </label>
              <select
                value={drillFilters.markets[0] ?? ''}
                onChange={(e) =>
                  setDrillFilters((p) => ({
                    ...p,
                    markets: e.target.value ? [e.target.value] : [],
                  }))
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部市场</option>
                {availableMarkets.map((mkt) => (
                  <option key={mkt} value={mkt}>
                    {mkt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                组长 (TL)
              </label>
              <select
                value={drillFilters.tls[0] ?? ''}
                onChange={(e) =>
                  setDrillFilters((p) => ({
                    ...p,
                    tls: e.target.value ? [e.target.value] : [],
                  }))
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部 TL</option>
                {availableTLs.map((tl) => (
                  <option key={tl} value={tl}>
                    {tl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                SPU (前3位字母正则提取)
              </label>
              <select
                value={drillFilters.spus[0] ?? ''}
                onChange={(e) =>
                  setDrillFilters((p) => ({
                    ...p,
                    spus: e.target.value ? [e.target.value] : [],
                  }))
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部 SPU</option>
                {availableSPUs.map((spu) => (
                  <option key={spu} value={spu}>
                    {spu}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveDrillFilter && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">
                下钻组件联动中:
              </span>
              {drillFilters.years.map((y) => (
                <button
                  key={`dy-${y}`}
                  onClick={() => toggleDrillYear(y)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-mono font-medium hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors"
                >
                  年份: {y}年 ×
                </button>
              ))}
              {drillFilters.months.map((m) => (
                <button
                  key={`dm-${m}`}
                  onClick={() => setDrillFilters((p) => ({ ...p, months: [] }))}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-mono font-medium hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors"
                >
                  月份: {m}月 ×
                </button>
              ))}
              {drillFilters.markets.map((mkt) => (
                <button
                  key={`dmkt-${mkt}`}
                  onClick={() => toggleDrillMarket(mkt)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-colors"
                >
                  市场: {mkt} ×
                </button>
              ))}
              {drillFilters.tls.map((tl) => (
                <button
                  key={`dtl-${tl}`}
                  onClick={() => toggleDrillTL(tl)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors"
                >
                  TL: {tl} ×
                </button>
              ))}
              {drillFilters.spus.map((spu) => (
                <button
                  key={`dspu-${spu}`}
                  onClick={() => toggleDrillSPU(spu)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-mono font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                >
                  SPU: {spu} ×
                </button>
              ))}
              {selectedDrillYM && (
                <button
                  onClick={() => setSelectedDrillYM(null)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-mono font-medium hover:bg-cyan-100 dark:hover:bg-cyan-500/25 transition-colors"
                >
                  联动年月: {selectedDrillYM} ×
                </button>
              )}
              {selectedSkuMarket && (
                <button
                  onClick={() => setSelectedSkuMarket(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  SKU-MARKET: {selectedSkuMarket} ×
                </button>
              )}
              <button
                onClick={resetAllDrillFilters}
                className="ml-auto px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>重置下钻全部联动</span>
              </button>
            </div>
          )}
        </div>

        {/* Drilldown Active Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">下钻 GMV</div>
            <div className="mt-1.5 font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(drillSummary.gmv, true)}
            </div>
          </div>
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">下钻利润额</div>
            <div className="mt-1.5 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(drillSummary.profit, true)}
            </div>
          </div>
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">下钻利润率</div>
            <div className="mt-1.5 font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {formatPct(drillSummary.profitRate)}
            </div>
          </div>
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">下钻 Tcos</div>
            <div className="mt-1.5 font-mono text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatPct(drillSummary.tcos)}
            </div>
          </div>
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">下钻销量</div>
            <div className="mt-1.5 font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(drillSummary.quantity)}
            </div>
          </div>
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">下钻客单价 · 人数</div>
            <div className="mt-1.5 font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(drillSummary.aov)} · {drillSummary.opCount}人
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Component 1: GMV表格 (SKU-MARKET x 1月-12月 GMV Sum)              */}
        {/* ================================================================= */}
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                1. GMV 表格（SKU-MARKET 月度销售额明细）
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                列维度为 1月–12月，展示各修正 SKU 与市场组合的 GMV 汇总；点击任意行可联动筛选下钻看板
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              共 {skuMarketGmvRows.length} 个 SKU-MARKET 组合
            </span>
          </div>

          <div className="overflow-x-auto erp-scroll max-h-[360px] rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[1160px]">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-w-[190px]">
                    SKU-MARKET
                  </th>
                  {availableMonths.map((m) => (
                    <th key={m} className="py-2.5 px-2.5 text-right font-mono">
                      {m}月
                    </th>
                  ))}
                  <th className="py-2.5 px-3.5 text-right font-mono bg-slate-200/60 dark:bg-slate-800/80">
                    合计
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono tabular-nums">
                {skuMarketGmvRows.map((row) => {
                  const isSel = selectedSkuMarket === row.skuMarket;
                  const dimmed = selectedSkuMarket !== null && !isSel;
                  return (
                    <tr
                      key={row.skuMarket}
                      onClick={() => toggleSkuMarket(row.skuMarket)}
                      title="点击按该 SKU-MARKET 联动筛选下钻看板"
                      style={{ opacity: dimmed ? 0.42 : 1 }}
                      className={`cursor-pointer transition-colors ${
                        isSel
                          ? 'bg-blue-50/90 dark:bg-blue-500/15'
                          : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td
                        className={`py-2 px-3.5 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 font-semibold ${
                          isSel
                            ? 'bg-blue-50 dark:bg-slate-900 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {row.skuMarket}
                      </td>
                      {row.months.map((val, idx) => (
                        <td
                          key={idx}
                          className="py-2 px-2.5 text-right text-slate-700 dark:text-slate-300"
                        >
                          {val === null ? (
                            <span className="text-slate-300 dark:text-slate-700">—</span>
                          ) : (
                            formatCurrency(val)
                          )}
                        </td>
                      ))}
                      <td className="py-2 px-3.5 text-right font-semibold text-slate-900 dark:text-white bg-slate-50/80 dark:bg-slate-900/40">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Component 2: 市场销售额&利润&销量趋势 (5轴横向条形图)               */}
        {/* ================================================================= */}
        <MarketMultiAxisChart
          rows={marketMultiAxisRows}
          selectedMarket={drillFilters.markets[0] ?? null}
          onSelectMarket={toggleDrillMarket}
        />

        {/* ================================================================= */}
        {/* Component 3: TL月度销售数据表 (TL -> 年 -> GMV / 利润额 x 1-12月)  */}
        {/* ================================================================= */}
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                3. TL 月度销售数据表（TL × 年份 × GMV / 利润额）
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                按 TL、年份与指标双行展开 1月–12月及总和明细，点击任意 TL 组可联动筛选下钻看板
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              共 {tlMonthlySalesGroups.length} 个 TL 年度组
            </span>
          </div>

          <div className="overflow-x-auto erp-scroll max-h-[420px] rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[1220px]">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 min-w-[100px]">
                    TL
                  </th>
                  <th className="py-2.5 px-3 sticky left-[100px] z-30 bg-slate-100 dark:bg-slate-900 min-w-[68px]">
                    年
                  </th>
                  <th className="py-2.5 px-3 sticky left-[168px] z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-w-[74px]">
                    指标
                  </th>
                  {availableMonths.map((m) => (
                    <th key={m} className="py-2.5 px-2.5 text-right font-mono">
                      {m}月
                    </th>
                  ))}
                  <th className="py-2.5 px-3.5 text-right font-mono bg-slate-200/60 dark:bg-slate-800/80">
                    总和
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono tabular-nums">
                {tlMonthlySalesGroups.map((group) => {
                  const isSelTL = drillFilters.tls[0] === group.tl;
                  return (
                    <React.Fragment key={`${group.tl}-${group.year}`}>
                      {/* GMV Row */}
                      <tr
                        onClick={() => toggleDrillTL(group.tl)}
                        title={`点击按 TL: ${group.tl} 联动筛选`}
                        className={`cursor-pointer transition-colors ${
                          isSelTL
                            ? 'bg-blue-50/75 dark:bg-blue-500/15'
                            : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td
                          rowSpan={2}
                          className="py-2 px-3 align-middle font-sans font-semibold text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800"
                        >
                          {group.tl}
                        </td>
                        <td
                          rowSpan={2}
                          className="py-2 px-3 align-middle text-slate-600 dark:text-slate-300 sticky left-[100px] bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800"
                        >
                          {group.year}
                        </td>
                        <td className="py-1.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300 sticky left-[168px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800">
                          GMV
                        </td>
                        {group.monthsGmv.map((val, idx) => (
                          <td
                            key={idx}
                            className="py-1.5 px-2.5 text-right text-slate-800 dark:text-slate-200"
                          >
                            {val === null ? (
                              <span className="text-slate-300 dark:text-slate-700">—</span>
                            ) : (
                              formatCurrency(val)
                            )}
                          </td>
                        ))}
                        <td className="py-1.5 px-3.5 text-right font-semibold text-slate-900 dark:text-white bg-slate-50/80 dark:bg-slate-900/40">
                          {formatCurrency(group.totalGmv)}
                        </td>
                      </tr>

                      {/* 利润额 Row */}
                      <tr
                        onClick={() => toggleDrillTL(group.tl)}
                        title={`点击按 TL: ${group.tl} 联动筛选`}
                        className={`cursor-pointer transition-colors border-b border-slate-200 dark:border-slate-800 ${
                          isSelTL
                            ? 'bg-blue-50/75 dark:bg-blue-500/15'
                            : 'bg-slate-50/40 dark:bg-slate-900/25 hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-1.5 px-3 font-sans font-medium text-emerald-600 dark:text-emerald-400 sticky left-[168px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                          利润额
                        </td>
                        {group.monthsProfit.map((val, idx) => (
                          <td
                            key={idx}
                            className={`py-1.5 px-2.5 text-right ${
                              val !== null && val < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {val === null ? (
                              <span className="text-slate-300 dark:text-slate-700">—</span>
                            ) : (
                              formatCurrency(val)
                            )}
                          </td>
                        ))}
                        <td
                          className={`py-1.5 px-3.5 text-right font-semibold bg-slate-50/80 dark:bg-slate-900/40 ${
                            group.totalProfit < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatCurrency(group.totalProfit)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Component 4: TL销售表现 (4轴横向条形图)                            */}
        {/* ================================================================= */}
        <TLMultiAxisChart
          rows={tlPerformanceRows}
          selectedTL={drillFilters.tls[0] ?? null}
          onSelectTL={toggleDrillTL}
        />

        {/* ================================================================= */}
        {/* Component 5: SPU销售数据表 (年 x SPU x 1-12月 GMV, 环比色阶提示)   */}
        {/* ================================================================= */}
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                5. SPU 销售数据表（年度 · SPU 月度 GMV 矩阵）
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                维度切割为 年、SPU，展示各月 GMV（蓝色代表较上月增长或首月，红色代表较上月回落）；点击行联动筛选 SPU
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              共 {spuSalesRows.length} 条 SPU 年度记录
            </span>
          </div>

          <div className="overflow-x-auto erp-scroll max-h-[400px] rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[1140px]">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 min-w-[72px]">
                    年
                  </th>
                  <th className="py-2.5 px-3 sticky left-[72px] z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-w-[76px]">
                    SPU
                  </th>
                  {availableMonths.map((m) => (
                    <th key={m} className="py-2.5 px-2.5 text-right font-mono">
                      {m}
                    </th>
                  ))}
                  <th className="py-2.5 px-3.5 text-right font-mono bg-slate-200/60 dark:bg-slate-800/80">
                    合计
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono tabular-nums">
                {spuSalesRows.map((row) => {
                  const isSelSPU = drillFilters.spus[0] === row.spu;
                  let prevNonNull: number | null = null;
                  return (
                    <tr
                      key={`${row.year}-${row.spu}`}
                      onClick={() => toggleDrillSPU(row.spu)}
                      title={`点击按 SPU: ${row.spu} 联动筛选`}
                      className={`cursor-pointer transition-colors ${
                        isSelSPU
                          ? 'bg-blue-50/90 dark:bg-blue-500/15'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-[#111827]">
                        {row.year}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white sticky left-[72px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800">
                        {row.spu}
                      </td>
                      {row.months.map((val, idx) => {
                        if (val === null) {
                          return (
                            <td key={idx} className="py-2 px-2.5 text-right text-slate-300 dark:text-slate-700">
                              —
                            </td>
                          );
                        }
                        const isUp = prevNonNull === null || val >= prevNonNull;
                        prevNonNull = val;
                        return (
                          <td
                            key={idx}
                            className={`py-2 px-2.5 text-right font-medium ${
                              isUp
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatNumber(Math.round(val))}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3.5 text-right font-semibold text-slate-900 dark:text-white bg-slate-50/80 dark:bg-slate-900/40">
                        {formatCurrency(row.total, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Component 6: 费用占比数据表格 (年 x 费用名称 x 1-12月)             */}
        {/* ================================================================= */}
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                6. 费用占比数据表格（年度 × 费用科目 × 月度占比）
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                最左两列为年、费用名称，右侧展示 1–12 月对应费用占 GMV 比例及客单价均值；点击年份组联动筛选年份
              </p>
            </div>
          </div>

          <div className="overflow-x-auto erp-scroll max-h-[440px] rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 min-w-[72px]">
                    年
                  </th>
                  <th className="py-2.5 px-3 sticky left-[72px] z-30 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-w-[120px]">
                    费用名称
                  </th>
                  {availableMonths.map((m) => (
                    <th key={m} className="py-2.5 px-2.5 text-right font-mono">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono tabular-nums">
                {expenseRatioRows.map((row, rIdx) => {
                  const isFirstOfYear = rIdx % 12 === 0;
                  const isSelYear = drillFilters.years[0] === row.year;
                  const metricColorMap: Record<string, string> = {
                    profitRate: 'text-rose-600 dark:text-rose-400',
                    aov: 'text-sky-600 dark:text-sky-400',
                    tcos: 'text-indigo-600 dark:text-indigo-400',
                    purchase: 'text-amber-600 dark:text-amber-400',
                    firstLeg: 'text-emerald-600 dark:text-emerald-400',
                    lastLeg: 'text-teal-600 dark:text-teal-400',
                    platform: 'text-rose-500 dark:text-rose-400',
                    afterSales: 'text-amber-500 dark:text-amber-300',
                    rent: 'text-emerald-500 dark:text-emerald-400',
                    labor: 'text-orange-600 dark:text-orange-400',
                    directAdj: 'text-slate-600 dark:text-slate-300',
                    indirectAdj: 'text-slate-500 dark:text-slate-400',
                  };
                  const cellColor = metricColorMap[row.metricKey] ?? 'text-slate-700 dark:text-slate-300';

                  return (
                    <tr
                      key={`${row.year}-${row.metricKey}`}
                      onClick={() => toggleDrillYear(row.year)}
                      title={`点击按 ${row.year} 年联动筛选`}
                      className={`cursor-pointer transition-colors ${
                        isSelYear
                          ? 'bg-blue-50/70 dark:bg-blue-500/15'
                          : rIdx % 2 === 1
                          ? 'bg-slate-50/50 dark:bg-slate-900/25 hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                          : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {isFirstOfYear && (
                        <td
                          rowSpan={12}
                          className="py-2 px-3 align-top font-semibold text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-[#111827] border-r border-slate-100 dark:border-slate-800 border-b"
                        >
                          {row.year}
                        </td>
                      )}
                      <td className="py-1.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200 sticky left-[72px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800">
                        {row.label}
                      </td>
                      {row.months.map((val, idx) => (
                        <td key={idx} className={`py-1.5 px-2.5 text-right font-medium ${cellColor}`}>
                          {val === null ? (
                            <span className="text-slate-300 dark:text-slate-700">—</span>
                          ) : row.format === 'currency' ? (
                            val.toFixed(2)
                          ) : (
                            `${(val * 100).toFixed(2)}%`
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Component 7 & 8: 总成本趋势图 + 客单价趋势图 (柱状图 + 环比曲线)   */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <DualComboTrendChart
            title="7. 总成本趋势图（总成本柱状 + 总成本环比曲线）"
            subtitle="柱状图展示各月总成本金额，折线展示月环比变化；点击月柱可联动筛选市场与TL表现"
            points={costAndAovPoints}
            mode="cost"
            selectedYearMonth={selectedDrillYM}
            onSelectYearMonth={toggleDrillYM}
          />
          <DualComboTrendChart
            title="8. 客单价趋势图（客单价均值柱状 + 客单价环比曲线）"
            subtitle="柱状图展示各月客单价平均值 (GMV/销量)，折线展示月环比；点击月柱可联动筛选"
            points={costAndAovPoints}
            mode="aov"
            selectedYearMonth={selectedDrillYM}
            onSelectYearMonth={toggleDrillYM}
          />
        </div>
      </section>
    </div>
  );
};
