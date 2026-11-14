import React, { useMemo, useState } from 'react';
import {
  CostAndAovPoint,
  formatCurrency,
  formatNumber,
  formatPct,
  MarketMultiAxisRow,
  TLPerformanceRow,
} from '../utils/biEngine';

/**
 * Shared signed horizontal bar cell with 0-baseline support:
 * Negative values extend LEFT of the 0 axis, positive values extend RIGHT of the 0 axis.
 */
const SignedHorizontalBar: React.FC<{
  value: number | null;
  minVal: number;
  maxVal: number;
  labelText: string;
  positiveColor: string;
  negativeColor?: string;
  isSelected?: boolean;
}> = ({
  value,
  minVal,
  maxVal,
  labelText,
  positiveColor,
  negativeColor = '#10B981',
  isSelected = false,
}) => {
  if (value === null) {
    return (
      <div className="h-6 flex items-center justify-center text-[11px] font-mono text-slate-400">
        —
      </div>
    );
  }

  const safeMin = Math.min(0, minVal);
  const safeMax = Math.max(0, maxVal);
  const span = Math.max(1e-6, safeMax - safeMin);
  const zeroPct = (Math.abs(safeMin) / span) * 100;

  const isNeg = value < 0;
  const barWidthPct = (Math.abs(value) / span) * 100;
  const leftPct = isNeg ? Math.max(0, zeroPct - barWidthPct) : zeroPct;

  return (
    <div className="relative h-6 flex items-center">
      {/* Zero baseline */}
      <div
        className="absolute top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600 z-10"
        style={{ left: `${zeroPct}%` }}
      />
      {/* Bar */}
      <div
        className="absolute h-4 rounded-[3px] transition-all duration-150"
        style={{
          left: `${leftPct}%`,
          width: `${Math.max(1.5, barWidthPct)}%`,
          backgroundColor: isNeg ? negativeColor : positiveColor,
          opacity: isSelected ? 1 : 0.88,
        }}
      />
      {/* Numeric Label */}
      <span
        className="relative z-20 text-[10px] font-mono tabular-nums font-medium px-1.5 text-slate-800 dark:text-slate-100 whitespace-nowrap pointer-events-none"
        style={{
          marginLeft: isNeg
            ? '2px'
            : `${Math.min(72, zeroPct + Math.min(barWidthPct, 42))}%`,
        }}
      >
        {labelText}
      </span>
    </div>
  );
};

interface MarketMultiAxisChartProps {
  rows: MarketMultiAxisRow[];
  selectedMarket: string | null;
  onSelectMarket: (market: string) => void;
}

export const MarketMultiAxisChart: React.FC<MarketMultiAxisChartProps> = ({
  rows,
  selectedMarket,
  onSelectMarket,
}) => {
  const [hoveredMarket, setHoveredMarket] = useState<MarketMultiAxisRow | null>(null);

  const bounds = useMemo(() => {
    const gmvMax = Math.max(...rows.map((r) => r.gmv), 1);
    const momVals = rows.map((r) => r.gmvMoM ?? 0);
    const momMin = Math.min(0, ...momVals);
    const momMax = Math.max(0.05, ...momVals);
    const profitVals = rows.map((r) => r.profit);
    const profitMin = Math.min(0, ...profitVals);
    const profitMax = Math.max(1, ...profitVals);
    const rateMomVals = rows.map((r) => r.profitRateMoM ?? 0);
    const rateMomMin = Math.min(0, ...rateMomVals);
    const rateMomMax = Math.max(0.05, ...rateMomVals);
    const qtyMax = Math.max(...rows.map((r) => r.quantity), 1);

    return { gmvMax, momMin, momMax, profitMin, profitMax, rateMomMin, rateMomMax, qtyMax };
  }, [rows]);

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            市场销售额 & 利润 & 销量趋势（多轴横向对比）
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            纵坐标为市场，横坐标依次展示 GMV、GMV环比、利润额、利润率环比、销售数量；负值向左延伸，点击任意市场行可联动下钻看板
          </p>
        </div>
        {selectedMarket && (
          <button
            onClick={() => onSelectMarket(selectedMarket)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
          >
            取消市场联动 ({selectedMarket})
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-400">暂无市场数据</div>
      ) : (
        <div className="overflow-x-auto erp-scroll">
          <div className="min-w-[960px]">
            {/* Column Headers */}
            <div className="grid grid-cols-[110px_repeat(5,minmax(160px,1fr))] border-b border-slate-200 dark:border-slate-800 pb-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <div className="px-2">市场</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">1. GMV</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">2. GMV环比</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">3. 利润额</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">4. 利润率环比</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">5. 销售数量</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {rows.map((row) => {
                const isSel = selectedMarket === row.market;
                const dimmed = selectedMarket !== null && !isSel;
                return (
                  <div
                    key={row.market}
                    onClick={() => onSelectMarket(row.market)}
                    onMouseEnter={() => setHoveredMarket(row)}
                    onMouseLeave={() => setHoveredMarket(null)}
                    style={{ opacity: dimmed ? 0.38 : 1 }}
                    className={`grid grid-cols-[110px_repeat(5,minmax(160px,1fr))] items-center py-1.5 cursor-pointer transition-all ${
                      isSel
                        ? 'bg-blue-50/90 dark:bg-blue-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="px-2 text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {row.market}
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.gmv}
                        minVal={0}
                        maxVal={bounds.gmvMax * 1.15}
                        labelText={formatCurrency(row.gmv, true)}
                        positiveColor="#F59E0B"
                        isSelected={isSel}
                      />
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.gmvMoM}
                        minVal={bounds.momMin * 1.15}
                        maxVal={bounds.momMax * 1.15}
                        labelText={formatPct(row.gmvMoM, true)}
                        positiveColor="#F59E0B"
                        negativeColor="#10B981"
                        isSelected={isSel}
                      />
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.profit}
                        minVal={bounds.profitMin * 1.15}
                        maxVal={bounds.profitMax * 1.15}
                        labelText={formatCurrency(row.profit, true)}
                        positiveColor="#3B82F6"
                        negativeColor="#EF4444"
                        isSelected={isSel}
                      />
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.profitRateMoM}
                        minVal={bounds.rateMomMin * 1.15}
                        maxVal={bounds.rateMomMax * 1.15}
                        labelText={formatPct(row.profitRateMoM, true)}
                        positiveColor="#F59E0B"
                        negativeColor="#10B981"
                        isSelected={isSel}
                      />
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.quantity}
                        minVal={0}
                        maxVal={bounds.qtyMax * 1.15}
                        labelText={formatNumber(row.quantity)}
                        positiveColor="#6366F1"
                        isSelected={isSel}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {hoveredMarket && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            市场明细: {hoveredMarket.market}
          </span>
          <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span>GMV: {formatCurrency(hoveredMarket.gmv)}</span>
            <span>GMV环比: {formatPct(hoveredMarket.gmvMoM, true)}</span>
            <span>利润额: {formatCurrency(hoveredMarket.profit)}</span>
            <span>利润率: {formatPct(hoveredMarket.profitRate)}</span>
            <span>利润率环比: {formatPct(hoveredMarket.profitRateMoM, true)}</span>
            <span>销量: {formatNumber(hoveredMarket.quantity)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface TLMultiAxisChartProps {
  rows: TLPerformanceRow[];
  selectedTL: string | null;
  onSelectTL: (tl: string) => void;
}

export const TLMultiAxisChart: React.FC<TLMultiAxisChartProps> = ({
  rows,
  selectedTL,
  onSelectTL,
}) => {
  const [hoveredTL, setHoveredTL] = useState<TLPerformanceRow | null>(null);

  const bounds = useMemo(() => {
    const gmvMax = Math.max(...rows.map((r) => r.gmv), 1);
    const qtyMax = Math.max(...rows.map((r) => r.quantity), 1);
    const profitVals = rows.map((r) => r.profit);
    const profitMin = Math.min(0, ...profitVals);
    const profitMax = Math.max(1, ...profitVals);
    const rateVals = rows.map((r) => r.profitRate);
    const rateMin = Math.min(0, ...rateVals);
    const rateMax = Math.max(0.05, ...rateVals);
    return { gmvMax, qtyMax, profitMin, profitMax, rateMin, rateMax };
  }, [rows]);

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            TL 销售表现（四轴横向对比）
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            纵坐标为 TL，横坐标依次展示 GMV、销量数据、利润额、利润率；点击任意 TL 行联动筛选下钻看板
          </p>
        </div>
        {selectedTL && (
          <button
            onClick={() => onSelectTL(selectedTL)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
          >
            取消 TL 联动 ({selectedTL})
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-400">暂无TL数据</div>
      ) : (
        <div className="overflow-x-auto erp-scroll">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[110px_repeat(4,minmax(160px,1fr))] border-b border-slate-200 dark:border-slate-800 pb-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <div className="px-2">TL</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">1. GMV</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">2. 销量数据</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">3. 利润额</div>
              <div className="px-2 text-center border-l border-slate-200 dark:border-slate-800">4. 利润率</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {rows.map((row) => {
                const isSel = selectedTL === row.tl;
                const dimmed = selectedTL !== null && !isSel;
                return (
                  <div
                    key={row.tl}
                    onClick={() => onSelectTL(row.tl)}
                    onMouseEnter={() => setHoveredTL(row)}
                    onMouseLeave={() => setHoveredTL(null)}
                    style={{ opacity: dimmed ? 0.38 : 1 }}
                    className={`grid grid-cols-[110px_repeat(4,minmax(160px,1fr))] items-center py-1.5 cursor-pointer transition-all ${
                      isSel
                        ? 'bg-blue-50/90 dark:bg-blue-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="px-2 text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {row.tl}
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.gmv}
                        minVal={0}
                        maxVal={bounds.gmvMax * 1.15}
                        labelText={formatCurrency(row.gmv, true)}
                        positiveColor="#3B82F6"
                        isSelected={isSel}
                      />
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.quantity}
                        minVal={0}
                        maxVal={bounds.qtyMax * 1.15}
                        labelText={formatNumber(row.quantity)}
                        positiveColor="#6366F1"
                        isSelected={isSel}
                      />
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.profit}
                        minVal={bounds.profitMin * 1.15}
                        maxVal={bounds.profitMax * 1.15}
                        labelText={formatCurrency(row.profit, true)}
                        positiveColor="#10B981"
                        negativeColor="#EF4444"
                        isSelected={isSel}
                      />
                    </div>
                    <div className="px-2 border-l border-slate-100 dark:border-slate-800/80">
                      <SignedHorizontalBar
                        value={row.profitRate}
                        minVal={bounds.rateMin * 1.15}
                        maxVal={bounds.rateMax * 1.15}
                        labelText={formatPct(row.profitRate)}
                        positiveColor="#F59E0B"
                        negativeColor="#EF4444"
                        isSelected={isSel}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {hoveredTL && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            TL 明细: {hoveredTL.tl}
          </span>
          <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span>GMV: {formatCurrency(hoveredTL.gmv)}</span>
            <span>销量: {formatNumber(hoveredTL.quantity)}</span>
            <span>利润额: {formatCurrency(hoveredTL.profit)}</span>
            <span>利润率: {formatPct(hoveredTL.profitRate)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface DualComboTrendChartProps {
  title: string;
  subtitle: string;
  points: CostAndAovPoint[];
  mode: 'cost' | 'aov';
  selectedYearMonth: string | null;
  onSelectYearMonth: (ym: string) => void;
}

export const DualComboTrendChart: React.FC<DualComboTrendChartProps> = ({
  title,
  subtitle,
  points,
  mode,
  selectedYearMonth,
  onSelectYearMonth,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 680;
  const height = 250;
  const pad = { top: 24, right: 50, bottom: 36, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const barGetter = (p: CostAndAovPoint) => (mode === 'cost' ? p.totalCost : p.aov);
  const momGetter = (p: CostAndAovPoint) => (mode === 'cost' ? p.totalCostMoM : p.aovMoM);

  const maxBar = useMemo(
    () => Math.max(...points.map(barGetter), 1) * 1.15,
    [points, mode]
  );

  const { maxPct, minPct } = useMemo(() => {
    const vals = points.map(momGetter).filter((v): v is number => v !== null);
    const mx = Math.max(0.15, ...vals);
    const mn = Math.min(-0.15, ...vals);
    return { maxPct: mx * 1.18, minPct: mn * 1.18 };
  }, [points, mode]);

  const pctRange = Math.max(0.05, maxPct - minPct);
  const stepX = points.length > 0 ? plotW / points.length : plotW;
  const barW = Math.max(4, Math.min(20, stepX * 0.56));
  const barColor = mode === 'cost' ? '#3B82F6' : '#06B6D4';
  const lineColor = mode === 'cost' ? '#F59E0B' : '#8B5CF6';

  const linePath = useMemo(() => {
    let d = '';
    let started = false;
    points.forEach((p, idx) => {
      const val = momGetter(p);
      if (val === null) {
        started = false;
        return;
      }
      const x = pad.left + stepX * idx + stepX / 2;
      const y = pad.top + ((maxPct - val) / pctRange) * plotH;
      d += `${started ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      started = true;
    });
    return d;
  }, [points, maxPct, pctRange, pad.left, pad.top, plotH, stepX, mode]);

  const zeroLineY = pad.top + ((maxPct - 0) / pctRange) * plotH;
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const xLabelInterval = Math.max(1, Math.ceil(points.length / 10));

  return (
    <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: barColor }} />
            <span>{mode === 'cost' ? '总成本' : '客单价均值'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: lineColor }} />
            <span>{mode === 'cost' ? '总成本环比%' : '客单价环比%'}</span>
          </span>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-xs text-slate-400">暂无数据</div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = pad.top + t * plotH;
              const leftVal = maxBar * (1 - t);
              const rightPct = maxPct - t * pctRange;
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
                    {formatCurrency(leftVal, mode === 'cost')}
                  </text>
                  <text
                    x={width - pad.right + 8}
                    y={y + 3}
                    textAnchor="start"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {(rightPct * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {/* 0% dashed reference for MoM curve */}
            {zeroLineY >= pad.top && zeroLineY <= pad.top + plotH && (
              <line
                x1={pad.left}
                y1={zeroLineY}
                x2={width - pad.right}
                y2={zeroLineY}
                stroke="rgba(148, 163, 184, 0.55)"
                strokeWidth={1}
              />
            )}

            {/* Bars */}
            {points.map((p, i) => {
              const cx = pad.left + stepX * i + stepX / 2;
              const val = barGetter(p);
              const barH = Math.max(2, (val / maxBar) * plotH);
              const barY = pad.top + plotH - barH;
              const isHov = hoverIdx === i;
              const isSel = selectedYearMonth === p.yearMonth;
              const dimmed =
                (hoverIdx !== null && !isHov) ||
                (hoverIdx === null && selectedYearMonth !== null && !isSel);

              return (
                <g
                  key={p.yearMonth}
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => onSelectYearMonth(p.yearMonth)}
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
                    rx={2.5}
                    fill={barColor}
                    stroke={isSel ? '#1D4ED8' : 'none'}
                    strokeWidth={isSel ? 1.5 : 0}
                    opacity={dimmed ? 0.35 : 0.88}
                  />
                  {i % xLabelInterval === 0 && (
                    <text
                      x={cx}
                      y={height - 12}
                      textAnchor="middle"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                    >
                      {p.yearMonth.slice(2)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* MoM Curve */}
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
            {points.map((p, i) => {
              const val = momGetter(p);
              if (val === null) return null;
              const cx = pad.left + stepX * i + stepX / 2;
              const cy = pad.top + ((maxPct - val) / pctRange) * plotH;
              const isHov = hoverIdx === i;
              return (
                <circle
                  key={`dot-${p.yearMonth}`}
                  cx={cx}
                  cy={cy}
                  r={isHov ? 4.5 : 2.3}
                  fill={lineColor}
                  stroke="#FFFFFF"
                  strokeWidth={isHov ? 1.5 : 0}
                  className="pointer-events-none"
                />
              );
            })}
          </svg>

          {hovered && hoverIdx !== null && (
            <div
              className="pointer-events-none absolute top-2 z-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3.5 py-2.5 shadow-xl text-xs backdrop-blur-sm min-w-[205px]"
              style={{
                left: `${Math.min(72, Math.max(16, ((hoverIdx + 0.5) / points.length) * 100))}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-mono font-semibold text-slate-900 dark:text-white mb-1.5">
                {hovered.yearMonth}
              </div>
              <div className="space-y-1 font-mono tabular-nums">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">
                    {mode === 'cost' ? '总成本:' : '客单价:'}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(barGetter(hovered), mode === 'cost')}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">
                    {mode === 'cost' ? '成本环比:' : '客单价环比:'}
                  </span>
                  <span
                    className={
                      (momGetter(hovered) ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }
                  >
                    {formatPct(momGetter(hovered), true)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">
                    {mode === 'cost' ? '占GMV比:' : '当月销量:'}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {mode === 'cost'
                      ? formatPct(hovered.costRatioToGmv)
                      : formatNumber(hovered.quantity)}
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
