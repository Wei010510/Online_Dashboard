import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Database, Globe, RotateCcw, Upload } from 'lucide-react';
import {
  EMPTY_ORDERS_ADS_FILTERS,
  OrdersAdsFilters,
  OrdersAdsMetricKey,
  OrdersAdsRecord,
} from '../../types/ordersAds';
import {
  computeOrdersAdsDailySeries,
  computeOrdersAdsDailyPoint,
  computeOrdersAdsMarketRows,
  computeOrdersAdsMarketShares,
  computeOrdersAdsSpuDeltas,
  computeOrdersAdsSpuMovingRows,
  computeOrdersAdsSpuWeeklyDeltas,
  computeOrdersAdsSpuWeeklyRows,
  computeOrdersAdsTlTrendRows,
  computeOrdersAdsWeeklyPoint,
  computeOrdersAdsWeeklySeries,
  filterOrdersAdsRecords,
  formatOrdersAdsDate,
  getOrdersAdsWeekStart,
  shiftOrdersAdsDate,
} from '../../utils/ordersAdsEngine';
import {
  DailyAreaChart,
  DailyMetricCard,
  MarketDonutChart,
  MarketSalesTable,
  ORDERS_ADS_METRIC_META,
  SpuDeltaBarChart,
  SpuMovingTable,
  SpuWeeklyMetricsTable,
  TlDailyTrendTable,
  WeeklyRatioChart,
} from './OrdersAdsCharts';

interface OrdersAdsDashboardProps {
  allRecords: OrdersAdsRecord[];
  sourceLabel: string;
  updatedAt: string;
  isCustom: boolean;
  onOpenImport: () => void;
  onResetData: () => void;
}

const METRICS: OrdersAdsMetricKey[] = ['gmv', 'orders', 'quantity'];

const SUB_BOARDS = [
  { id: 'daily', label: '日维度监控看板', description: '当日对比、SPU涨跌与TL日趋势' },
  { id: 'weekly', label: '周维度监控看板', description: '本周与上周指标对比' },
  { id: 'market', label: '市场监控看板', description: '市场维度经营表现与SPU动销' },
] as const;

type SubBoardId = typeof SUB_BOARDS[number]['id'];

export const OrdersAdsDashboard: React.FC<OrdersAdsDashboardProps> = ({
  allRecords,
  sourceLabel,
  updatedAt,
  isCustom,
  onOpenImport,
  onResetData,
}) => {
  const [filters, setFilters] = useState<OrdersAdsFilters>({ ...EMPTY_ORDERS_ADS_FILTERS });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [activeSubBoard, setActiveSubBoard] = useState<SubBoardId>('daily');
  const activeSubBoardConfig = SUB_BOARDS.find((board) => board.id === activeSubBoard) ?? SUB_BOARDS[0];

  const dates = useMemo(() => Array.from(new Set(allRecords.map((record) => record.日期))).sort(), [allRecords]);
  const latestDate = dates[dates.length - 1] ?? '';
  const activeDate = selectedDate && dates.includes(selectedDate) ? selectedDate : latestDate;
  const yesterdayDate = activeDate ? shiftOrdersAdsDate(activeDate, -1) : '';
  const weekStarts = useMemo(() => Array.from(new Set(allRecords.map((record) => record.周开始日期))).sort(), [allRecords]);
  const latestWeekStart = latestDate ? getOrdersAdsWeekStart(latestDate) : '';
  const selectedWeekStart = selectedWeek ? getOrdersAdsWeekStart(selectedWeek) : latestWeekStart;
  const activeWeekStart = weekStarts.includes(selectedWeekStart) ? selectedWeekStart : weekStarts[weekStarts.length - 1] ?? '';
  const previousWeekStart = activeWeekStart ? shiftOrdersAdsDate(activeWeekStart, -7) : '';
  const activeWeekIndex = Math.max(0, weekStarts.indexOf(activeWeekStart));
  const filteredRecords = useMemo(() => filterOrdersAdsRecords(allRecords, filters), [allRecords, filters]);
  const tlScopeRecords = useMemo(
    () => filterOrdersAdsRecords(allRecords, { ...filters, tls: [] }),
    [allRecords, filters]
  );
  const todayPoint = useMemo(() => computeOrdersAdsDailyPoint(filteredRecords, activeDate), [filteredRecords, activeDate]);
  const yesterdayPoint = useMemo(() => computeOrdersAdsDailyPoint(filteredRecords, yesterdayDate), [filteredRecords, yesterdayDate]);
  const dailySeries = useMemo(() => computeOrdersAdsDailySeries(filteredRecords, activeDate, 30), [filteredRecords, activeDate]);
  const spuDeltas = useMemo(() => computeOrdersAdsSpuDeltas(filteredRecords, activeDate), [filteredRecords, activeDate]);
  const tlRows = useMemo(() => ({
    gmv: computeOrdersAdsTlTrendRows(tlScopeRecords, activeDate, 'gmv', 30),
    quantity: computeOrdersAdsTlTrendRows(tlScopeRecords, activeDate, 'quantity', 30),
  }), [tlScopeRecords, activeDate]);

  const currentWeekPoint = useMemo(() => computeOrdersAdsWeeklyPoint(filteredRecords, activeWeekStart), [filteredRecords, activeWeekStart]);
  const previousWeekPoint = useMemo(() => computeOrdersAdsWeeklyPoint(filteredRecords, previousWeekStart), [filteredRecords, previousWeekStart]);
  const weeklySeries = useMemo(() => computeOrdersAdsWeeklySeries(filteredRecords, activeWeekStart, 12), [filteredRecords, activeWeekStart]);
  const spuWeeklyDeltas = useMemo(() => computeOrdersAdsSpuWeeklyDeltas(filteredRecords, activeWeekStart), [filteredRecords, activeWeekStart]);
  const spuWeeklyRows = useMemo(() => computeOrdersAdsSpuWeeklyRows(filteredRecords, activeWeekStart), [filteredRecords, activeWeekStart]);

  const marketOptions = useMemo(() => Array.from(new Set(allRecords.map((record) => record.国家))).filter(Boolean).sort(), [allRecords]);
  const marketSharesGmv = useMemo(() => computeOrdersAdsMarketShares(allRecords, 'gmv'), [allRecords]);
  const marketSharesQuantity = useMemo(() => computeOrdersAdsMarketShares(allRecords, 'quantity'), [allRecords]);
  const marketSharesClicks = useMemo(() => computeOrdersAdsMarketShares(allRecords, 'clicks'), [allRecords]);
  const marketRows = useMemo(() => computeOrdersAdsMarketRows(allRecords), [allRecords]);

  const marketSpuRecords = useMemo(
    () => (selectedMarket ? allRecords.filter((record) => record.国家 === selectedMarket) : allRecords),
    [allRecords, selectedMarket]
  );
  const marketSpuMovingRows = useMemo(
    () => computeOrdersAdsSpuMovingRows(marketSpuRecords, latestDate),
    [marketSpuRecords, latestDate]
  );

  const selectedSpu = filters.spus.length === 1 ? filters.spus[0] : null;
  const selectedTl = filters.tls.length === 1 ? filters.tls[0] : null;
  const activeDateIndex = Math.max(0, dates.indexOf(activeDate));
  const toggleSpu = (spu: string) => {
    setFilters((previous) => ({ ...previous, spus: previous.spus.length === 1 && previous.spus[0] === spu ? [] : [spu] }));
  };
  const toggleTl = (tl: string) => {
    setFilters((previous) => ({ ...previous, tls: previous.tls.length === 1 && previous.tls[0] === tl ? [] : [tl] }));
  };
  const toggleMarket = (market: string) => {
    setSelectedMarket((previous) => (previous === market ? null : market));
  };
  const resetFilters = () => {
    setFilters({ ...EMPTY_ORDERS_ADS_FILTERS });
    setSelectedDate(latestDate || null);
    setSelectedWeek(null);
    setSelectedMarket(null);
  };

  return (
    <div className="min-h-screen w-full px-5 lg:px-10 py-6 space-y-6">
      <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>总监订单 & 广告看板</span>
            <span aria-hidden="true">·</span>
            <Database className="w-3.5 h-3.5" />
            <span>{sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{isCustom ? '自定义数据已持久化' : '固定模拟数据'} · {updatedAt}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{activeSubBoardConfig.label}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">产品表现 × 新老SKU匹配 × TL · {activeSubBoardConfig.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">小看板</span>
            <select
              aria-label="切换订单广告小看板"
              value={activeSubBoard}
              onChange={(event) => setActiveSubBoard(event.target.value as SubBoardId)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              {SUB_BOARDS.map((board) => <option key={board.id} value={board.id}>{board.label}</option>)}
            </select>
          </label>
          {isCustom && (
            <button onClick={onResetData} className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-900 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />重置模拟数据
            </button>
          )}
          <button onClick={onOpenImport} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />批量导入
          </button>
        </div>
      </motion.header>

      {activeSubBoard === 'daily' ? (
        <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="overflow-x-auto erp-scroll pb-1">
        <div className="grid grid-cols-6 gap-4 min-w-[1420px]">
          {METRICS.map((metric) => (
            <React.Fragment key={metric}>
              <DailyMetricCard
                metric={metric}
                date={activeDate}
                yesterdayDate={yesterdayDate}
                today={todayPoint.metrics[metric]}
                yesterday={yesterdayPoint.metrics[metric]}
              />
              <DailyAreaChart metric={metric} data={dailySeries} selectedDate={activeDate} onSelectDate={setSelectedDate} />
            </React.Fragment>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="sticky top-20 z-30 bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">日期筛选</h2>
            <span className="text-[11px] text-slate-400">日维度 · 页面滚动时吸顶固定</span>
          </div>
          <button onClick={resetFilters} className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" />清除联动并回到最新日期</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_170px] gap-4 items-end">
          <label className="min-w-0">
            <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">监控日期</span>
            <div className="relative">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={activeDate}
                min={dates[0]}
                max={latestDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full h-9 pl-9 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              />
            </div>
          </label>
          <div className="min-w-0 pb-0.5">
            <div className="flex items-center justify-between gap-3 mb-2 text-[10px] font-medium text-slate-400">
              <span>拖动选择日期</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{formatOrdersAdsDate(activeDate)}</span>
            </div>
            <input
              type="range"
              aria-label="拖拽选择监控日期"
              min={0}
              max={Math.max(0, dates.length - 1)}
              step={1}
              value={activeDateIndex}
              disabled={dates.length === 0}
              onChange={(event) => setSelectedDate(dates[Number(event.target.value)] ?? null)}
              className="w-full h-1.5 accent-blue-500 cursor-ew-resize"
            />
            <div className="flex items-center justify-between gap-3 mt-1.5 font-mono text-[10px] text-slate-400 tabular-nums">
              <span>{dates[0] ?? '—'}</span>
              <span>{latestDate || '—'}</span>
            </div>
          </div>
          <div className="h-9 px-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">对比昨日</span>
            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{yesterdayDate ? formatOrdersAdsDate(yesterdayDate) : '—'}</span>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">当日上涨 SPU</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatOrdersAdsDate(activeDate)} · 点击SPU可联动全部组件，再次点击取消</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">较昨日增长</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {METRICS.map((metric) => (
            <SpuDeltaBarChart
              key={metric}
              title={`当日${metric === 'orders' ? '订单' : ORDERS_ADS_METRIC_META[metric].label}上涨SPU`}
              metric={metric}
              items={spuDeltas.map((row) => ({ spu: row.spu, value: metric === 'gmv' ? row.gmvDelta : metric === 'orders' ? row.ordersDelta : row.quantityDelta }))}
              direction="up"
              selectedSpu={selectedSpu}
              onSelectSpu={toggleSpu}
            />
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">当日下跌 SPU</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">按下跌绝对值升序排列，快速定位异常产品</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">较昨日下滑</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {METRICS.map((metric) => (
            <SpuDeltaBarChart
              key={metric}
              title={`当日${metric === 'orders' ? '订单' : ORDERS_ADS_METRIC_META[metric].label}下跌SPU`}
              metric={metric}
              items={spuDeltas.map((row) => ({ spu: row.spu, value: metric === 'gmv' ? row.gmvDelta : metric === 'orders' ? row.ordersDelta : row.quantityDelta }))}
              direction="down"
              selectedSpu={selectedSpu}
              onSelectSpu={toggleSpu}
            />
          ))}
        </div>
      </motion.section>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="space-y-6">
        <TlDailyTrendTable metric="quantity" rows={tlRows.quantity} date={activeDate} selectedTl={selectedTl} onSelectTl={toggleTl} />
        <TlDailyTrendTable metric="gmv" rows={tlRows.gmv} date={activeDate} selectedTl={selectedTl} onSelectTl={toggleTl} />
      </motion.div>
        </>
      ) : activeSubBoard === 'weekly' ? (
        <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="overflow-x-auto erp-scroll pb-1">
        <div className="grid grid-cols-6 gap-4 min-w-[1420px]">
          {METRICS.map((metric) => (
            <React.Fragment key={metric}>
              <DailyMetricCard
                metric={metric}
                date={activeWeekStart}
                yesterdayDate={previousWeekStart}
                today={currentWeekPoint.metrics[metric]}
                yesterday={previousWeekPoint.metrics[metric]}
                periodLabel="本周"
              />
              <DailyAreaChart metric={metric} data={weeklySeries} selectedDate={activeWeekStart} onSelectDate={setSelectedWeek} title={`${ORDERS_ADS_METRIC_META[metric].label} · 近12周趋势`} subtitle="周面积图与线性趋势" />
            </React.Fragment>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="sticky top-20 z-30 bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">周筛选器</h2>
            <span className="text-[11px] text-slate-400">周维度 · 页面滚动时吸顶固定</span>
          </div>
          <button onClick={resetFilters} className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" />清除联动并回到最新周</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_190px] gap-4 items-end">
          <label className="min-w-0">
            <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">监控周</span>
            <div className="relative">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={activeWeekStart}
                min={weekStarts[0]}
                max={latestWeekStart}
                onChange={(event) => setSelectedWeek(event.target.value)}
                className="w-full h-9 pl-9 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              />
            </div>
          </label>
          <div className="min-w-0 pb-0.5">
            <div className="flex items-center justify-between gap-3 mb-2 text-[10px] font-medium text-slate-400">
              <span>拖动选择周</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{activeWeekStart ? formatOrdersAdsDate(activeWeekStart) : '—'}</span>
            </div>
            <input
              type="range"
              aria-label="拖拽选择监控周"
              min={0}
              max={Math.max(0, weekStarts.length - 1)}
              step={1}
              value={activeWeekIndex}
              disabled={weekStarts.length === 0}
              onChange={(event) => setSelectedWeek(weekStarts[Number(event.target.value)] ?? null)}
              className="w-full h-1.5 accent-blue-500 cursor-ew-resize"
            />
            <div className="flex items-center justify-between gap-3 mt-1.5 font-mono text-[10px] text-slate-400 tabular-nums">
              <span>{weekStarts[0] ?? '—'}</span>
              <span>{latestWeekStart || '—'}</span>
            </div>
          </div>
          <div className="h-9 px-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">对比上周</span>
            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{previousWeekStart ? formatOrdersAdsDate(previousWeekStart) : '—'}</span>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">本周上涨 SPU</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeWeekStart ? formatOrdersAdsDate(activeWeekStart) : '—'} · 点击SPU可联动全部组件，再次点击取消</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">较上周增长</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {METRICS.map((metric) => (
            <SpuDeltaBarChart
              key={metric}
              title={`本周${metric === 'orders' ? '订单' : ORDERS_ADS_METRIC_META[metric].label}上涨SPU`}
              metric={metric}
              items={spuWeeklyDeltas.map((row) => ({ spu: row.spu, value: metric === 'gmv' ? row.gmvDelta : metric === 'orders' ? row.ordersDelta : row.quantityDelta }))}
              direction="up"
              selectedSpu={selectedSpu}
              onSelectSpu={toggleSpu}
            />
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">本周下跌 SPU</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">按下跌绝对值升序排列，快速定位异常产品</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">较上周下滑</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {METRICS.map((metric) => (
            <SpuDeltaBarChart
              key={metric}
              title={`本周${metric === 'orders' ? '订单' : ORDERS_ADS_METRIC_META[metric].label}下跌SPU`}
              metric={metric}
              items={spuWeeklyDeltas.map((row) => ({ spu: row.spu, value: metric === 'gmv' ? row.gmvDelta : metric === 'orders' ? row.ordersDelta : row.quantityDelta }))}
              direction="down"
              selectedSpu={selectedSpu}
              onSelectSpu={toggleSpu}
            />
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.22 }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">CTR、CVR、TCOS 趋势（周）</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">展示近12周核心广告投放比率变化</p>
          </div>
        </div>
        <div className="overflow-x-auto erp-scroll pb-1">
          <div className="grid grid-cols-3 gap-5 min-w-[1280px]">
            <WeeklyRatioChart ratio="ctr" data={weeklySeries} />
            <WeeklyRatioChart ratio="cvr" data={weeklySeries} />
            <WeeklyRatioChart ratio="tcos" data={weeklySeries} />
          </div>
        </div>
      </motion.section>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
        <SpuWeeklyMetricsTable rows={spuWeeklyRows} weekStart={activeWeekStart} selectedSpu={selectedSpu} onSelectSpu={toggleSpu} />
      </motion.div>
        </>
      ) : activeSubBoard === 'market' ? (
        <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="sticky top-20 z-30 bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">市场筛选器</h2>
            <span className="text-[11px] text-slate-400">市场维度 · 页面滚动时吸顶固定</span>
          </div>
          <button onClick={() => setSelectedMarket(null)} className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" />清除市场联动</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4 items-end">
          <label className="min-w-0">
            <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">选择市场</span>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedMarket ?? ''}
                onChange={(event) => setSelectedMarket(event.target.value || null)}
                className="w-full h-9 pl-9 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer appearance-none"
              >
                <option value="">全部市场</option>
                {marketOptions.map((market) => <option key={market} value={market}>{market}</option>)}
              </select>
            </div>
          </label>
          <div className="min-w-0 h-9 px-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">当前联动市场</span>
            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{selectedMarket ?? '全部市场'}</span>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">各市场占比分布</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">点击环形图或图例可联动高亮，再次点击取消</p>
          </div>
        </div>
        <div className="overflow-x-auto erp-scroll pb-1">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 min-w-[1180px]">
            <MarketDonutChart title="各市场 GMV 占比" subtitle="按销售额口径统计" metric="gmv" items={marketSharesGmv} selectedMarket={selectedMarket} onSelectMarket={toggleMarket} />
            <MarketDonutChart title="各市场销量占比" subtitle="按销量口径统计" metric="quantity" items={marketSharesQuantity} selectedMarket={selectedMarket} onSelectMarket={toggleMarket} />
            <MarketDonutChart title="各市场点击量占比" subtitle="按点击量口径统计" metric="clicks" items={marketSharesClicks} selectedMarket={selectedMarket} onSelectMarket={toggleMarket} />
          </div>
        </div>
      </motion.section>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <MarketSalesTable rows={marketRows} selectedMarket={selectedMarket} onSelectMarket={toggleMarket} />
      </motion.div>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">SPU动销监控</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatOrdersAdsDate(latestDate)} · {selectedMarket ?? '全部市场'} · 加权日销异动分析 · 点击SPU可联动高亮</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">最新日动销</span>
        </div>
        <SpuMovingTable rows={marketSpuMovingRows} selectedSpu={selectedSpu} onSelectSpu={toggleSpu} />
      </motion.section>
        </>
      ) : (
        <motion.section
          key={activeSubBoard}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] min-h-[420px] p-8 shadow-sm hover:shadow-lg hover:border-blue-500/30 flex flex-col items-center justify-center text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4"><CalendarDays className="w-6 h-6" /></div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{activeSubBoardConfig.label}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md">该小看板已加入导航，将在后续版本实现。当前版本已提供日维度、周维度与市场监控。</p>
          <button onClick={() => setActiveSubBoard('daily')} className="mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">返回日维度监控</button>
        </motion.section>
      )}
    </div>
  );
};
