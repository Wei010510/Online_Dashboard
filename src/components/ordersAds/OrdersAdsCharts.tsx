import React, { useId, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  OrdersAdsAlertLevel,
  OrdersAdsDailyPoint,
  OrdersAdsMetricKey,
  OrdersAdsSpuMovingRow,
  OrdersAdsSpuWeeklyRow,
  OrdersAdsTlTrendRow,
} from '../../types/ordersAds';
import { OrdersAdsMarketRow, OrdersAdsMarketShare } from '../../utils/ordersAdsEngine';
import { formatCurrency, formatNumber, formatPct } from '../../utils/biEngine';
import { formatOrdersAdsDate } from '../../utils/ordersAdsEngine';

export const ORDERS_ADS_METRIC_META: Record<OrdersAdsMetricKey, { label: string; shortLabel: string; color: string }> = {
  gmv: { label: 'GMV', shortLabel: 'GMV', color: '#3B82F6' },
  orders: { label: '订单量', shortLabel: '订单', color: '#8B5CF6' },
  quantity: { label: '销量', shortLabel: '销量', color: '#F59E0B' },
};

export function formatOrdersAdsMetric(metric: OrdersAdsMetricKey, value: number, compact = false): string {
  return metric === 'gmv' ? formatCurrency(value, compact) : formatNumber(value);
}

export const OrdersAdsPanel: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}> = ({ title, subtitle, children, action, compact = false }) => (
  <section className={`bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] ${compact ? 'p-4' : 'p-5'} shadow-sm hover:shadow-lg hover:border-blue-500/30`}>
    <div className={`flex flex-wrap items-start justify-between gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const DailyMetricCard: React.FC<{
  metric: OrdersAdsMetricKey;
  date: string;
  yesterdayDate: string;
  today: number;
  yesterday: number;
  periodLabel?: string;
}> = ({ metric, date, yesterdayDate, today, yesterday, periodLabel = '当日' }) => {
  const meta = ORDERS_ADS_METRIC_META[metric];
  const delta = today - yesterday;
  const momentum = yesterday === 0 ? (today === 0 ? 0 : null) : delta / Math.abs(yesterday);
  const positive = delta >= 0;
  const colorClass = positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const hoverBorder = metric === 'gmv'
    ? 'hover:border-blue-500/40'
    : metric === 'orders'
    ? 'hover:border-violet-500/40'
    : 'hover:border-amber-500/40';

  return (
    <section className={`bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg ${hoverBorder} flex flex-col justify-between min-h-[176px]`}>
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
          <span>{periodLabel}{meta.label}上涨</span>
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-mono tabular-nums">{formatOrdersAdsDate(date)}</div>
      </div>
      <div className={`font-mono text-2xl lg:text-[28px] font-bold tracking-tight tabular-nums mt-4 ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
        {delta > 0 ? '+' : ''}{formatOrdersAdsMetric(metric, delta)}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-[11px] font-medium">
        <span className={`inline-flex items-center gap-0.5 font-mono tabular-nums ${colorClass}`}>
          <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
          {momentum === null ? '—' : formatPct(momentum, true)}
        </span>
        <span className="text-slate-400">vs</span>
        <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">{formatOrdersAdsDate(yesterdayDate)}</span>
      </div>
    </section>
  );
};

export const DailyAreaChart: React.FC<{
  metric: OrdersAdsMetricKey;
  data: OrdersAdsDailyPoint[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  title?: string;
  subtitle?: string;
}> = ({ metric, data, selectedDate, onSelectDate, title, subtitle }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const meta = ORDERS_ADS_METRIC_META[metric];
  const width = 320;
  const height = 150;
  const pad = { top: 18, right: 10, bottom: 25, left: 10 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const values = data.map((point) => point.metrics[metric]);
  const maxValue = Math.max(...values, 1) * 1.12;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    x: pad.left + stepX * index,
    y: pad.top + plotH - (point.metrics[metric] / maxValue) * plotH,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(pad.top + plotH).toFixed(2)} L ${points[0].x.toFixed(2)} ${(pad.top + plotH).toFixed(2)} Z`
    : '';

  let trendPath = '';
  if (points.length >= 2) {
    const count = values.length;
    const meanX = (count - 1) / 2;
    const meanY = values.reduce((sum, value) => sum + value, 0) / count;
    const denominator = values.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
    const slope = denominator === 0 ? 0 : values.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0) / denominator;
    const intercept = meanY - slope * meanX;
    const toPoint = (index: number) => ({
      x: pad.left + stepX * index,
      y: pad.top + plotH - (Math.max(0, intercept + slope * index) / maxValue) * plotH,
    });
    const first = toPoint(0);
    const last = toPoint(count - 1);
    trendPath = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  }

  const activeIndex = hoveredIndex ?? data.findIndex((point) => point.date === selectedDate);
  const activePoint = activeIndex >= 0 ? data[activeIndex] : null;
  const activeCoordinate = activeIndex >= 0 ? points[activeIndex] : null;

  return (
    <section className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30 min-h-[176px]">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{title ?? `${meta.label} · 近30日趋势`}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle ?? '面积图与线性趋势'}</p>
        </div>
        {activePoint && (
          <div className="text-right shrink-0">
            <div className="font-mono text-[10px] text-slate-400 tabular-nums">{formatOrdersAdsDate(activePoint.date)}</div>
            <div className="font-mono text-xs font-bold tabular-nums" style={{ color: meta.color }}>{formatOrdersAdsMetric(metric, activePoint.metrics[metric], true)}</div>
          </div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[112px] overflow-visible cursor-crosshair"
        onMouseLeave={() => setHoveredIndex(null)}
        onMouseMove={(event) => {
          if (data.length === 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const svgX = ((event.clientX - rect.left) / rect.width) * width;
          const index = Math.max(0, Math.min(data.length - 1, Math.round((svgX - pad.left) / (stepX || 1))));
          setHoveredIndex(index);
        }}
        onClick={() => {
          if (activePoint) onSelectDate(activePoint.date);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.36" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && <path d={linePath} fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
        {trendPath && <path d={trendPath} fill="none" stroke={meta.color} strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="5 4" />}
        {activeCoordinate && (
          <g>
            <line x1={activeCoordinate.x} x2={activeCoordinate.x} y1={pad.top} y2={pad.top + plotH} stroke={meta.color} strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle cx={activeCoordinate.x} cy={activeCoordinate.y} r="4" fill={meta.color} stroke="white" strokeWidth="2" />
          </g>
        )}
        {data.length > 0 && (
          <>
            <text x={pad.left} y={height - 5} textAnchor="start" className="fill-slate-400 text-[9px] font-mono">{data[0].date.slice(5)}</text>
            <text x={width - pad.right} y={height - 5} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">{data[data.length - 1].date.slice(5)}</text>
          </>
        )}
      </svg>
    </section>
  );
};

export interface SpuBarItem {
  spu: string;
  value: number;
}

export const SpuDeltaBarChart: React.FC<{
  title: string;
  metric: OrdersAdsMetricKey;
  items: SpuBarItem[];
  direction: 'up' | 'down';
  selectedSpu: string | null;
  onSelectSpu: (spu: string) => void;
}> = ({ title, metric, items, direction, selectedSpu, onSelectSpu }) => {
  const [hoveredSpu, setHoveredSpu] = useState<string | null>(null);
  const sorted = [...items]
    .filter((item) => direction === 'up' ? item.value > 0 : item.value < 0)
    .map((item) => ({ ...item, displayValue: direction === 'down' ? Math.abs(item.value) : item.value }))
    .sort((a, b) => direction === 'up' ? b.displayValue - a.displayValue : a.displayValue - b.displayValue)
    .slice(0, 9);
  const maxValue = Math.max(...sorted.map((item) => item.displayValue), 1);
  const color = direction === 'up' ? '#10B981' : '#F43F5E';

  return (
    <OrdersAdsPanel
      compact
      title={title}
      subtitle={direction === 'up' ? '当日较昨日增加 · 按增加值降序' : '当日较昨日减少 · 按下跌绝对值升序'}
      action={selectedSpu ? <button onClick={() => onSelectSpu(selectedSpu)} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">取消联动 ({selectedSpu})</button> : <span className="font-mono text-[11px] text-slate-400">{sorted.length} 个SPU</span>}
    >
      {sorted.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-xs text-slate-400">当日暂无{direction === 'up' ? '上涨' : '下跌'}SPU</div>
      ) : (
        <div className="max-h-[240px] space-y-1 overflow-y-auto erp-scroll pr-1">
          {sorted.map((item) => {
            const active = hoveredSpu === item.spu || selectedSpu === item.spu;
            return (
              <button
                key={item.spu}
                onMouseEnter={() => setHoveredSpu(item.spu)}
                onMouseLeave={() => setHoveredSpu(null)}
                onClick={() => onSelectSpu(item.spu)}
                className={`w-full grid grid-cols-[52px_minmax(0,1fr)_86px] items-center gap-2 px-2 py-1 rounded-lg border text-left transition-colors ${selectedSpu === item.spu ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/40' : active ? 'bg-slate-50 dark:bg-slate-800/70 border-transparent' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.spu}</span>
                <span className="h-3.5 rounded-sm bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <span className="block h-full rounded-sm transition-all duration-300" style={{ width: `${Math.max(2, (item.displayValue / maxValue) * 100)}%`, backgroundColor: color, opacity: active ? 1 : 0.78 }} />
                </span>
                <span className="font-mono text-xs font-medium text-right tabular-nums" style={{ color }}>
                  {direction === 'up' ? '+' : '-'}{formatOrdersAdsMetric(metric, item.displayValue, true)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </OrdersAdsPanel>
  );
};

const MiniTrend: React.FC<{
  points: { date: string; value: number }[];
  metric: OrdersAdsMetricKey;
  tl: string;
}> = ({ points, metric, tl }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const meta = ORDERS_ADS_METRIC_META[metric];
  const width = 320;
  const height = 64;
  const maxValue = Math.max(...points.map((point) => point.value), 1) * 1.12;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => ({
    x: stepX * index,
    y: 6 + (1 - point.value / maxValue) * 50,
  }));
  const line = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = coordinates.length > 0 ? `${line} L ${width} 60 L 0 60 Z` : '';
  const active = hoveredIndex === null ? null : points[hoveredIndex];

  return (
    <div className="relative w-full min-w-[280px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-16 overflow-visible cursor-crosshair"
        onMouseLeave={() => setHoveredIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * width;
          setHoveredIndex(Math.max(0, Math.min(points.length - 1, Math.round(x / (stepX || 1)))));
        }}
        aria-label={`${tl}近30日${meta.label}趋势`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <line x1="0" x2={width} y1="60" y2="60" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {line && <path d={line} fill="none" stroke={meta.color} strokeWidth="1.6" strokeLinejoin="round" />}
        {hoveredIndex !== null && coordinates[hoveredIndex] && <circle cx={coordinates[hoveredIndex].x} cy={coordinates[hoveredIndex].y} r="3.5" fill={meta.color} stroke="white" strokeWidth="1.5" />}
      </svg>
      <div className="absolute right-0 top-0 rounded-md bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-300 tabular-nums pointer-events-none">
        {active ? `${active.date.slice(5)} · ${formatOrdersAdsMetric(metric, active.value, true)}` : `近30日 · ${formatOrdersAdsMetric(metric, points[points.length - 1]?.value ?? 0, true)}`}
      </div>
    </div>
  );
};

type WeeklyRatioKey = 'ctr' | 'cvr' | 'tcos';

const WEEKLY_RATIO_META: Record<WeeklyRatioKey, { label: string; color: string }> = {
  ctr: { label: 'CTR', color: '#3B82F6' },
  cvr: { label: 'CVR', color: '#10B981' },
  tcos: { label: 'TCOS', color: '#F59E0B' },
};

export const WeeklyRatioChart: React.FC<{
  ratio: WeeklyRatioKey;
  data: OrdersAdsDailyPoint[];
}> = ({ ratio, data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const meta = WEEKLY_RATIO_META[ratio];
  const width = 640;
  const height = 260;
  const pad = { top: 20, right: 18, bottom: 30, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const values = data.map((point) => point.metrics[ratio] ?? 0);
  const maxValue = Math.max(...values, 0.001) * 1.15;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    x: pad.left + stepX * index,
    y: pad.top + plotH - ((point.metrics[ratio] ?? 0) / maxValue) * plotH,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const activeIndex = hoveredIndex ?? data.length - 1;
  const activePoint = data[activeIndex];

  return (
    <section className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm hover:shadow-lg hover:border-blue-500/30 min-h-[360px] flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{meta.label} · 周趋势</h3>
          <p className="text-xs text-slate-400 mt-0.5">近12周比率变化</p>
        </div>
        {activePoint && <div className="font-mono text-base font-bold tabular-nums" style={{ color: meta.color }}>{activePoint.metrics[ratio] === null ? '—' : formatPct(activePoint.metrics[ratio] ?? 0)}</div>}
      </div>
      <div className="flex-1 min-h-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible cursor-crosshair"
        onMouseLeave={() => setHoveredIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * width;
          setHoveredIndex(Math.max(0, Math.min(data.length - 1, Math.round((x - pad.left) / (stepX || 1)))));
        }}
      >
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
        {linePath && <path d={linePath} fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((point, index) => (
          <circle key={data[index].date} cx={point.x} cy={point.y} r={index === activeIndex ? 4 : 2.6} fill={meta.color} stroke="white" strokeWidth="1.4" />
        ))}
        {activeIndex >= 0 && points[activeIndex] && (
          <text x={points[activeIndex].x} y={points[activeIndex].y - 11} textAnchor="middle" className="fill-slate-500 text-[11px] font-mono font-medium">
            {formatPct(activePoint?.metrics[ratio] ?? 0)}
          </text>
        )}
        {data.length > 0 && (
          <>
            <text x={pad.left} y={height - 6} textAnchor="start" className="fill-slate-400 text-[11px] font-mono">{data[0].date.slice(5)}</text>
            <text x={width - pad.right} y={height - 6} textAnchor="end" className="fill-slate-400 text-[11px] font-mono">{data[data.length - 1].date.slice(5)}</text>
          </>
        )}
        </svg>
      </div>
    </section>
  );
};

function RatioDeltaCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const positive = value >= 0;
  return (
    <span className={`font-mono text-xs font-semibold tabular-nums ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {value > 0 ? '+' : ''}{formatPct(value)}
    </span>
  );
}

export const SpuWeeklyMetricsTable: React.FC<{ rows: OrdersAdsSpuWeeklyRow[]; weekStart: string; selectedSpu: string | null; onSelectSpu: (spu: string) => void }> = ({ rows, weekStart, selectedSpu, onSelectSpu }) => {
  return (
    <OrdersAdsPanel
      title="CTR & CVR 下钻指标表"
      subtitle={`${formatOrdersAdsDate(weekStart)} 所在周 vs 上周 · 点击SPU可联动筛选`}
      action={selectedSpu ? <button onClick={() => onSelectSpu(selectedSpu)} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">取消联动 ({selectedSpu})</button> : <span className="font-mono text-[11px] text-slate-400">{rows.length} 个SPU</span>}
    >
      <div className="overflow-x-auto erp-scroll rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[1180px] border-collapse table-fixed text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-[90px] px-3 py-3 text-left">SPU</th>
              <th className="px-3 py-3 text-right">本周展示</th>
              <th className="px-3 py-3 text-right">上周展示</th>
              <th className="px-3 py-3 text-right">本周点击</th>
              <th className="px-3 py-3 text-right">上周点击</th>
              <th className="px-3 py-3 text-center">CTR涨幅</th>
              <th className="px-3 py-3 text-right">本周订单</th>
              <th className="px-3 py-3 text-right">上周订单</th>
              <th className="px-3 py-3 text-center">CVR涨幅</th>
              <th className="px-3 py-3 text-right">本周广告</th>
              <th className="px-3 py-3 text-right">上周广告</th>
              <th className="px-3 py-3 text-center">TCOS涨幅</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rows.map((row) => (
              <tr key={row.spu} onClick={() => onSelectSpu(row.spu)} className={`cursor-pointer transition-colors ${selectedSpu === row.spu ? 'bg-blue-50/80 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                <td className="px-3 py-2.5 text-left font-semibold text-slate-800 dark:text-slate-100">{row.spu}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatNumber(row.current.impressions)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-500 tabular-nums">{formatNumber(row.previous.impressions)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatNumber(row.current.clicks)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-500 tabular-nums">{formatNumber(row.previous.clicks)}</td>
                <td className="px-3 py-2.5 text-center"><RatioDeltaCell value={row.ctrDelta} /></td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatNumber(row.current.orders)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-500 tabular-nums">{formatNumber(row.previous.orders)}</td>
                <td className="px-3 py-2.5 text-center"><RatioDeltaCell value={row.cvrDelta} /></td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.current.adSpend)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-500 tabular-nums">{formatCurrency(row.previous.adSpend)}</td>
                <td className="px-3 py-2.5 text-center"><RatioDeltaCell value={row.tcosDelta} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="h-40 flex items-center justify-center text-xs text-slate-400">当前筛选条件下暂无SPU数据</div>}
      </div>
    </OrdersAdsPanel>
  );
};

export const TlDailyTrendTable: React.FC<{
  metric: OrdersAdsMetricKey;
  rows: OrdersAdsTlTrendRow[];
  date: string;
  selectedTl: string | null;
  onSelectTl: (tl: string) => void;
}> = ({ metric, rows, date, selectedTl, onSelectTl }) => {
  const meta = ORDERS_ADS_METRIC_META[metric];
  const displayLabel = metric === 'gmv' ? '销售额' : meta.label;
  const maxCumulative = Math.max(...rows.map((row) => row.cumulative), 1);

  return (
    <OrdersAdsPanel
      title={`TL 日${displayLabel}趋势追踪`}
      subtitle={`${formatOrdersAdsDate(date)} 较昨日 · 累计至当日 · 点击TL联动筛选`}
      action={selectedTl ? <button onClick={() => onSelectTl(selectedTl)} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">取消联动 ({selectedTl})</button> : <span className="font-mono text-[11px] text-slate-400">{rows.length} 个TL组</span>}
    >
      <div className="overflow-x-auto erp-scroll rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[900px] border-collapse table-fixed">
          <thead className="bg-slate-50 dark:bg-slate-900/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-[180px] px-4 py-3 text-left">TL</th>
              <th className="w-[170px] px-4 py-3 text-left">当日{displayLabel}环比</th>
              <th className="w-[190px] px-4 py-3 text-right">累计{displayLabel}</th>
              <th className="px-4 py-3 text-left">近30日{displayLabel}趋势</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rows.map((row) => {
              const positive = row.delta >= 0;
              const selected = selectedTl === row.tl;
              return (
                <tr
                  key={row.tl}
                  onClick={() => onSelectTl(row.tl)}
                  className={`cursor-pointer transition-colors ${selected ? 'bg-blue-50/80 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{row.tl}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>{row.momentum === null ? '—' : formatPct(row.momentum, true)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 tabular-nums">{row.delta > 0 ? '+' : ''}{formatOrdersAdsMetric(metric, row.delta, true)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative h-8 flex items-center justify-end overflow-hidden rounded-md">
                      <div className="absolute inset-y-1 right-0 rounded-sm opacity-10" style={{ width: `${Math.max(2, (row.cumulative / maxCumulative) * 100)}%`, backgroundColor: meta.color }} />
                      <span className="relative font-mono text-xs font-bold text-slate-800 dark:text-slate-100 tabular-nums px-2">{formatOrdersAdsMetric(metric, row.cumulative)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2"><MiniTrend points={row.trend} metric={metric} tl={row.tl} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="h-40 flex items-center justify-center text-xs text-slate-400">当前筛选条件下暂无TL数据</div>}
      </div>
    </OrdersAdsPanel>
  );
};

const MARKET_DONUT_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B', '#F97316'];

function formatMarketValue(metric: string, value: number): string {
  return metric === 'gmv' ? formatCurrency(value, true) : formatNumber(value);
}

export const MarketDonutChart: React.FC<{
  title: string;
  subtitle: string;
  metric: string;
  items: OrdersAdsMarketShare[];
  selectedMarket: string | null;
  onSelectMarket: (market: string) => void;
}> = ({ title, subtitle, metric, items, selectedMarket, onSelectMarket }) => {
  const [hoveredMarket, setHoveredMarket] = useState<string | null>(null);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const activeMarket = hoveredMarket ?? selectedMarket;
  const activeItem = activeMarket ? items.find((item) => item.market === activeMarket) ?? null : null;

  return (
    <OrdersAdsPanel
      title={title}
      subtitle={subtitle}
      action={selectedMarket ? <button onClick={() => onSelectMarket(selectedMarket)} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">取消联动 ({selectedMarket})</button> : <span className="font-mono text-[11px] text-slate-400">{items.length} 个市场</span>}
    >
      {items.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-slate-400">当前范围内暂无市场数据</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 overflow-visible">
              <circle cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeWidth="18" className="text-slate-100 dark:text-slate-800/70" />
              {items.map((item, index) => {
                const dashLength = (item.share || 0) * circumference;
                const segment = {
                  color: MARKET_DONUT_PALETTE[index % MARKET_DONUT_PALETTE.length],
                  dashArray: `${Math.max(0, dashLength - 2)} ${circumference}`,
                  dashOffset: -offset,
                  active: activeMarket === item.market,
                };
                offset += dashLength;
                const dimmed = activeMarket !== null && !segment.active;
                return (
                  <circle
                    key={item.market}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={segment.active ? 23 : 18}
                    strokeDasharray={segment.dashArray}
                    strokeDashoffset={segment.dashOffset}
                    className="cursor-pointer transition-all duration-150"
                    style={{ opacity: dimmed ? 0.35 : 1 }}
                    onMouseEnter={() => setHoveredMarket(item.market)}
                    onMouseLeave={() => setHoveredMarket(null)}
                    onClick={() => onSelectMarket(item.market)}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[90px]">{activeItem ? activeItem.market : '合计'}</div>
              <div className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{formatMarketValue(metric, activeItem ? activeItem.value : total)}</div>
              <div className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400 tabular-nums">{formatPct(activeItem ? activeItem.share : 1)}</div>
            </div>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            {items.map((item, index) => {
              const active = hoveredMarket === item.market || selectedMarket === item.market;
              return (
                <button
                  key={item.market}
                  onMouseEnter={() => setHoveredMarket(item.market)}
                  onMouseLeave={() => setHoveredMarket(null)}
                  onClick={() => onSelectMarket(item.market)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border ${selectedMarket === item.market ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/40' : active ? 'bg-slate-100 dark:bg-slate-800/90 border-transparent' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent'}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: MARKET_DONUT_PALETTE[index % MARKET_DONUT_PALETTE.length] }} />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{item.market}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
                    <span className="text-slate-600 dark:text-slate-300">{formatMarketValue(metric, item.value)}</span>
                    <span className="w-12 text-right font-semibold text-slate-900 dark:text-white">{formatPct(item.share)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </OrdersAdsPanel>
  );
};

function RatioCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  return <span className="font-mono text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatPct(value)}</span>;
}

export const MarketSalesTable: React.FC<{
  rows: OrdersAdsMarketRow[];
  selectedMarket: string | null;
  onSelectMarket: (market: string) => void;
}> = ({ rows, selectedMarket, onSelectMarket }) => {
  return (
    <OrdersAdsPanel
      title="各市场销售情况表"
      subtitle="点击市场可联动上方占比环形图"
      action={selectedMarket ? <button onClick={() => onSelectMarket(selectedMarket)} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">取消联动 ({selectedMarket})</button> : <span className="font-mono text-[11px] text-slate-400">{rows.length} 个市场</span>}
    >
      <div className="overflow-x-auto erp-scroll rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[1180px] border-collapse table-fixed text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-[90px] px-3 py-3 text-left">市场</th>
              <th className="px-3 py-3 text-right">净销售额</th>
              <th className="px-3 py-3 text-right">展示</th>
              <th className="px-3 py-3 text-right">点击</th>
              <th className="px-3 py-3 text-center">CTR</th>
              <th className="px-3 py-3 text-right">订单量</th>
              <th className="px-3 py-3 text-right">广告订单量</th>
              <th className="px-3 py-3 text-center">CVR</th>
              <th className="px-3 py-3 text-center">广告CVR</th>
              <th className="px-3 py-3 text-right">广告销售额</th>
              <th className="px-3 py-3 text-right">广告花费</th>
              <th className="px-3 py-3 text-center">ACOS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rows.map((row) => (
              <tr key={row.market} onClick={() => onSelectMarket(row.market)} className={`cursor-pointer transition-colors ${selectedMarket === row.market ? 'bg-blue-50/80 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                <td className="px-3 py-2.5 text-left font-semibold text-slate-800 dark:text-slate-100">{row.market}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.metrics.netSales)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatNumber(row.metrics.impressions)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatNumber(row.metrics.clicks)}</td>
                <td className="px-3 py-2.5 text-center"><RatioCell value={row.metrics.ctr} /></td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatNumber(row.metrics.orders)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatNumber(row.metrics.adOrders)}</td>
                <td className="px-3 py-2.5 text-center"><RatioCell value={row.metrics.cvr} /></td>
                <td className="px-3 py-2.5 text-center"><RatioCell value={row.metrics.adCvr} /></td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.metrics.adSales)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.metrics.adSpend)}</td>
                <td className="px-3 py-2.5 text-center"><RatioCell value={row.metrics.acos} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="h-40 flex items-center justify-center text-xs text-slate-400">当前筛选条件下暂无市场销售数据</div>}
      </div>
    </OrdersAdsPanel>
  );
};

const ALERT_STYLES: Record<string, string> = {
  高异动: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
  中异动: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  低异动: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30',
  正常: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
};

const DIRECTION_STYLES: Record<string, string> = {
  上涨: 'text-emerald-600 dark:text-emerald-400',
  下跌: 'text-rose-600 dark:text-rose-400',
  持平: 'text-slate-500 dark:text-slate-400',
};

function NumberCell({ value, decimals = 0, className = '' }: { value: number; decimals?: number; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{formatNumber(value, decimals)}</span>;
}

function GapRateCell({ value }: { value: number | null }) {
  if (value === null) return <span className="font-mono tabular-nums text-slate-400">0.00%</span>;
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`font-mono tabular-nums font-medium ${value > 0 ? 'text-emerald-600 dark:text-emerald-400' : value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
      {sign}{(value * 100).toFixed(2)}%
    </span>
  );
}

export const SpuMovingTable: React.FC<{
  rows: OrdersAdsSpuMovingRow[];
  selectedSpu: string | null;
  onSelectSpu: (spu: string) => void;
}> = ({ rows, selectedSpu, onSelectSpu }) => {
  const [alertFilter, setAlertFilter] = useState<OrdersAdsAlertLevel | 'all'>('all');
  const filteredRows = alertFilter === 'all' ? rows : rows.filter((row) => row.alert === alertFilter);
  const alertOptions: (OrdersAdsAlertLevel | 'all')[] = ['all', '高异动', '中异动', '低异动', '正常'];

  return (
    <OrdersAdsPanel
      title="SPU动销监控"
      subtitle="加权日销 = 前周日均×50% + 15日日均×30% + 月日均×20% · 按异动等级降序"
      action={selectedSpu ? <button onClick={() => onSelectSpu(selectedSpu)} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">取消联动 ({selectedSpu})</button> : <span className="font-mono text-[11px] text-slate-400">{filteredRows.length}/{rows.length} 个SPU</span>}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {alertOptions.map((opt) => {
          const label = opt === 'all' ? '全部' : opt;
          const count = opt === 'all' ? rows.length : rows.filter((r) => r.alert === opt).length;
          const active = alertFilter === opt;
          const dotStyle = opt === 'all' ? 'bg-slate-400' : opt === '正常' ? 'bg-emerald-500' : opt === '低异动' ? 'bg-yellow-500' : opt === '中异动' ? 'bg-amber-500' : 'bg-rose-500';
          return (
            <button
              key={opt}
              onClick={() => setAlertFilter(opt)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              <span className={`w-2 h-2 rounded-full ${active ? 'bg-white' : dotStyle}`} />
              {label}
              <span className={`font-mono ${active ? 'text-blue-100' : 'text-slate-400'}`}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="overflow-auto erp-scroll rounded-xl border border-slate-200 dark:border-slate-800 max-h-[520px]">
        <table className="w-full min-w-[980px] border-collapse table-fixed text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-[80px] px-3 py-3 text-left">SPU</th>
              <th className="w-[90px] px-3 py-3 text-center">预警</th>
              <th className="w-[80px] px-3 py-3 text-center">异动方向</th>
              <th className="px-3 py-3 text-right">当日销量</th>
              <th className="px-3 py-3 text-right">加权日销</th>
              <th className="px-3 py-3 text-right">加权日均销量差</th>
              <th className="px-3 py-3 text-right">加权销量差距率</th>
              <th className="px-3 py-3 text-right">异动强度分数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredRows.map((row) => (
              <tr key={row.spu} onClick={() => onSelectSpu(row.spu)} className={`cursor-pointer transition-colors ${selectedSpu === row.spu ? 'bg-blue-50/80 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                <td className="px-3 py-2.5 text-left font-semibold text-slate-800 dark:text-slate-100">{row.spu}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${ALERT_STYLES[row.alert] ?? ALERT_STYLES['正常']}`}>{row.alert}</span>
                </td>
                <td className={`px-3 py-2.5 text-center font-semibold ${DIRECTION_STYLES[row.direction] ?? ''}`}>{row.direction}</td>
                <td className="px-3 py-2.5 text-right"><NumberCell value={row.todayQuantity} /></td>
                <td className="px-3 py-2.5 text-right"><NumberCell value={row.weightedDaily} decimals={2} /></td>
                <td className="px-3 py-2.5 text-right">
                  <NumberCell
                    value={row.weightedDelta}
                    decimals={2}
                    className={row.weightedDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : row.weightedDelta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}
                  />
                </td>
                <td className="px-3 py-2.5 text-right"><GapRateCell value={row.weightedGapRate} /></td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-mono tabular-nums font-semibold ${row.intensityScore > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{row.intensityScore.toFixed(2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && <div className="h-40 flex items-center justify-center text-xs text-slate-400">当前筛选条件下暂无SPU动销数据</div>}
      </div>
    </OrdersAdsPanel>
  );
};
