import React, { useMemo, useState } from 'react';
import { formatCurrency, formatNumber, formatPct } from '../../utils/biEngine';
import {
  SupervisorMonthlyRow,
  SupervisorOpMetrics,
  SupervisorShareItem,
} from '../../types/supervisor';

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

const compactNumber = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return formatNumber(value);
};

const ChartCard: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, action, className = '' }) => (
  <section className={`bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30 relative ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyChart = () => (
  <div className="h-52 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">当前筛选条件下暂无数据</div>
);

const SelectionButton: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <button onClick={onClear} className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
    取消联动 ({label})
  </button>
);

interface DonutProps {
  title: string;
  subtitle: string;
  items: SupervisorShareItem[];
  valueType: 'currency' | 'number';
  selectedKey: string | null;
  onSelect: (key: string) => void;
  scopeLabel: string;
  yearOptions?: number[];
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}

export const SupervisorDonutChart: React.FC<DonutProps> = ({
  title,
  subtitle,
  items,
  valueType,
  selectedKey,
  onSelect,
  scopeLabel,
  yearOptions,
  selectedYear,
  onYearChange,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = useMemo(() => items.reduce((sum, item) => sum + Math.max(0, item.value), 0), [items]);
  const segments = useMemo(() => {
    const radius = 68;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return items.map((item, index) => {
      const value = Math.max(0, item.value);
      const share = total === 0 ? 0 : value / total;
      const dashLength = share * circumference;
      const segment = {
        ...item,
        value,
        share,
        color: PALETTE[index % PALETTE.length],
        dashArray: `${Math.max(0, dashLength - 2)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += dashLength;
      return segment;
    });
  }, [items, total]);
  const active = hoveredIndex !== null
    ? segments[hoveredIndex]
    : segments.find((segment) => segment.key === selectedKey) ?? null;
  const formatValue = (value: number) => valueType === 'currency' ? formatCurrency(value, true) : compactNumber(value);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {yearOptions && selectedYear !== undefined && onYearChange && (
            <select
              aria-label={`${title}年份筛选`}
              value={selectedYear}
              onChange={(event) => onYearChange(Number(event.target.value))}
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}年</option>)}
            </select>
          )}
          {selectedKey && <SelectionButton label={selectedKey} onClear={() => onSelect(selectedKey)} />}
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {items.length} {title.includes('月份') ? '个月份' : '个OP'}
          </span>
        </div>
      }
    >
      {items.length === 0 || total === 0 ? <EmptyChart /> : (
        <>
          <div className={`flex items-center gap-6 ${title.includes('OP') ? 'flex-col' : 'flex-col sm:flex-row'}`}>
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 overflow-visible">
                <circle cx="90" cy="90" r="68" fill="none" stroke="currentColor" strokeWidth="20" className="text-slate-100 dark:text-slate-800/70" />
                {segments.map((segment, index) => {
                  const isHovered = hoveredIndex === index;
                  const isSelected = selectedKey === segment.key;
                  const dimmed = (hoveredIndex !== null && !isHovered) || (hoveredIndex === null && selectedKey !== null && !isSelected);
                  return (
                    <circle
                      key={segment.key}
                      cx="90"
                      cy="90"
                      r="68"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={isHovered || isSelected ? 25 : 20}
                      strokeDasharray={segment.dashArray}
                      strokeDashoffset={segment.dashOffset}
                      className="transition-all duration-150 cursor-pointer"
                      style={{ opacity: dimmed ? 0.32 : 1 }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => onSelect(segment.key)}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[96px]">{active?.label ?? (valueType === 'currency' ? '总 GMV' : '总销量')}</div>
                <div className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{formatValue(active?.value ?? total)}</div>
                <div className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400 tabular-nums">{active ? formatPct(active.share) : '100.0%'}</div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2 max-h-64 overflow-y-auto erp-scroll pr-1">
              {segments.map((segment, index) => {
                const isHovered = hoveredIndex === index;
                const isSelected = selectedKey === segment.key;
                return (
                  <div
                    key={segment.key}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onSelect(segment.key)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/40'
                        : isHovered
                        ? 'bg-slate-100 dark:bg-slate-800/90 border-transparent'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: segment.color }} />
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{segment.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
                      <span className="text-slate-600 dark:text-slate-300">{formatValue(segment.value)}</span>
                      <span className="w-12 text-right font-semibold text-slate-900 dark:text-white">{formatPct(segment.share)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {active && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">{active.label} · {scopeLabel}</span>
              <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                <span>{valueType === 'currency' ? 'GMV' : '销量'}: {valueType === 'currency' ? formatCurrency(active.value) : formatNumber(active.value)}</span>
                <span>占比: {formatPct(active.share)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
};

const OP_METRICS: {
  key: keyof Pick<SupervisorOpMetrics, 'quantity' | 'gmv' | 'aov' | 'profit' | 'profitRate' | 'adCost' | 'adRatio' | 'afterSalesCost' | 'afterSalesRatio'>;
  label: string;
  type: 'number' | 'currency' | 'percent';
}[] = [
  { key: 'quantity', label: '销量', type: 'number' },
  { key: 'gmv', label: 'GMV', type: 'currency' },
  { key: 'aov', label: '客单价(均值)', type: 'currency' },
  { key: 'profit', label: '利润额', type: 'currency' },
  { key: 'profitRate', label: '利润率%', type: 'percent' },
  { key: 'adCost', label: '广告费', type: 'currency' },
  { key: 'adRatio', label: '广告%', type: 'percent' },
  { key: 'afterSalesCost', label: '售后', type: 'currency' },
  { key: 'afterSalesRatio', label: '售后%', type: 'percent' },
];

const formatOpValue = (value: number, type: 'number' | 'currency' | 'percent') => {
  if (type === 'percent') return formatPct(value);
  if (type === 'currency') return formatCurrency(value, true);
  return compactNumber(value);
};

export const SupervisorOpBars: React.FC<{
  data: SupervisorOpMetrics[];
  selectedOp: string | null;
  onSelectOp: (op: string) => void;
  scopeLabel: string;
}> = ({ data, selectedOp, onSelectOp, scopeLabel }) => {
  const [hovered, setHovered] = useState<{ op: string; metric: string; value: string } | null>(null);
  const maxima = OP_METRICS.map((metric) => Math.max(1, ...data.map((row) => Math.abs(row[metric.key]))));

  return (
    <ChartCard
      title="各 OP 数据明细"
      subtitle="销量、GMV、客单价、利润与费用九指标 · 每列独立横轴"
      action={selectedOp ? <SelectionButton label={selectedOp} onClear={() => onSelectOp(selectedOp)} /> : <span className="text-[11px] text-slate-400">点击任意条形联动</span>}
    >
      {data.length === 0 ? <EmptyChart /> : (
        <div className="overflow-x-auto erp-scroll">
          <div className="min-w-[1120px]">
            <div className="grid grid-cols-[108px_repeat(9,minmax(100px,1fr))] gap-x-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400">OP</div>
              {OP_METRICS.map((metric) => <div key={metric.key} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center">{metric.label}</div>)}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {data.map((row) => (
                <div key={row.op} className={`grid grid-cols-[108px_repeat(9,minmax(100px,1fr))] gap-x-3 items-center py-2.5 transition-colors ${selectedOp === row.op ? 'bg-blue-50/70 dark:bg-blue-500/10' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'}`}>
                  <button onClick={() => onSelectOp(row.op)} className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate text-left px-1 hover:text-blue-600">{row.op}</button>
                  {OP_METRICS.map((metric, metricIndex) => {
                    const value = row[metric.key];
                    const width = Math.max(2, Math.abs(value) / maxima[metricIndex] * 100);
                    const negative = value < 0;
                    return (
                      <button
                        key={metric.key}
                        onClick={() => onSelectOp(row.op)}
                        onMouseEnter={() => setHovered({ op: row.op, metric: metric.label, value: formatOpValue(value, metric.type) })}
                        onMouseLeave={() => setHovered(null)}
                        className="group relative h-7 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="relative flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <span
                            className={`absolute inset-y-0 left-0 rounded-full transition-all group-hover:brightness-110 ${negative ? 'bg-rose-500' : metric.type === 'percent' ? 'bg-violet-500' : 'bg-blue-500'}`}
                            style={{ width: `${width}%`, opacity: selectedOp && selectedOp !== row.op ? 0.25 : 0.9 }}
                          />
                        </span>
                        <span className={`w-12 text-right font-mono text-[9px] tabular-nums ${negative ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>{formatOpValue(value, metric.type)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="sticky left-0 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 min-h-6 text-[11px] text-slate-500 dark:text-slate-400">
            {hovered ? <><span className="font-semibold text-slate-800 dark:text-slate-200">{hovered.op}</span><span className="mx-2">·</span>{scopeLabel}<span className="mx-2">·</span>{hovered.metric}<span className="float-right font-mono font-semibold text-blue-600 dark:text-blue-400">{hovered.value}</span></> : '悬停条形查看 OP、所属周期、指标及绝对值'}
          </div>
        </div>
      )}
    </ChartCard>
  );
};

interface MonthChartProps {
  data: SupervisorMonthlyRow[];
  selectedYearMonth: string | null;
  onSelectYearMonth: (yearMonth: string) => void;
}

export const SupervisorMoMChart: React.FC<MonthChartProps & {
  metric: 'gmv' | 'profit';
}> = ({ data, selectedYearMonth, onSelectYearMonth, metric }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const isGmv = metric === 'gmv';
  const title = isGmv ? 'GMV 月环比' : '利润额月环比';
  const lineColor = isGmv ? '#F59E0B' : '#10B981';
  const width = 980;
  const height = 270;
  const pad = { top: 22, right: 70, bottom: 42, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const step = data.length ? plotW / data.length : plotW;
  const momValues = data.map((row) => isGmv ? row.gmvMoM : row.profitMoM);
  const absoluteValues = data.map((row) => isGmv ? row.gmv : row.profit);
  const maxPct = Math.max(0.1, ...momValues.map((value) => Math.abs(value ?? 0))) * 1.2;
  const maxAbsolute = Math.max(1, ...absoluteValues.map((value) => Math.abs(value))) * 1.12;
  const minAbsolute = Math.min(0, ...absoluteValues) * 1.12;
  const zeroY = pad.top + plotH / 2;
  const absoluteY = (value: number) => pad.top + (maxAbsolute - value) / (maxAbsolute - minAbsolute) * plotH;
  const linePath = data.map((row, index) => {
    const x = pad.left + step * index + step / 2;
    const y = absoluteY(isGmv ? row.gmv : row.profit);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <ChartCard
      title={title}
      subtitle="柱：环比增长率 · 线：当月绝对值 · 标签含环比差异"
      action={selectedYearMonth ? <SelectionButton label={selectedYearMonth} onClear={() => onSelectYearMonth(selectedYearMonth)} /> : <div className="flex gap-3 text-[11px] text-slate-400"><span>柱 环比%</span><span style={{ color: lineColor }}>线 当月{isGmv ? 'GMV' : '利润'}</span></div>}
    >
      {data.length === 0 ? <EmptyChart /> : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" onMouseLeave={() => setHoverIndex(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = pad.top + plotH * tick;
              const pct = maxPct * (1 - tick * 2);
              const absolute = maxAbsolute - (maxAbsolute - minAbsolute) * tick;
              return <g key={tick}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} strokeDasharray="3 4" className="stroke-slate-200 dark:stroke-slate-800" /><text x={pad.left - 9} y={y + 3} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">{formatPct(pct)}</text><text x={width - pad.right + 9} y={y + 3} className="fill-slate-400 text-[10px] font-mono">{formatCurrency(absolute, true)}</text></g>;
            })}
            <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} className="stroke-slate-300 dark:stroke-slate-700" />
            {data.map((row, index) => {
              const x = pad.left + step * index + step / 2;
              const mom = isGmv ? row.gmvMoM : row.profitMoM;
              const barY = mom === null ? zeroY : mom >= 0 ? zeroY - mom / maxPct * (plotH / 2) : zeroY;
              const barH = mom === null ? 0 : Math.abs(mom) / maxPct * (plotH / 2);
              const selected = selectedYearMonth === row.yearMonth;
              return (
                <g key={row.yearMonth} onMouseEnter={() => setHoverIndex(index)} onClick={() => onSelectYearMonth(row.yearMonth)} className="cursor-pointer">
                  <rect x={pad.left + step * index} y={pad.top} width={step} height={plotH} fill={hoverIndex === index || selected ? 'rgba(59,130,246,.08)' : 'transparent'} />
                  {mom !== null && <rect x={x - Math.min(17, step * 0.28)} y={barY} width={Math.min(34, step * 0.56)} height={Math.max(1.5, barH)} rx="3" fill={mom >= 0 ? '#3B82F6' : '#F43F5E'} opacity={selectedYearMonth && !selected ? 0.28 : 0.88} />}
                  <text x={x} y={height - 14} textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">{row.yearMonth.slice(2)}</text>
                </g>
              );
            })}
            <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="pointer-events-none" />
            {data.map((row, index) => <circle key={row.yearMonth} cx={pad.left + step * index + step / 2} cy={absoluteY(isGmv ? row.gmv : row.profit)} r={hoverIndex === index ? 4.5 : 2.8} fill={lineColor} className="pointer-events-none" />)}
          </svg>
          {hovered && hoverIndex !== null && (
            <div className="pointer-events-none absolute top-1 z-20 min-w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl text-xs" style={{ left: `${Math.min(78, Math.max(12, (hoverIndex + 0.5) / data.length * 100))}%`, transform: 'translateX(-50%)' }}>
              <div className="font-mono font-semibold text-slate-900 dark:text-white mb-2">{hovered.yearMonth}</div>
              {(() => {
                const mom = isGmv ? hovered.gmvMoM : hovered.profitMoM;
                const diff = isGmv ? hovered.gmvDiff : hovered.profitDiff;
                const absolute = isGmv ? hovered.gmv : hovered.profit;
                return <div className="space-y-1.5 font-mono tabular-nums"><div className="flex justify-between gap-5"><span className="text-slate-400">环比%</span><span className={mom !== null && mom < 0 ? 'text-rose-500' : 'text-blue-600'}>{formatPct(mom, true)}</span></div><div className="flex justify-between gap-5"><span className="text-slate-400">环比差异</span><span className={diff !== null && diff < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}>{diff === null ? '—' : `${diff > 0 ? '+' : ''}${formatCurrency(diff, true)}`}</span></div><div className="flex justify-between gap-5"><span className="text-slate-400">当月{isGmv ? 'GMV' : '利润额'}</span><span style={{ color: lineColor }}>{formatCurrency(absolute)}</span></div></div>;
              })()}
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
};

export const SupervisorGmvDualBarChart: React.FC<MonthChartProps> = ({ data, selectedYearMonth, onSelectYearMonth }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 980;
  const height = 270;
  const pad = { top: 22, right: 24, bottom: 42, left: 68 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const step = data.length ? plotW / data.length : plotW;
  const maxValue = Math.max(1, ...data.map((row) => row.gmv)) * 1.12;
  const minValue = Math.min(0, ...data.map((row) => row.gmvDiff ?? 0)) * 1.15;
  const range = maxValue - minValue;
  const valueY = (value: number) => pad.top + (maxValue - value) / range * plotH;
  const zeroY = valueY(0);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <ChartCard title="GMV 趋势图" subtitle="宽柱：当月 GMV 绝对值（高透明） · 窄柱：较上月差值（低透明）" action={selectedYearMonth ? <SelectionButton label={selectedYearMonth} onClear={() => onSelectYearMonth(selectedYearMonth)} /> : <div className="flex gap-3 text-[11px] text-slate-400"><span>■ GMV</span><span className="text-blue-600">■ 月差值</span></div>}>
      {data.length === 0 ? <EmptyChart /> : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" onMouseLeave={() => setHoverIndex(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = pad.top + tick * plotH;
              return <g key={tick}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} strokeDasharray="3 4" className="stroke-slate-200 dark:stroke-slate-800" /><text x={pad.left - 9} y={y + 3} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">{formatCurrency(maxValue - range * tick, true)}</text></g>;
            })}
            <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} className="stroke-slate-300 dark:stroke-slate-700" />
            {data.map((row, index) => {
              const x = pad.left + step * index + step / 2;
              const absoluteY = valueY(row.gmv);
              const diff = row.gmvDiff ?? 0;
              const diffY = valueY(diff);
              const selected = selectedYearMonth === row.yearMonth;
              return <g key={row.yearMonth} onMouseEnter={() => setHoverIndex(index)} onClick={() => onSelectYearMonth(row.yearMonth)} className="cursor-pointer"><rect x={pad.left + step * index} y={pad.top} width={step} height={plotH} fill={hoverIndex === index || selected ? 'rgba(59,130,246,.08)' : 'transparent'} /><rect x={x - Math.min(24, step * 0.36)} y={Math.min(absoluteY, zeroY)} width={Math.min(48, step * 0.72)} height={Math.max(1, Math.abs(zeroY - absoluteY))} rx="4" fill="#3B82F6" opacity={selectedYearMonth && !selected ? 0.1 : 0.28} /><rect x={x - Math.min(10, step * 0.15)} y={Math.min(diffY, zeroY)} width={Math.min(20, step * 0.3)} height={row.gmvDiff === null ? 0 : Math.max(1.5, Math.abs(zeroY - diffY))} rx="3" fill={diff >= 0 ? '#2563EB' : '#F43F5E'} opacity={selectedYearMonth && !selected ? 0.25 : 0.95} /><text x={x} y={height - 14} textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">{row.yearMonth.slice(2)}</text></g>;
            })}
          </svg>
          {hovered && hoverIndex !== null && <div className="pointer-events-none absolute top-1 z-20 min-w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl text-xs font-mono" style={{ left: `${Math.min(80, Math.max(12, (hoverIndex + 0.5) / data.length * 100))}%`, transform: 'translateX(-50%)' }}><div className="font-semibold text-slate-900 dark:text-white mb-2">{hovered.yearMonth}</div><div className="flex justify-between gap-5 mb-1"><span className="text-slate-400">当月 GMV</span><span className="text-blue-600">{formatCurrency(hovered.gmv)}</span></div><div className="flex justify-between gap-5 mb-1"><span className="text-slate-400">环比差异</span><span>{hovered.gmvDiff === null ? '—' : `${hovered.gmvDiff > 0 ? '+' : ''}${formatCurrency(hovered.gmvDiff)}`}</span></div><div className="flex justify-between gap-5"><span className="text-slate-400">环比%</span><span>{formatPct(hovered.gmvMoM, true)}</span></div></div>}
        </div>
      )}
    </ChartCard>
  );
};

type TrendMetric = 'quantity' | 'profitRate' | 'aov' | 'adRatio' | 'afterSalesRatio';

const TREND_CONFIG: Record<TrendMetric, { title: string; label: string; color: string; type: 'number' | 'currency' | 'percent' }> = {
  quantity: { title: '销量趋势', label: '销售数量', color: '#3B82F6', type: 'number' },
  profitRate: { title: '利润率趋势', label: '利润率', color: '#10B981', type: 'percent' },
  aov: { title: '客单价趋势', label: '客单价（行均值）', color: '#8B5CF6', type: 'currency' },
  adRatio: { title: '广告占比趋势', label: '广告费 / GMV', color: '#F59E0B', type: 'percent' },
  afterSalesRatio: { title: '售后占比趋势', label: '售后费用 / GMV', color: '#EC4899', type: 'percent' },
};

export const SupervisorTrendChart: React.FC<MonthChartProps & { metric: TrendMetric }> = ({ data, selectedYearMonth, onSelectYearMonth, metric }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const config = TREND_CONFIG[metric];
  const width = 720;
  const height = 250;
  const pad = { top: 22, right: 24, bottom: 40, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const step = data.length ? plotW / data.length : plotW;
  const values = data.map((row) => row[metric]);
  const movingAverages = values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - 2), index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
  const maxValue = Math.max(0.0001, ...values, ...movingAverages) * 1.18;
  const minValue = Math.min(0, ...values);
  const range = maxValue - minValue || 1;
  const valueY = (value: number) => pad.top + (maxValue - value) / range * plotH;
  const zeroY = valueY(0);
  const linePath = movingAverages.map((value, index) => `${index === 0 ? 'M' : 'L'} ${(pad.left + step * index + step / 2).toFixed(1)} ${valueY(value).toFixed(1)}`).join(' ');
  const formatValue = (value: number) => config.type === 'percent' ? formatPct(value) : config.type === 'currency' ? formatCurrency(value) : formatNumber(value);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <ChartCard title={config.title} subtitle={`柱：当月${config.label} · 线：近三月移动均值`} action={selectedYearMonth ? <SelectionButton label={selectedYearMonth} onClear={() => onSelectYearMonth(selectedYearMonth)} /> : <span className="text-[11px] text-slate-400">点击月份联动</span>}>
      {data.length === 0 ? <EmptyChart /> : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" onMouseLeave={() => setHoverIndex(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = pad.top + tick * plotH;
              return <g key={tick}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} strokeDasharray="3 4" className="stroke-slate-200 dark:stroke-slate-800" /><text x={pad.left - 8} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">{formatValue(maxValue - range * tick)}</text></g>;
            })}
            <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} className="stroke-slate-300 dark:stroke-slate-700" />
            {data.map((row, index) => {
              const x = pad.left + step * index + step / 2;
              const y = valueY(row[metric]);
              const selected = selectedYearMonth === row.yearMonth;
              return <g key={row.yearMonth} onMouseEnter={() => setHoverIndex(index)} onClick={() => onSelectYearMonth(row.yearMonth)} className="cursor-pointer"><rect x={pad.left + step * index} y={pad.top} width={step} height={plotH} fill={hoverIndex === index || selected ? 'rgba(59,130,246,.08)' : 'transparent'} /><rect x={x - Math.min(18, step * 0.29)} y={Math.min(y, zeroY)} width={Math.min(36, step * 0.58)} height={Math.max(1, Math.abs(zeroY - y))} rx="3" fill={config.color} opacity={selectedYearMonth && !selected ? 0.1 : 0.3} /><text x={x} y={height - 13} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">{row.yearMonth.slice(2)}</text></g>;
            })}
            <path d={linePath} fill="none" stroke={config.color} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" className="pointer-events-none" />
            {data.map((row, index) => <circle key={row.yearMonth} cx={pad.left + step * index + step / 2} cy={valueY(movingAverages[index])} r={hoverIndex === index ? 4 : 2.4} fill={config.color} className="pointer-events-none" />)}
          </svg>
          {hovered && hoverIndex !== null && <div className="pointer-events-none absolute top-1 z-20 min-w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl text-xs font-mono" style={{ left: `${Math.min(78, Math.max(15, (hoverIndex + 0.5) / data.length * 100))}%`, transform: 'translateX(-50%)' }}><div className="font-semibold text-slate-900 dark:text-white mb-2">{hovered.yearMonth}</div><div className="flex justify-between gap-5 mb-1"><span className="text-slate-400">{config.label}</span><span style={{ color: config.color }}>{formatValue(hovered[metric])}</span></div><div className="flex justify-between gap-5 mb-1"><span className="text-slate-400">近三月均值</span><span>{formatValue(movingAverages[hoverIndex])}</span></div><div className="flex justify-between gap-5"><span className="text-slate-400">当月 GMV</span><span>{formatCurrency(hovered.gmv, true)}</span></div></div>}
        </div>
      )}
    </ChartCard>
  );
};
