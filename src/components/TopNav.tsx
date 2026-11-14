import React, { useState } from 'react';
import {
  BarChart3,
  Briefcase,
  Database,
  Home,
  Megaphone,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { BoardId } from '../types/bi';
import weiLogo from '../assets/w-logo.png';

interface TopNavProps {
  activeBoard: BoardId;
  onSelectBoard: (board: BoardId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenImport: () => void;
  recordCount: number;
}

const BOARD_LINKS: {
  id: BoardId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'director', label: '总监财报看板', icon: BarChart3 },
  { id: 'orders_ads', label: '订单&广告看板', icon: Megaphone },
  { id: 'supervisor', label: '主管经营看板', icon: Briefcase },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeBoard,
  onSelectBoard,
  isDark,
  onToggleTheme,
  onOpenImport,
  recordCount,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md">
      <div className="w-full h-full px-5 lg:px-10 flex items-center justify-between gap-6">
        {/* Left: Clean single-line brand wordmark */}
        <button
          onClick={() => onSelectBoard('home')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <img src={weiLogo} alt="Wei Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            William's Online Dashboard
          </span>
        </button>

        {/* Top-Right Corner: All Former Sidebar Navigation & Controls */}
        <div className="hidden lg:flex items-center gap-5 shrink-0">
          {/* Board Links + Home */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectBoard('home')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Home className="w-3.5 h-3.5" />
              <span>返回主页</span>
            </button>

            <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" aria-hidden="true" />

            {BOARD_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive = activeBoard === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectBoard(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/30'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

          {/* Data Import & Theme Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenImport}
              title={`当前已关联 ${recordCount.toLocaleString()} 条核算明细`}
              className="px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>导入数据表</span>
            </button>

            <button
              onClick={onToggleTheme}
              title={isDark ? '切换亮白模式' : '切换夜间模式'}
              aria-label="切换主题"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Top-Right Trigger */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          <button
            onClick={onOpenImport}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5" />
            <span>导入数据</span>
          </button>
          <button
            onClick={onToggleTheme}
            aria-label="切换主题"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="展开导航菜单"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-5 py-3 space-y-1.5 shadow-lg">
          <button
            onClick={() => {
              onSelectBoard('home');
              setMobileOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Home className="w-4 h-4" />
            <span>返回主页</span>
          </button>
          {BOARD_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = activeBoard === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectBoard(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
