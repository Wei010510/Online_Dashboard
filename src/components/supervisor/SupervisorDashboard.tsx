import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Database, Filter, RotateCcw, Search, Upload } from 'lucide-react';
import { formatCurrency, formatNumber, formatPct } from '../../utils/biEngine';
import {
  computeSupervisorMonthly,
  computeSupervisorOpMetrics,
  computeSupervisorOpSpuMetrics,
  computeSupervisorShares,
  computeSupervisorSummary,
  filterSupervisorRecords,
  SUPERVISOR_COST_FIELDS,
} from '../../utils/supervisorEngine';
import {
  EMPTY_SUPERVISOR_FILTERS,
  SupervisorDimensionFilter,
  SupervisorFilters,
  SupervisorRecord,
} from '../../types/supervisor';
import {
  SupervisorDonutChart,
  SupervisorGmvDualBarChart,
  SupervisorMoMChart,
  SupervisorOpBars,
  SupervisorTrendChart,
} from './SupervisorCharts';

interface SupervisorDashboardProps {
  allRecords: SupervisorRecord[];
  sourceLabel: string;
  updatedAt: string;
  isCustom: boolean;
  onOpenImport: () => void;
}

const FilterSelect: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="min-w-0">
    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
    >
      <option value="">全部{label}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
);

const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, subtitle, children, action }) => (
  <section className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  allRecords,
  sourceLabel,
  updatedAt,
  isCustom,
  onOpenImport,
}) => {
  const [filters, setFilters] = useState<SupervisorFilters>({ ...EMPTY_SUPERVISOR_FILTERS });
  const [monthDonutYear, setMonthDonutYear] = useState<number | null>(null);

  const options = useMemo(() => {
    const unique = (values: (string | number)[]) => Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b), 'zh-CN', { numeric: true }));
    return {
      years: unique(allRecords.map((record) => record.年)) as number[],
      months: unique(allRecords.map((record) => record.月)) as number[],
      pms: unique(allRecords.map((record) => record.PM)) as string[],
      productLines: unique(allRecords.map((record) => record.产品线)) as string[],
      markets: unique(allRecords.map((record) => record.市场)) as string[],
      periods: unique(allRecords.map((record) => record.周期)) as string[],
      ops: unique(allRecords.map((record) => record.OP)) as string[],
      spus: unique(allRecords.map((record) => record.SPU)) as string[],
      skus: unique(allRecords.map((record) => record.修正SKU)) as string[],
    };
  }, [allRecords]);

  const activeMonthDonutYear = monthDonutYear && options.years.includes(monthDonutYear)
    ? monthDonutYear
    : options.years[options.years.length - 1] ?? 2025;
  const filteredRecords = useMemo(() => filterSupervisorRecords(allRecords, filters), [allRecords, filters]);
  const comparisonRecords = useMemo(
    () => filterSupervisorRecords(allRecords, { ...filters, years: [], months: [], periods: [] }),
    [allRecords, filters]
  );
  const summary = useMemo(() => computeSupervisorSummary(filteredRecords), [filteredRecords]);
  const monthly = useMemo(() => computeSupervisorMonthly(filteredRecords, comparisonRecords), [filteredRecords, comparisonRecords]);
  const opMetrics = useMemo(() => computeSupervisorOpMetrics(filteredRecords), [filteredRecords]);
  const opSpuMetrics = useMemo(() => computeSupervisorOpSpuMetrics(filteredRecords), [filteredRecords]);
  const opQuantityShares = useMemo(() => computeSupervisorShares(filteredRecords, 'OP', '销售数量'), [filteredRecords]);
  const opGmvShares = useMemo(() => computeSupervisorShares(filteredRecords, 'OP', '销售额'), [filteredRecords]);
  const monthDonutRecords = useMemo(
    () => filterSupervisorRecords(allRecords, { ...filters, years: [activeMonthDonutYear], months: [], periods: [] }),
    [allRecords, filters, activeMonthDonutYear]
  );
  const monthQuantityShares = useMemo(() => computeSupervisorShares(monthDonutRecords, '年月', '销售数量'), [monthDonutRecords]);
  const monthGmvShares = useMemo(() => computeSupervisorShares(monthDonutRecords, '年月', '销售额'), [monthDonutRecords]);

  const selectedOp = filters.ops.length === 1 ? filters.ops[0] : null;
  const selectedSpu = filters.spus.length === 1 ? filters.spus[0] : null;
  const selectedYearMonth = filters.years.length === 1 && filters.months.length === 1
    ? `${filters.years[0]}-${String(filters.months[0]).padStart(2, '0')}`
    : filters.periods.length === 1 ? filters.periods[0] : null;
  const scopeLabel = selectedYearMonth ?? (filters.years.length === 1 ? `${filters.years[0]}年 · 全部月份` : '全部年月');
  const activeFilterCount = [...filters.years, ...filters.months, ...filters.pms, ...filters.productLines, ...filters.markets, ...filters.periods, ...filters.ops, ...filters.spus, ...filters.skus].length + (filters.search.trim() ? 1 : 0);

  const setFilterValue = (key: SupervisorDimensionFilter, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value ? [key === 'years' || key === 'months' ? Number(value) : value] : [],
    }));
  };

  const toggleOp = (op: string) => {
    setFilters((previous) => ({ ...previous, ops: previous.ops.length === 1 && previous.ops[0] === op ? [] : [op] }));
  };

  const toggleYearMonth = (yearMonth: string) => {
    setFilters((previous) => {
      const current = previous.years.length === 1 && previous.months.length === 1
        ? `${previous.years[0]}-${String(previous.months[0]).padStart(2, '0')}`
        : previous.periods.length === 1 ? previous.periods[0] : null;
      if (current === yearMonth) return { ...previous, years: [], months: [], periods: [] };
      const [year, month] = yearMonth.split('-').map(Number);
      return { ...previous, years: [year], months: [month], periods: [] };
    });
  };

  const toggleOpSpu = (op: string, spu: string) => {
    setFilters((previous) => {
      const active = previous.ops.length === 1 && previous.ops[0] === op && previous.spus.length === 1 && previous.spus[0] === spu;
      return { ...previous, ops: active ? [] : [op], spus: active ? [] : [spu] };
    });
  };

  const resetFilters = () => setFilters({ ...EMPTY_SUPERVISOR_FILTERS });

  const costItems = [
    { key: 'purchase', label: '采购成本', amount: summary.purchaseCost },
    { key: 'firstLeg', label: '头程成本', amount: summary.firstLegCost },
    { key: 'lastLeg', label: '尾程运费', amount: summary.lastLegCost },
    { key: 'platform', label: '总平台费', amount: summary.platformFee },
    { key: 'labor', label: '人工成本', amount: summary.laborCost },
    { key: 'warehouse', label: '仓租', amount: summary.warehouseRent },
    { key: 'ad', label: '广告费 (Tcos)', amount: summary.adCost },
    { key: 'afterSales', label: '售后费用', amount: summary.afterSalesCost },
    { key: 'direct', label: '直接调整费', amount: summary.directAdjustment },
    { key: 'indirect', label: '间接调整费', amount: summary.indirectAdjustment },
  ].map((item) => ({ ...item, ratioToGmv: summary.gmv === 0 ? 0 : item.amount / summary.gmv }));

  const stringOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

  return (
    <div className="min-h-screen w-full px-5 lg:px-10 py-6 space-y-6">
      <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>主管经营看板</span>
            <span aria-hidden="true">·</span>
            <Database className="w-3.5 h-3.5" />
            <span>{sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{isCustom ? '自定义数据已持久化' : '固定模拟数据'} · {updatedAt}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">主管经营数据监控看板</h1>
        </div>
        <button onClick={onOpenImport} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start lg:self-auto"><Upload className="w-3.5 h-3.5" />批量导入</button>
      </motion.header>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200"><Filter className="w-4 h-4 text-blue-500" />统一筛选器<span className="font-normal text-slate-400">所有组件实时联动</span>{activeFilterCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px]">已选 {activeFilterCount}</span>}</div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <label className="relative flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={filters.search} onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))} placeholder="模糊搜索 OP / SKU / SPU / PM…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </label>
            <button onClick={resetFilters} className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors"><RotateCcw className="w-3.5 h-3.5" />重置</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9 gap-3">
          <FilterSelect label="年" value={filters.years[0]?.toString() ?? ''} options={options.years.map((year) => ({ value: String(year), label: `${year}年` }))} onChange={(value) => setFilterValue('years', value)} />
          <FilterSelect label="月" value={filters.months[0]?.toString() ?? ''} options={options.months.map((month) => ({ value: String(month), label: `${month}月` }))} onChange={(value) => setFilterValue('months', value)} />
          <FilterSelect label="PM" value={filters.pms[0] ?? ''} options={stringOptions(options.pms)} onChange={(value) => setFilterValue('pms', value)} />
          <FilterSelect label="产品线" value={filters.productLines[0] ?? ''} options={stringOptions(options.productLines)} onChange={(value) => setFilterValue('productLines', value)} />
          <FilterSelect label="市场" value={filters.markets[0] ?? ''} options={stringOptions(options.markets)} onChange={(value) => setFilterValue('markets', value)} />
          <FilterSelect label="周期" value={filters.periods[0] ?? ''} options={stringOptions(options.periods)} onChange={(value) => setFilterValue('periods', value)} />
          <FilterSelect label="OP" value={filters.ops[0] ?? ''} options={stringOptions(options.ops)} onChange={(value) => setFilterValue('ops', value)} />
          <FilterSelect label="SPU" value={filters.spus[0] ?? ''} options={stringOptions(options.spus)} onChange={(value) => setFilterValue('spus', value)} />
          <FilterSelect label="SKU" value={filters.skus[0] ?? ''} options={stringOptions(options.skus)} onChange={(value) => setFilterValue('skus', value)} />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
            <div className="text-xs text-slate-500 dark:text-slate-400">统计年份 · 周期</div>
            <div className="mt-2 font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums truncate">{scopeLabel}</div>
            <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">在岗运营人数: {summary.opCount} 人</div>
          </div>

          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
            <div className="text-xs text-slate-500 dark:text-slate-400">GMV (总销售额)</div>
            <div className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(summary.gmv, true)}</div>
            <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">销售额人效: {formatCurrency(summary.salesEfficiency, true)}</div>
          </div>

          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-emerald-500/30">
            <div className="text-xs text-slate-500 dark:text-slate-400">利润额 (净利润)</div>
            <div className="mt-2 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(summary.profit, true)}</div>
            <div className="mt-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">利润率: {formatPct(summary.profitRate)} · 人效 {formatCurrency(summary.profitEfficiency, true)}</div>
          </div>

          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
            <div className="text-xs text-slate-500 dark:text-slate-400">总成本</div>
            <div className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(summary.totalCost, true)}</div>
            <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">占GMV比: {formatPct(summary.gmv === 0 ? 0 : summary.totalCost / summary.gmv)}</div>
          </div>

          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30">
            <div className="text-xs text-slate-500 dark:text-slate-400">销售数量</div>
            <div className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatNumber(summary.quantity)}</div>
            <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">客单价 (AOV): {formatCurrency(summary.aov)}</div>
          </div>

          <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-amber-500/30">
            <div className="text-xs text-slate-500 dark:text-slate-400">广告费 & Tcos</div>
            <div className="mt-2 font-mono text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(summary.adCost, true)}</div>
            <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">Tcos (广告占比): {formatPct(summary.adRatio)}</div>
          </div>
        </div>

        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">经营数据汇总 · 全口径成本结构与 GMV 占比</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">涵盖采购、头尾程物流、平台费、人工、仓租、售后及直/间接调整费（占比 = 成本项 ÷ GMV）</p>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">总成本合计: {formatCurrency(summary.totalCost)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {costItems.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-100 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-3 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{item.label}</span>
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{formatPct(item.ratioToGmv)}</span>
                </div>
                <div className="mt-2 font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(item.amount, true)}</div>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500/80" style={{ width: `${Math.min(100, item.ratioToGmv * 240)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <Panel title="每月成本占比表格" subtitle="年、月为行维度 · 各成本项汇总后除以当月 GMV · 点击行联动月份" action={<span className="text-[11px] text-slate-400">10 项成本 / GMV</span>}>
        <div className="overflow-auto erp-scroll max-h-[420px]">
          <table className="w-full min-w-[1120px] border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900"><tr className="text-slate-500 dark:text-slate-400"><th className="px-3 py-2.5 text-left font-semibold">年</th><th className="px-3 py-2.5 text-left font-semibold">月</th>{SUPERVISOR_COST_FIELDS.map((cost) => <th key={cost.key} className="px-3 py-2.5 text-right font-semibold">{cost.label}</th>)}<th className="px-3 py-2.5 text-right font-semibold">当月GMV</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthly.map((row) => <tr key={row.yearMonth} onClick={() => toggleYearMonth(row.yearMonth)} className={`cursor-pointer transition-colors ${selectedYearMonth === row.yearMonth ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}><td className="px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">{row.year}</td><td className="px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">{row.month}月</td>{SUPERVISOR_COST_FIELDS.map((cost) => <td key={cost.key} title={`${row.yearMonth} ${cost.key}：${formatCurrency(row.costs[cost.key])} · ${formatPct(row.costRatios[cost.key])}`} className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">{formatPct(row.costRatios[cost.key])}</td>)}<td className="px-3 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400">{formatCurrency(row.gmv, true)}</td></tr>)}
            </tbody>
          </table>
          {monthly.length === 0 && <div className="h-32 flex items-center justify-center text-slate-400 text-xs">暂无成本数据</div>}
        </div>
      </Panel>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-x-auto erp-scroll pb-2"
      >
        <div className="grid grid-cols-4 gap-6 min-w-[1560px]">
          <SupervisorDonutChart title="各 OP · 销量占比（环形图）" subtitle="悬停查看明细，点击任意 OP 切片或图例即可联动筛选" items={opQuantityShares} valueType="number" selectedKey={selectedOp} onSelect={toggleOp} scopeLabel={scopeLabel} />
          <SupervisorDonutChart title="各 OP · GMV 占比（环形图）" subtitle="悬停查看明细，点击任意 OP 切片或图例即可联动筛选" items={opGmvShares} valueType="currency" selectedKey={selectedOp} onSelect={toggleOp} scopeLabel={scopeLabel} />
          <SupervisorDonutChart title="各月份 · 销量占比（环形图）" subtitle="独立选择年份，仅展示该年 1–12 月；点击月份联动筛选" items={monthQuantityShares} valueType="number" selectedKey={selectedYearMonth} onSelect={toggleYearMonth} scopeLabel={`${activeMonthDonutYear}年`} yearOptions={options.years} selectedYear={activeMonthDonutYear} onYearChange={setMonthDonutYear} />
          <SupervisorDonutChart title="各月份 · GMV 占比（环形图）" subtitle="独立选择年份，仅展示该年 1–12 月；点击月份联动筛选" items={monthGmvShares} valueType="currency" selectedKey={selectedYearMonth} onSelect={toggleYearMonth} scopeLabel={`${activeMonthDonutYear}年`} yearOptions={options.years} selectedYear={activeMonthDonutYear} onYearChange={setMonthDonutYear} />
        </div>
      </motion.div>

      <SupervisorOpBars data={opMetrics} selectedOp={selectedOp} onSelectOp={toggleOp} scopeLabel={scopeLabel} />

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
        <SupervisorMoMChart data={monthly} metric="gmv" selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />
        <SupervisorMoMChart data={monthly} metric="profit" selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />
      </div>

      <SupervisorGmvDualBarChart data={monthly} selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
        <SupervisorTrendChart data={monthly} metric="quantity" selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />
        <SupervisorTrendChart data={monthly} metric="profitRate" selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />
        <SupervisorTrendChart data={monthly} metric="aov" selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />
        <SupervisorTrendChart data={monthly} metric="adRatio" selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />
        <SupervisorTrendChart data={monthly} metric="afterSalesRatio" selectedYearMonth={selectedYearMonth} onSelectYearMonth={toggleYearMonth} />
      </div>

      <Panel title="OP – SPU 趋势追踪图" subtitle="修正 SKU 前 3 位生成 SPU · 聚合经营指标 · 点击行联动 OP 与 SPU" action={<span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><CalendarDays className="w-3.5 h-3.5" />{scopeLabel} · {opSpuMetrics.length} 组</span>}>
        <div className="overflow-auto erp-scroll max-h-[620px]">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900"><tr className="text-[11px] text-slate-500 dark:text-slate-400"><th className="px-3 py-3 text-left font-semibold w-14">序号</th><th className="px-3 py-3 text-left font-semibold">OP</th><th className="px-3 py-3 text-left font-semibold">SPU</th>{['GMV', '总成本', '利润额', '利润率', '广告%', '售后%'].map((label) => <th key={label} className="px-3 py-3 text-right font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {opSpuMetrics.map((row, index) => {
                const selected = selectedOp === row.op && selectedSpu === row.spu;
                const pills = [
                  { value: formatCurrency(row.gmv, true), raw: formatCurrency(row.gmv), className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
                  { value: formatCurrency(row.totalCost, true), raw: formatCurrency(row.totalCost), className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
                  { value: formatCurrency(row.profit, true), raw: formatCurrency(row.profit), className: row.profit >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-50 text-rose-700' },
                  { value: formatPct(row.profitRate), raw: formatPct(row.profitRate), className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
                  { value: formatPct(row.adRatio), raw: `${formatCurrency(row.adCost)} · ${formatPct(row.adRatio)}`, className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
                  { value: formatPct(row.afterSalesRatio), raw: `${formatCurrency(row.afterSalesCost)} · ${formatPct(row.afterSalesRatio)}`, className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
                ];
                return <tr key={`${row.op}-${row.spu}`} onClick={() => toggleOpSpu(row.op, row.spu)} className={`cursor-pointer transition-colors ${selected ? 'bg-blue-50/80 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}><td className="px-3 py-3"><span className={`inline-flex w-7 h-7 rounded-full items-center justify-center font-mono text-[11px] ${index < 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{index + 1}</span></td><td className="px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">{row.op}</td><td className="px-3 py-3"><span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{row.spu}</span></td>{pills.map((pill, pillIndex) => <td key={pillIndex} className="px-3 py-3 text-right"><span title={pill.raw} className={`inline-flex min-w-[82px] justify-end px-3 py-1.5 rounded-xl font-mono text-[11px] font-semibold tabular-nums ${pill.className}`}>{pill.value}</span></td>)}</tr>;
              })}
            </tbody>
          </table>
          {opSpuMetrics.length === 0 && <div className="h-32 flex items-center justify-center text-slate-400 text-xs">当前筛选条件下暂无 OP-SPU 数据</div>}
        </div>
      </Panel>

      <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-3">主管数据独立存储 · 刷新网页保留导入结果 · 重置筛选不会清除数据</footer>
    </div>
  );
};
