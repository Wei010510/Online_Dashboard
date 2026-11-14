import React, { useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, Database, Megaphone, RotateCcw, Search } from 'lucide-react';
import { BoardTableDataset } from '../types/bi';

interface PlaceholderBoardProps {
  boardId: 'orders_ads' | 'supervisor';
  boardData: BoardTableDataset;
  onBackDirector: () => void;
  onOpenImport: () => void;
  onResetData: () => void;
}

const BOARD_META = {
  orders_ads: {
    title: '订单 & 广告看板',
    subtitle: 'Orders & Advertising Analytics Framework',
    icon: Megaphone,
    summary:
      '本板块使用完全独立的订单与广告数据源，导入后将在浏览器本地持久化保存，刷新页面不会丢失（仅在点击「重置数据」时清空）。',
    plannedModules: [
      { name: '广告花费与 Tcos / ACOS 联动监控', detail: '按站点、广告活动类型与匹配方式追踪投入产出比' },
      { name: '订单转化漏斗与客单价分层', detail: '曝光 -> 点击 -> 加购 -> 转化率全链路诊断' },
      { name: '自然流量 vs 广告流量占比趋势', detail: '评估新品期与成熟期流量结构健康度' },
      { name: '高消耗低转化 SKU 预警清单', detail: '自动识别超出目标 ACOS 阈值的投放单元' },
    ],
  },
  supervisor: {
    title: '主管经营看板',
    subtitle: 'Supervisor & Team Operations Framework',
    icon: Briefcase,
    summary:
      '本板块使用完全独立的主管经营数据源，导入后将在浏览器本地持久化保存，刷新页面不会丢失（仅在点击「重置数据」时清空）。',
    plannedModules: [
      { name: 'TL 组别月度目标达成进度', detail: 'GMV 目标、利润目标与人效基线实时达成率' },
      { name: 'OP 个人经营表现四象限', detail: '横向对比同组 OP 的销售额人效、利润率与广告控制力' },
      { name: '重点 SPU 毛利与退货率跟踪', detail: '定位影响组别利润率的核心 SPU 与售后异常款' },
      { name: 'FBA 仓租与库龄结构监控', detail: '提前预警滞销库存产生的仓租与长期仓储费压力' },
    ],
  },
};

export const PlaceholderBoard: React.FC<PlaceholderBoardProps> = ({
  boardId,
  boardData,
  onBackDirector,
  onOpenImport,
  onResetData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const meta = BOARD_META[boardId];
  const Icon = meta.icon;

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return boardData.rows.slice(0, 200);
    const q = searchQuery.trim().toLowerCase();
    return boardData.rows
      .filter((row) =>
        Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
      )
      .slice(0, 200);
  }, [boardData.rows, searchQuery]);

  return (
    <div className="w-full px-5 lg:px-10 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{meta.subtitle}</span>
              <span aria-hidden="true">·</span>
              <span>{boardData.isCustom ? `已持久化: ${boardData.fileName}` : '待接入数据'}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {meta.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {boardData.isCustom && (
            <button
              onClick={onResetData}
              className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-900 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置本看板数据</span>
            </button>
          )}
          <button
            onClick={onOpenImport}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500/50 transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <span>{boardData.isCustom ? '批量导入 / 追加数据' : '批量导入本看板数据'}</span>
          </button>
          <button
            onClick={onBackDirector}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>前往总监财报看板</span>
          </button>
        </div>
      </div>

      {boardData.isCustom && boardData.rows.length > 0 ? (
        /* Populated Persisted Table View */
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                已导入独立数据集预览（刷新页面永久保留）
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {boardData.fileNames && boardData.fileNames.length > 1
                  ? `已合并 ${boardData.fileNames.length} 个文件 (${boardData.fileNames.join('、')})`
                  : `文件: ${boardData.fileName}`}{' '}
                · 共 {boardData.rows.length.toLocaleString()} 行 × {boardData.columns.length} 列 ·
                导入时间 {boardData.updatedAt}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索表格内容..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto erp-scroll max-h-[460px] rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  {boardData.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono tabular-nums">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                    {boardData.columns.map((col) => (
                      <td
                        key={col}
                        className="py-2 px-3 text-slate-700 dark:text-slate-200 whitespace-nowrap max-w-[260px] truncate"
                      >
                        {String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {boardData.rows.length > 200 && (
            <div className="text-[11px] text-slate-400 text-right tabular-nums">
              当前展示前 {filteredRows.length} 条匹配记录（全部 {boardData.rows.length.toLocaleString()} 条均已保存至本地浏览器存储）
            </div>
          )}
        </div>
      ) : (
        <div className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">模块定位与独立数据接入</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            {meta.summary}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {meta.plannedModules.map((mod, i) => (
          <div
            key={mod.name}
            className="bi-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 hover:border-blue-500/30"
          >
            <div className="font-mono text-xs text-slate-400 dark:text-slate-500 mb-2">
              0{i + 1}
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{mod.name}</h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {mod.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
