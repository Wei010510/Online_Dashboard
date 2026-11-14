import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BarChart3, Briefcase, Database, Megaphone, Moon, Sun } from 'lucide-react';
import { BoardId } from '../types/bi';
import weiLogo from '../assets/w-logo.png';

interface PortalHomeProps {
  onSelectBoard: (board: BoardId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenImport: () => void;
  sourceLabel: string;
  recordCount: number;
}

const BOARDS: {
  id: BoardId;
  index: string;
  title: string;
  subtitle: string;
  description: string;
  metrics: string;
  status: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}[] = [
  {
    id: 'director',
    index: '01',
    title: '总监财报看板',
    subtitle: 'Executive Financial Overview',
    description:
      '打通核算报表明细、TL 组织架构与新老 SKU 映射表，呈现大盘 GMV、全口径成本结构、人效帕累托、年同比与月环比分析，并支持向下钻取。',
    metrics: '大盘总览 · 人效监控 · TL 占比 · 损益矩阵 · 多维下钻',
    status: '已就绪 · 核心上线',
    icon: BarChart3,
    accentClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'orders_ads',
    index: '02',
    title: '订单&广告看板',
    subtitle: 'Orders & Advertising Performance',
    description:
      '聚焦流量投放效率与订单转化漏斗，追踪站内外广告花费、ACOS/TACOS 波动、关键词投产比与客单价结构，支持日/周粒度投放归因。',
    metrics: '曝光转化 · 广告ROI · 关键词诊断 · 订单分布',
    status: '框架已搭建 · 待接入明细数据',
    icon: Megaphone,
    accentClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'supervisor',
    index: '03',
    title: '主管经营看板',
    subtitle: 'Team & SKU Operations',
    description:
      '面向 TL 与运营主管的一线经营阵地，监控小组目标达成率、OP 个人产出对比、核心 SPU 生命周期表现与库销比预警。',
    metrics: 'TL 组别PK · OP 人效 · SPU 梯队 · 异常预警',
    status: '框架已搭建 · 待接入明细数据',
    icon: Briefcase,
    accentClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
];

export const PortalHome: React.FC<PortalHomeProps> = ({
  onSelectBoard,
  isDark,
  onToggleTheme,
  onOpenImport,
  sourceLabel,
  recordCount,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Subtle architectural dot backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.25) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top Bar Contract: 3 clean zones */}
      <header className="relative z-10 max-w-[1360px] w-full mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-transparent backdrop-blur-md">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <img src={weiLogo} alt="Wei Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight">William's Online Dashboard</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          {BOARDS.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectBoard(b.id)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {b.title}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleTheme}
            aria-label="切换主题"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenImport}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>导入数据表</span>
          </button>
        </div>
      </header>

      {/* Main Entrance Content */}
      <main className="relative z-10 flex-1 max-w-[1360px] w-full mx-auto px-6 lg:px-10 py-14 lg:py-20 flex flex-col justify-center">
        {/* Animated Flash-in Hero Headline */}
        <motion.div
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-12 lg:mb-16"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
            <span>跨境电商 ERP 经营分析平台</span>
            <span aria-hidden="true">·</span>
            <span>{sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{recordCount.toLocaleString()} 条核算明细</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] [text-wrap:balance]">
            全链路经营财报与运营决策看板
          </h1>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            基于 TL 人员架构、新老 SKU 映射与月度核算报表明细构建的统一分析底座。请选择目标分析看板进入交互视图。
          </p>
        </motion.div>

        {/* Three Gradually Emerging & Gently Floating Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {BOARDS.map((board, idx) => {
            const Icon = board.icon;
            return (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, y: 32, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.75,
                  delay: 0.22 + idx * 0.18,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ animationDelay: `${idx * 0.65}s` }}
                className="bi-float-gentle flex"
              >
                <button
                  onClick={() => onSelectBoard(board.id)}
                  className="bi-card w-full group text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-7 hover:border-blue-500/40 dark:hover:border-blue-400/40 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${board.accentClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                        {board.index}
                      </span>
                    </div>

                    {/* Gradually emerging board title */}
                    <motion.h2
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.55,
                        delay: 0.45 + idx * 0.2,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="text-xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    >
                      {board.title}
                    </motion.h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {board.subtitle}
                    </div>

                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {board.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {board.metrics}
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">{board.status}</span>
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                        <span>进入看板</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
