import React, { useMemo, useState } from 'react';
import { MonthlyMonitorRow, ParetoPoint, TLShareItem, YoYYearSeries } from '../../types/bi';
import { formatCurrency, formatNumber, formatPct } from '../../utils/biEngine';

const DONUT_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

interface DonutChartCardProps {
  title: string;
  subtitle: string;
  items: TLShareItem[];
  mode: 'gmv' | 'profit';
  selectedTL?: string | null;
  onSelectTL?: (tl: string) => void;
}

export const DonutChartCard: React.FC<DonutChartCardProps> = ({
  title,
  subtitle,
  items,
  mode,
  selectedTL = null,
  onSelectTL,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = useMemo(
    () => items.reduce((acc, item) => acc + Math.max(0, mode === 'gmv' ? item.gmv : item.profit), 0),
    [items, mode]
  );

  const segments = useMemo(() => {
    const radius = 68;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return items.map((item, idx) => {
      const value = Math.max(0, mode === 'gmv' ? item.gmv : item.profit);
      const share = total === 0 ? 0 : value / total;
      const dashLength = share * circumference;
      const seg = {
        ...item,
        value,
        share,
        color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
        dashArray: `${Math.max(0, dashLength - 2)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += dashLength;
      return seg;
    });
  }, [items, mode, total]);

  const activeSeg =
    hoveredIdx !== null
      ? segments[hoveredIdx]
      : selectedTL
      ? segments.find((s) => s.tl === selectedTL) ?? null
      : null;

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30 flex flex-col justify-between relative">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedTL && onSelectTL && (
            <button
              onClick={() => onSelectTL(selectedTL)}
              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              取消联动 ({selectedTL})
            </button>
          )}
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {items.length} 个TL组
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-xs text-slate-400">
          当前筛选条件下暂无TL数据
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* SVG Donut */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 overflow-visible">
              <circle
                cx="90"
                cy="90"
                r="68"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                className="text-slate-100 dark:text-slate-800/70"
              />
              {segments.map((seg, idx) => {
                const isHovered = hoveredIdx === idx;
                const isSelected = selectedTL === seg.tl;
                const dimmed =
                  (hoveredIdx !== null && !isHovered) ||
                  (hoveredIdx === null && selectedTL !== null && !isSelected);
                return (
                  <circle
                    key={seg.tl}
                    cx="90"
                    cy="90"
                    r="68"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isHovered || isSelected ? 25 : 20}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-150 cursor-pointer"
                    style={{
                      opacity: dimmed ? 0.32 : 1,
                    }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => onSelectTL?.(seg.tl)}
                  />
                );
              })}
            </svg>

            {/* Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[96px]">
                {activeSeg ? activeSeg.tl : mode === 'gmv' ? '大盘 GMV' : '大盘净利润'}
              </div>
              <div className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatCurrency(activeSeg ? activeSeg.value : total, true)}
              </div>
              <div className="font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                {activeSeg ? formatPct(activeSeg.share) : '100.0%'}
              </div>
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="flex-1 w-full space-y-2">
            {segments.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              const isSelected = selectedTL === seg.tl;
              return (
                <div
                  key={seg.tl}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectTL?.(seg.tl)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/40'
                      : isHovered
                      ? 'bg-slate-100 dark:bg-slate-800/90 border-transparent'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {seg.tl}
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                      ({seg.opCount}人)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
                    <span className="text-slate-600 dark:text-slate-300">
                      {formatCurrency(seg.value, true)}
                    </span>
                    <span className="w-12 text-right font-semibold text-slate-900 dark:text-white">
                      {formatPct(seg.share)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Tooltip Banner on Hover */}
      {activeSeg && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            {activeSeg.tl} 团队明细
          </span>
          <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span>
              {mode === 'gmv' ? 'GMV' : '利润'}: {formatCurrency(activeSeg.value)}
            </span>
            <span>占比: {formatPct(activeSeg.share)}</span>
            <span>利润率: {formatPct(activeSeg.profitRate)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface ParetoEfficiencyChartProps {
  title: string;
  subtitle: string;
  data: ParetoPoint[];
  barColor: string;
  lineColor: string;
  metricLabel: string;
  selectedYearMonth?: string | null;
  onSelectYearMonth?: (ym: string) => void;
}

export const ParetoEfficiencyChart: React.FC<ParetoEfficiencyChartProps> = ({
  title,
  subtitle,
  data,
  barColor,
  lineColor,
  metricLabel,
  selectedYearMonth = null,
  onSelectYearMonth,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 760;
  const height = 210;
  const pad = { top: 20, right: 48, bottom: 34, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVal = useMemo(() => {
    const m = Math.max(...data.map((d) => d.value), 1);
    return m * 1.15;
  }, [data]);

  const minVal = useMemo(() => {
    const m = Math.min(...data.map((d) => d.value), 0);
    return m < 0 ? m * 1.15 : 0;
  }, [data]);

  const range = Math.max(1, maxVal - minVal);
  const zeroY = pad.top + ((maxVal - 0) / range) * plotH;
  const stepX = data.length > 0 ? plotW / data.length : plotW;
  const barW = Math.max(4, Math.min(22, stepX * 0.56));

  const linePath = useMemo(() => {
    if (data.length === 0) return '';
    return data
      .map((d, i) => {
        const x = pad.left + stepX * i + stepX / 2;
        const y = pad.top + (1 - d.cumulativePct) * plotH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, pad.left, pad.top, plotH, stepX]);

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const xLabelInterval = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: barColor }} />
            <span>{metricLabel}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: lineColor }} />
            <span>帕累托累计占比%</span>
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-slate-400">暂无数据</div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = pad.top + t * plotH;
              const leftVal = maxVal - t * range;
              const rightPct = (1 - t) * 100;
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={width - pad.right}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {formatCurrency(leftVal, true)}
                  </text>
                  <text
                    x={width - pad.right + 8}
                    y={y + 3}
                    textAnchor="start"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {rightPct.toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {/* Bars + Hover zones */}
            {data.map((d, i) => {
              const cx = pad.left + stepX * i + stepX / 2;
              const valY = pad.top + ((maxVal - d.value) / range) * plotH;
              const barY = Math.min(valY, zeroY);
              const barH = Math.max(1.5, Math.abs(zeroY - valY));
              const isHov = hoverIdx === i;
              const isSel = selectedYearMonth === d.yearMonth;
              const dimmed =
                (hoverIdx !== null && !isHov) ||
                (hoverIdx === null && selectedYearMonth !== null && !isSel);

              return (
                <g
                  key={d.yearMonth}
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => onSelectYearMonth?.(d.yearMonth)}
                  className="cursor-pointer"
                >
                  <rect
                    x={pad.left + stepX * i}
                    y={pad.top}
                    width={stepX}
                    height={plotH}
                    fill={isHov || isSel ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}
                  />
                  <rect
                    x={cx - barW / 2}
                    y={barY}
                    width={barW}
                    height={barH}
                    rx={2}
                    fill={d.value < 0 ? '#EF4444' : barColor}
                    stroke={isSel ? '#1D4ED8' : 'none'}
                    strokeWidth={isSel ? 1.5 : 0}
                    opacity={dimmed ? 0.35 : 0.92}
                    className="transition-opacity duration-150"
                  />
                  {i % xLabelInterval === 0 && (
                    <text
                      x={cx}
                      y={height - 10}
                      textAnchor="middle"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                    >
                      {d.yearMonth.slice(2)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Pareto Cumulative Line */}
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
            {data.map((d, i) => {
              const cx = pad.left + stepX * i + stepX / 2;
              const cy = pad.top + (1 - d.cumulativePct) * plotH;
              const isHov = hoverIdx === i;
              return (
                <circle
                  key={`dot-${d.yearMonth}`}
                  cx={cx}
                  cy={cy}
                  r={isHov ? 4.5 : 2.2}
                  fill={lineColor}
                  stroke="#0F172A"
                  strokeWidth={isHov ? 1.5 : 0}
                  className="pointer-events-none"
                />
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hovered && hoverIdx !== null && (
            <div
              className="pointer-events-none absolute top-2 z-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3.5 py-2.5 shadow-xl text-xs backdrop-blur-sm min-w-[200px]"
              style={{
                left: `${Math.min(72, Math.max(8, ((hoverIdx + 0.5) / data.length) * 100))}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-mono font-semibold text-slate-900 dark:text-white mb-1.5 flex items-center justify-between gap-4">
                <span>{hovered.yearMonth}</span>
                <span className="text-slate-400 font-normal">OP人数: {hovered.opCount}人</span>
              </div>
              <div className="space-y-1 font-mono tabular-nums">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">{metricLabel}:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(hovered.value)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">累计占比:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {formatPct(hovered.cumulativePct)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">当月总额:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {formatCurrency(hovered.totalValue, true)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface GmvProfitContrastChartProps {
  rows: MonthlyMonitorRow[];
  selectedYearMonth?: string | null;
  onSelectYearMonth?: (ym: string) => void;
}

export const GmvProfitContrastChart: React.FC<GmvProfitContrastChartProps> = ({
  rows,
  selectedYearMonth = null,
  onSelectYearMonth,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 820;
  const height = 280;
  const pad = { top: 24, right: 24, bottom: 38, left: 66 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVal = useMemo(() => Math.max(...rows.map((r) => r.gmv), 1) * 1.12, [rows]);
  const minVal = useMemo(() => Math.min(...rows.map((r) => r.profit), 0), [rows]);
  const floorVal = minVal < 0 ? minVal * 1.15 : 0;
  const range = Math.max(1, maxVal - floorVal);
  const zeroY = pad.top + ((maxVal - 0) / range) * plotH;

  const stepX = rows.length > 0 ? plotW / rows.length : plotW;
  const outerBarW = Math.max(7, Math.min(28, stepX * 0.72)); // Wide transparent GMV bar
  const innerBarW = Math.max(3, Math.min(13, outerBarW * 0.44)); // Narrow opaque Profit bar

  const hovered = hoverIdx !== null ? rows[hoverIdx] : null;
  const xLabelInterval = Math.max(1, Math.ceil(rows.length / 12));

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            GMV & 利润趋势图（双柱反差对比）
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            宽体半透明柱代表 GMV 营收规模，内嵌实心柱代表净利润，直观对比规模与盈利转化效率
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3 rounded-xs bg-blue-500/25 border border-blue-400/60" />
            <span>GMV (透明宽柱)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-3 rounded-xs bg-emerald-500" />
            <span>利润额 (实心窄柱)</span>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">暂无数据</div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = pad.top + t * plotH;
              const val = maxVal - t * range;
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={width - pad.right}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {formatCurrency(val, true)}
                  </text>
                </g>
              );
            })}

            {rows.map((r, i) => {
              const cx = pad.left + stepX * i + stepX / 2;
              const gmvY = pad.top + ((maxVal - r.gmv) / range) * plotH;
              const gmvH = Math.max(2, zeroY - gmvY);

              const profitY = pad.top + ((maxVal - r.profit) / range) * plotH;
              const pTop = Math.min(profitY, zeroY);
              const pH = Math.max(2, Math.abs(zeroY - profitY));
              const isHov = hoverIdx === i;
              const isSel = selectedYearMonth === r.yearMonth;
              const dimmed =
                (hoverIdx !== null && !isHov) ||
                (hoverIdx === null && selectedYearMonth !== null && !isSel);

              return (
                <g
                  key={r.yearMonth}
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => onSelectYearMonth?.(r.yearMonth)}
                  className="cursor-pointer"
                >
                  <rect
                    x={pad.left + stepX * i}
                    y={pad.top}
                    width={stepX}
                    height={plotH}
                    fill={isHov || isSel ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}
                  />
                  {/* Wide Transparent GMV Bar */}
                  <rect
                    x={cx - outerBarW / 2}
                    y={gmvY}
                    width={outerBarW}
                    height={gmvH}
                    rx={3}
                    fill="rgba(59, 130, 246, 0.22)"
                    stroke={isSel ? '#2563EB' : 'rgba(59, 130, 246, 0.55)'}
                    strokeWidth={isHov || isSel ? 1.8 : 1}
                    opacity={dimmed ? 0.35 : 1}
                  />
                  {/* Narrow Opaque Profit Bar */}
                  <rect
                    x={cx - innerBarW / 2}
                    y={pTop}
                    width={innerBarW}
                    height={pH}
                    rx={2}
                    fill={r.profit >= 0 ? '#10B981' : '#EF4444'}
                    opacity={dimmed ? 0.4 : 1}
                  />
                  {i % xLabelInterval === 0 && (
                    <text
                      x={cx}
                      y={height - 12}
                      textAnchor="middle"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                    >
                      {r.yearMonth.slice(2)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {hovered && hoverIdx !== null && (
            <div
              className="pointer-events-none absolute top-2 z-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3.5 py-2.5 shadow-xl text-xs backdrop-blur-sm min-w-[215px]"
              style={{
                left: `${Math.min(76, Math.max(12, ((hoverIdx + 0.5) / rows.length) * 100))}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-mono font-semibold text-slate-900 dark:text-white mb-1.5">
                {hovered.yearMonth}
              </div>
              <div className="space-y-1 font-mono tabular-nums">
                <div className="flex justify-between gap-4">
                  <span className="text-blue-500">GMV:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(hovered.gmv)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-500">利润额:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(hovered.profit)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">净利润率:</span>
                  <span className="font-semibold text-emerald-500">
                    {formatPct(hovered.profitRate)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface YoYLineChartProps {
  title: string;
  series: YoYYearSeries[];
  valueType: 'currency' | 'units';
  onToggleYear?: (year: number) => void;
  onSelectMonth?: (month: number) => void;
}

export const YoYLineChart: React.FC<YoYLineChartProps> = ({
  title,
  series,
  valueType,
  onToggleYear,
  onSelectMonth,
}) => {
  const [hoverMonthIdx, setHoverMonthIdx] = useState<number | null>(null);

  const width = 440;
  const height = 215;
  const pad = { top: 20, right: 18, bottom: 32, left: 54 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { maxVal, minVal } = useMemo(() => {
    const vals: number[] = [];
    for (const s of series) {
      for (const p of s.points) {
        if (p.value !== null) vals.push(p.value);
      }
    }
    if (vals.length === 0) return { maxVal: 100, minVal: 0 };
    const mx = Math.max(...vals);
    const mn = Math.min(...vals, 0);
    return { maxVal: mx * 1.12, minVal: mn < 0 ? mn * 1.12 : 0 };
  }, [series]);

  const range = Math.max(1, maxVal - minVal);
  const stepX = plotW / 11;

  const formatVal = (v: number) =>
    valueType === 'currency' ? formatCurrency(v, true) : formatNumber(v);

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {series.map((s) => (
            <button
              key={s.year}
              onClick={() => onToggleYear?.(s.year)}
              title={`点击按 ${s.year} 年联动筛选`}
              className="flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span>{s.year}</span>
            </button>
          ))}
        </div>
      </div>

      {series.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-400">暂无数据</div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverMonthIdx(null)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = pad.top + t * plotH;
              const val = maxVal - t * range;
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={width - pad.right}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <text
                    x={pad.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {formatVal(val)}
                  </text>
                </g>
              );
            })}

            {/* Hover guide line */}
            {hoverMonthIdx !== null && (
              <line
                x1={pad.left + hoverMonthIdx * stepX}
                y1={pad.top}
                x2={pad.left + hoverMonthIdx * stepX}
                y2={pad.top + plotH}
                stroke="rgba(148, 163, 184, 0.5)"
                strokeDasharray="3 3"
              />
            )}

            {/* Year lines */}
            {series.map((s) => {
              let path = '';
              let started = false;
              s.points.forEach((p, idx) => {
                if (p.value === null) {
                  started = false;
                  return;
                }
                const x = pad.left + idx * stepX;
                const y = pad.top + ((maxVal - p.value) / range) * plotH;
                path += `${started ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
                started = true;
              });

              return (
                <g key={s.year}>
                  <path
                    d={path}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {s.points.map((p, idx) => {
                    if (p.value === null) return null;
                    const x = pad.left + idx * stepX;
                    const y = pad.top + ((maxVal - p.value) / range) * plotH;
                    const isHov = hoverMonthIdx === idx;
                    return (
                      <circle
                        key={`${s.year}-${p.month}`}
                        cx={x}
                        cy={y}
                        r={isHov ? 4.5 : 2.3}
                        fill={s.color}
                        stroke="#0F172A"
                        strokeWidth={isHov ? 1.5 : 0}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* X-axis months & hover targets */}
            {Array.from({ length: 12 }, (_, idx) => {
              const x = pad.left + idx * stepX;
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoverMonthIdx(idx)}
                  onClick={() => onSelectMonth?.(idx + 1)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x - stepX / 2}
                    y={pad.top}
                    width={stepX}
                    height={plotH}
                    fill="transparent"
                  />
                  <text
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    className={`text-[10px] font-mono tabular-nums ${
                      hoverMonthIdx === idx
                        ? 'fill-blue-500 font-bold'
                        : 'fill-slate-400 dark:fill-slate-500'
                    }`}
                  >
                    {idx + 1}月
                  </text>
                </g>
              );
            })}
          </svg>

          {hoverMonthIdx !== null && (
            <div
              className="pointer-events-none absolute top-1 z-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-xl text-[11px] backdrop-blur-sm min-w-[190px]"
              style={{
                left: `${Math.min(72, Math.max(18, (hoverMonthIdx / 11) * 100))}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-semibold text-slate-900 dark:text-white mb-1">
                {hoverMonthIdx + 1}月 年度对比
              </div>
              <div className="space-y-1 font-mono tabular-nums">
                {series.map((s) => {
                  const pt = s.points[hoverMonthIdx];
                  if (!pt || pt.value === null) return null;
                  return (
                    <div key={s.year} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-600 dark:text-slate-300">{s.year}年</span>
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {formatVal(pt.value)}
                      </span>
                      <span
                        className={
                          pt.yoyPct === null
                            ? 'text-slate-400'
                            : pt.yoyPct >= 0
                            ? 'text-emerald-500'
                            : 'text-rose-500'
                        }
                      >
                        {pt.yoyPct === null ? '—' : formatPct(pt.yoyPct, true)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MoMGrowthChartProps {
  rows: MonthlyMonitorRow[];
  selectedYearMonth?: string | null;
  onSelectYearMonth?: (ym: string) => void;
}

export const MoMGrowthChart: React.FC<MoMGrowthChartProps> = ({
  rows,
  selectedYearMonth = null,
  onSelectYearMonth,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState({
    gmv: true,
    quantity: true,
    profit: true,
  });

  const width = 820;
  const height = 250;
  const pad = { top: 24, right: 24, bottom: 38, left: 54 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { maxPct, minPct } = useMemo(() => {
    const vals: number[] = [0];
    for (const r of rows) {
      if (visibleSeries.gmv && r.gmvMoM !== null) vals.push(r.gmvMoM);
      if (visibleSeries.quantity && r.quantityMoM !== null) vals.push(r.quantityMoM);
      if (visibleSeries.profit && r.profitMoM !== null) vals.push(r.profitMoM);
    }
    const mx = Math.max(...vals, 0.25);
    const mn = Math.min(...vals, -0.25);
    return { maxPct: Math.min(2.5, mx * 1.15), minPct: Math.max(-1.5, mn * 1.15) };
  }, [rows, visibleSeries]);

  const range = Math.max(0.1, maxPct - minPct);
  const zeroY = pad.top + ((maxPct - 0) / range) * plotH;
  const stepX = rows.length > 1 ? plotW / (rows.length - 1) : plotW;

  const buildPath = (getter: (r: MonthlyMonitorRow) => number | null) => {
    let d = '';
    let started = false;
    rows.forEach((r, idx) => {
      const val = getter(r);
      if (val === null) {
        started = false;
        return;
      }
      const clamped = Math.max(minPct, Math.min(maxPct, val));
      const x = rows.length === 1 ? pad.left + plotW / 2 : pad.left + idx * stepX;
      const y = pad.top + ((maxPct - clamped) / range) * plotH;
      d += `${started ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      started = true;
    });
    return d;
  };

  const hovered = hoverIdx !== null ? rows[hoverIdx] : null;
  const xLabelInterval = Math.max(1, Math.ceil(rows.length / 12));

  const toggle = (k: 'gmv' | 'quantity' | 'profit') =>
    setVisibleSeries((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            销售额 · 销量 · 利润额月环比趋势
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            点击图例可切换对应指标环比曲线，悬停查看当月绝对值与环比增幅
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle('gmv')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              visibleSeries.gmv
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>销售额环比</span>
          </button>
          <button
            onClick={() => toggle('quantity')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              visibleSeries.quantity
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>销量环比</span>
          </button>
          <button
            onClick={() => toggle('profit')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              visibleSeries.profit
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>利润额环比</span>
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-slate-400">暂无数据</div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = pad.top + t * plotH;
              const pct = maxPct - t * range;
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={width - pad.right}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {(pct * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {/* Zero baseline */}
            <line
              x1={pad.left}
              y1={zeroY}
              x2={width - pad.right}
              y2={zeroY}
              stroke="rgba(148, 163, 184, 0.65)"
              strokeWidth={1.2}
            />

            {hoverIdx !== null && (
              <line
                x1={rows.length === 1 ? pad.left + plotW / 2 : pad.left + hoverIdx * stepX}
                y1={pad.top}
                x2={rows.length === 1 ? pad.left + plotW / 2 : pad.left + hoverIdx * stepX}
                y2={pad.top + plotH}
                stroke="rgba(148, 163, 184, 0.45)"
                strokeDasharray="3 3"
              />
            )}

            {visibleSeries.gmv && (
              <path
                d={buildPath((r) => r.gmvMoM)}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {visibleSeries.quantity && (
              <path
                d={buildPath((r) => r.quantityMoM)}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {visibleSeries.profit && (
              <path
                d={buildPath((r) => r.profitMoM)}
                fill="none"
                stroke="#10B981"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hover points & zones */}
            {rows.map((r, idx) => {
              const x = rows.length === 1 ? pad.left + plotW / 2 : pad.left + idx * stepX;
              const isHov = hoverIdx === idx || selectedYearMonth === r.yearMonth;
              const hitW = rows.length === 1 ? plotW : stepX;
              return (
                <g
                  key={r.yearMonth}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onClick={() => onSelectYearMonth?.(r.yearMonth)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x - hitW / 2}
                    y={pad.top}
                    width={hitW}
                    height={plotH}
                    fill="transparent"
                  />
                  {isHov &&
                    visibleSeries.gmv &&
                    r.gmvMoM !== null && (
                      <circle
                        cx={x}
                        cy={pad.top + ((maxPct - Math.max(minPct, Math.min(maxPct, r.gmvMoM))) / range) * plotH}
                        r={4.5}
                        fill="#3B82F6"
                        stroke="#0F172A"
                        strokeWidth={1.5}
                      />
                    )}
                  {isHov &&
                    visibleSeries.quantity &&
                    r.quantityMoM !== null && (
                      <circle
                        cx={x}
                        cy={pad.top + ((maxPct - Math.max(minPct, Math.min(maxPct, r.quantityMoM))) / range) * plotH}
                        r={4.5}
                        fill="#F59E0B"
                        stroke="#0F172A"
                        strokeWidth={1.5}
                      />
                    )}
                  {isHov &&
                    visibleSeries.profit &&
                    r.profitMoM !== null && (
                      <circle
                        cx={x}
                        cy={pad.top + ((maxPct - Math.max(minPct, Math.min(maxPct, r.profitMoM))) / range) * plotH}
                        r={4.5}
                        fill="#10B981"
                        stroke="#0F172A"
                        strokeWidth={1.5}
                      />
                    )}
                  {idx % xLabelInterval === 0 && (
                    <text
                      x={x}
                      y={height - 12}
                      textAnchor="middle"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                    >
                      {r.yearMonth.slice(2)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {hovered && hoverIdx !== null && (
            <div
              className="pointer-events-none absolute top-2 z-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3.5 py-2.5 shadow-xl text-xs backdrop-blur-sm min-w-[235px]"
              style={{
                left: `${Math.min(76, Math.max(14, ((hoverIdx + 0.5) / rows.length) * 100))}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-mono font-semibold text-slate-900 dark:text-white mb-1.5">
                {hovered.yearMonth} 月环比明细
              </div>
              <div className="space-y-1 font-mono tabular-nums">
                <div className="flex justify-between gap-3">
                  <span className="text-blue-500">销售额:</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(hovered.gmv, true)}</span>
                  <span className={hovered.gmvMoM !== null && hovered.gmvMoM >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {formatPct(hovered.gmvMoM, true)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-amber-500">销售数量:</span>
                  <span className="text-slate-900 dark:text-white">{formatNumber(hovered.quantity)}</span>
                  <span className={hovered.quantityMoM !== null && hovered.quantityMoM >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {formatPct(hovered.quantityMoM, true)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-emerald-500">利润额:</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(hovered.profit, true)}</span>
                  <span className={hovered.profitMoM !== null && hovered.profitMoM >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {formatPct(hovered.profitMoM, true)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface DrilldownBarItem {
  key: string;
  label: string;
  gmv: number;
  profit: number;
  profitRate: number;
  share: number;
}

interface DrilldownBarCardProps {
  title: string;
  subtitle: string;
  items: DrilldownBarItem[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  accentColor?: string;
}

export const DrilldownBarCard: React.FC<DrilldownBarCardProps> = ({
  title,
  subtitle,
  items,
  selectedKey,
  onSelectKey,
  accentColor = '#3B82F6',
}) => {
  const maxGmv = Math.max(...items.map((i) => i.gmv), 1);

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm hover:shadow-lg hover:border-blue-500/30 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {selectedKey && (
          <button
            onClick={() => onSelectKey(selectedKey)}
            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
          >
            清除 ({selectedKey})
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-slate-400">暂无数据</div>
      ) : (
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto erp-scroll pr-1">
          {items.map((item) => {
            const isSelected = selectedKey === item.key;
            const dimmed = selectedKey !== null && !isSelected;
            const widthPct = Math.max(4, (item.gmv / maxGmv) * 100);

            return (
              <button
                key={item.key}
                onClick={() => onSelectKey(item.key)}
                style={{ opacity: dimmed ? 0.42 : 1 }}
                className={`w-full text-left rounded-xl p-2.5 border transition-all ${
                  isSelected
                    ? 'bg-blue-50/90 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40'
                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">
                      {formatCurrency(item.gmv, true)}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                      {formatPct(item.profitRate)}
                    </span>
                    <span className="text-slate-400 text-[11px] w-11 text-right">
                      {formatPct(item.share)}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: isSelected ? '#2563EB' : accentColor,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

