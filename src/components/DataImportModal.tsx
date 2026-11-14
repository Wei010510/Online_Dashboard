import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  FileSpreadsheet,
  Files,
  HardDrive,
  Layers,
  Megaphone,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AccountingDetailRecord,
  BoardId,
  DataBoardId,
  DatasetBundle,
  SkuMappingRecord,
  TLRecord,
} from '../types/bi';
import { OrdersAdsDataset, OrdersAdsProductRecord } from '../types/ordersAds';
import { SupervisorDataset } from '../types/supervisor';
import {
  dedupeSkuMappings,
  dedupeTLRecords,
  detectDirectorTableType,
  parseAccountingDetailRows,
  parseSkuMappingRows,
  parseTLRows,
  readExcelRows,
} from '../utils/excelParser';
import {
  detectOrdersAdsTableType,
  parseOrdersAdsProductRows,
  parseOrdersAdsSkuRows,
  parseOrdersAdsTlRows,
} from '../utils/ordersAdsParser';
import {
  detectSupervisorTableType,
  parseSupervisorAccountingRows,
  parseSupervisorSkuRows,
} from '../utils/supervisorParser';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoard: BoardId;
  directorDataset: DatasetBundle;
  ordersAdsDataset: OrdersAdsDataset;
  supervisorDataset: SupervisorDataset;
  onUpdateDirector: (next: DatasetBundle) => void;
  onUpdateOrdersAds: (next: OrdersAdsDataset) => void;
  onUpdateSupervisor: (next: SupervisorDataset) => void;
  onResetBoard: (boardId: DataBoardId) => void;
  joinStats: { totalRows: number; skuMappedCount: number; tlMatchedCount: number };
}

type ImportMode = 'replace' | 'append';

interface BatchFileResult {
  fileName: string;
  categoryLabel: string;
  rowCount: number;
  status: 'success' | 'error';
  message?: string;
}

const TABS: {
  id: DataBoardId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'director', label: '总监财报看板', icon: BarChart3 },
  { id: 'orders_ads', label: '订单&广告看板', icon: Megaphone },
  { id: 'supervisor', label: '主管经营看板', icon: Briefcase },
];

const SUPPORTED_EXT_RE = /\.(xlsx|xls|csv)$/i;

function filterValidFiles(fileList: FileList | File[] | null | undefined): File[] {
  if (!fileList) return [];
  return Array.from(fileList).filter((f) => SUPPORTED_EXT_RE.test(f.name));
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  activeBoard,
  directorDataset,
  ordersAdsDataset,
  supervisorDataset,
  onUpdateDirector,
  onUpdateOrdersAds,
  onUpdateSupervisor,
  onResetBoard,
  joinStats,
}) => {
  const [selectedTab, setSelectedTab] = useState<DataBoardId>('director');
  const [importMode, setImportMode] = useState<ImportMode>('replace');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchFileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  // Sync default tab to the board currently open when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activeBoard === 'orders_ads' || activeBoard === 'supervisor' || activeBoard === 'director') {
        setSelectedTab(activeBoard);
      } else {
        setSelectedTab('director');
      }
      setStatusMsg(null);
      setErrorMsg(null);
      setBatchResults([]);
      setDragTarget(null);
    }
  }, [isOpen, activeBoard]);

  const isCurrentTabCustom =
    selectedTab === 'director'
      ? Boolean(directorDataset.isCustom)
      : selectedTab === 'supervisor'
      ? supervisorDataset.isCustom
      : ordersAdsDataset.isCustom;

  /**
   * Batch upload for Director Dashboard:
   * - targetType === 'auto' uses header/filename detection per file (supports mixed TL + SKU + multiple Accounting files in one batch)
   * - targetType === 'tl' | 'sku' | 'accounting' merges all selected files into that slot
   */
  const handleDirectorBatchUpload = async (
    targetType: 'auto' | 'tl' | 'sku' | 'accounting',
    rawFiles: FileList | File[] | null | undefined
  ) => {
    const files = filterValidFiles(rawFiles);
    if (files.length === 0) {
      if (rawFiles && Array.from(rawFiles).length > 0) {
        setErrorMsg('请选择 .xlsx、.xls 或 .csv 格式的表格文件。');
      }
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setBatchResults([]);

    const batchStamp = Date.now();
    const results: BatchFileResult[] = [];
    const newTLs: TLRecord[] = [];
    const newSkus: SkuMappingRecord[] = [];
    const newAccounting: AccountingDetailRecord[] = [];

    let hasTLUpdate = false;
    let hasSkuUpdate = false;
    let hasAccountingUpdate = false;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const rows = await readExcelRows(file);
          if (rows.length === 0) {
            results.push({
              fileName: file.name,
              categoryLabel: '空表格',
              rowCount: 0,
              status: 'error',
              message: '未解析到有效数据行',
            });
            continue;
          }

          const resolvedType =
            targetType === 'auto' ? detectDirectorTableType(rows, file.name) : targetType;

          if (resolvedType === 'tl') {
            const parsed = parseTLRows(rows);
            if (parsed.length === 0) {
              results.push({
                fileName: file.name,
                categoryLabel: 'TL 架构表',
                rowCount: 0,
                status: 'error',
                message: '未识别到 OP 与 TL 列',
              });
              continue;
            }
            newTLs.push(...parsed);
            hasTLUpdate = true;
            results.push({
              fileName: file.name,
              categoryLabel: 'TL 架构表',
              rowCount: parsed.length,
              status: 'success',
            });
          } else if (resolvedType === 'sku') {
            const parsed = parseSkuMappingRows(rows);
            if (parsed.length === 0) {
              results.push({
                fileName: file.name,
                categoryLabel: 'SKU 匹配表',
                rowCount: 0,
                status: 'error',
                message: '未识别到 SKU / NewestSKU 列',
              });
              continue;
            }
            newSkus.push(...parsed);
            hasSkuUpdate = true;
            results.push({
              fileName: file.name,
              categoryLabel: 'SKU 匹配表',
              rowCount: parsed.length,
              status: 'success',
            });
          } else if (resolvedType === 'accounting') {
            const parsed = parseAccountingDetailRows(rows, `IMP-${batchStamp}-${i}`);
            newAccounting.push(...parsed);
            hasAccountingUpdate = true;
            results.push({
              fileName: file.name,
              categoryLabel: '核算报表明细',
              rowCount: parsed.length,
              status: 'success',
            });
          } else {
            results.push({
              fileName: file.name,
              categoryLabel: '未识别类型',
              rowCount: rows.length,
              status: 'error',
              message: '表头未匹配 TL / SKU / 核算明细结构，请用下方对应槽位单独导入',
            });
          }
        } catch (fileErr) {
          results.push({
            fileName: file.name,
            categoryLabel: '解析异常',
            rowCount: 0,
            status: 'error',
            message: fileErr instanceof Error ? fileErr.message : '文件读取失败',
          });
        }
      }

      setBatchResults(results);

      const shouldAppend = importMode === 'append' && Boolean(directorDataset.isCustom);
      if (!hasTLUpdate && !hasSkuUpdate && !hasAccountingUpdate) {
        setErrorMsg('本批次没有可导入的有效数据文件，请查看下方文件解析详情。');
        return;
      }

      const finalTL = hasTLUpdate
        ? dedupeTLRecords(shouldAppend ? [...directorDataset.tlRecords, ...newTLs] : newTLs)
        : directorDataset.tlRecords;

      const finalSku = hasSkuUpdate
        ? dedupeSkuMappings(shouldAppend ? [...directorDataset.skuMappings, ...newSkus] : newSkus)
        : directorDataset.skuMappings;

      const finalAccounting = hasAccountingUpdate
        ? shouldAppend
          ? [...directorDataset.accountingDetails, ...newAccounting]
          : newAccounting
        : directorDataset.accountingDetails;

      const successCount = results.filter((r) => r.status === 'success').length;
      const now = new Date().toLocaleString('zh-CN');
      const parts: string[] = [];
      if (hasTLUpdate) parts.push(`TL表 ${newTLs.length} 条`);
      if (hasSkuUpdate) parts.push(`SKU匹配 ${newSkus.length} 条`);
      if (hasAccountingUpdate) parts.push(`核算明细 ${newAccounting.length} 条`);

      onUpdateDirector({
        tlRecords: finalTL,
        skuMappings: finalSku,
        accountingDetails: finalAccounting,
        sourceLabel: `批量导入 ${successCount} 个文件 (${parts.join(' · ')})`,
        updatedAt: now,
        isCustom: true,
      });

      setStatusMsg(
        `已完成总监看板批量${shouldAppend ? '追加合并' : '导入'}：成功 ${successCount}/${files.length} 个文件（${parts.join('，')}），已本地持久化`
      );
    } finally {
      setLoading(false);
    }
  };

  /** Orders&Ads: product performance, old/new SKU mapping and TL mixed batch import. */
  const handleOrdersAdsBatchUpload = async (
    targetType: 'auto' | 'product' | 'sku' | 'tl',
    rawFiles: FileList | File[] | null | undefined
  ) => {
    const files = filterValidFiles(rawFiles);
    if (files.length === 0) {
      if (rawFiles && Array.from(rawFiles).length > 0) {
        setErrorMsg('请选择 .xlsx、.xls 或 .csv 格式的表格文件。');
      }
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setBatchResults([]);

    const batchStamp = Date.now();
    const results: BatchFileResult[] = [];
    const newProducts: OrdersAdsProductRecord[] = [];
    const newSkus: SkuMappingRecord[] = [];
    const newTLs: TLRecord[] = [];
    const succeededFileNames: string[] = [];
    let hasProductUpdate = false;
    let hasSkuUpdate = false;
    let hasTLUpdate = false;

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        try {
          const rows = await readExcelRows(file);
          if (rows.length === 0) {
            results.push({ fileName: file.name, categoryLabel: '空表格', rowCount: 0, status: 'error', message: '未解析到有效数据行' });
            continue;
          }
          const resolvedType = targetType === 'auto' ? detectOrdersAdsTableType(rows, file.name) : targetType;

          if (resolvedType === 'product') {
            const parsed = parseOrdersAdsProductRows(rows, `OA-${batchStamp}-${index}`);
            if (parsed.length === 0) {
              results.push({ fileName: file.name, categoryLabel: '产品表现表', rowCount: 0, status: 'error', message: '未识别到日期、MSKU 或销售数据' });
              continue;
            }
            newProducts.push(...parsed);
            hasProductUpdate = true;
            succeededFileNames.push(file.name);
            results.push({ fileName: file.name, categoryLabel: '产品表现表', rowCount: parsed.length, status: 'success' });
          } else if (resolvedType === 'sku') {
            const parsed = parseOrdersAdsSkuRows(rows);
            if (parsed.length === 0) {
              results.push({ fileName: file.name, categoryLabel: '新老SKU匹配表', rowCount: 0, status: 'error', message: '未识别到 SKU / NewestSKU 列' });
              continue;
            }
            newSkus.push(...parsed);
            hasSkuUpdate = true;
            succeededFileNames.push(file.name);
            results.push({ fileName: file.name, categoryLabel: '新老SKU匹配表', rowCount: parsed.length, status: 'success' });
          } else if (resolvedType === 'tl') {
            const parsed = parseOrdersAdsTlRows(rows);
            if (parsed.length === 0) {
              results.push({ fileName: file.name, categoryLabel: 'TL架构表', rowCount: 0, status: 'error', message: '未识别到 OP / TL 列' });
              continue;
            }
            newTLs.push(...parsed);
            hasTLUpdate = true;
            succeededFileNames.push(file.name);
            results.push({ fileName: file.name, categoryLabel: 'TL架构表', rowCount: parsed.length, status: 'success' });
          } else {
            results.push({ fileName: file.name, categoryLabel: '未识别类型', rowCount: rows.length, status: 'error', message: '请使用下方产品表现、SKU或TL分类槽位导入' });
          }
        } catch (fileErr) {
          results.push({ fileName: file.name, categoryLabel: '解析异常', rowCount: 0, status: 'error', message: fileErr instanceof Error ? fileErr.message : '文件读取失败' });
        }
      }

      setBatchResults(results);
      if (!hasProductUpdate && !hasSkuUpdate && !hasTLUpdate) {
        setErrorMsg('本批次没有可导入的有效数据文件，请查看文件解析详情。');
        return;
      }

      const shouldAppend = importMode === 'append' && ordersAdsDataset.isCustom;
      const mergedProducts = hasProductUpdate
        ? shouldAppend ? [...ordersAdsDataset.productRecords, ...newProducts] : newProducts
        : ordersAdsDataset.productRecords;
      const productMap = new Map<string, OrdersAdsProductRecord>();
      mergedProducts.forEach((record) => {
        const key = `${record.日期}__${record.国家}__${record.MSKU}__${record.ASIN}__${record.SKU}`.toUpperCase();
        productMap.set(key, record);
      });
      const finalProducts = hasProductUpdate ? Array.from(productMap.values()) : mergedProducts;
      const finalSkus = hasSkuUpdate
        ? dedupeSkuMappings(shouldAppend ? [...ordersAdsDataset.skuMappings, ...newSkus] : newSkus)
        : ordersAdsDataset.skuMappings;
      const finalTLs = hasTLUpdate
        ? dedupeTLRecords(shouldAppend ? [...ordersAdsDataset.tlRecords, ...newTLs] : newTLs)
        : ordersAdsDataset.tlRecords;
      const previousFileNames = shouldAppend ? ordersAdsDataset.fileNames : [];
      const allFileNames = Array.from(new Set([...previousFileNames, ...succeededFileNames]));
      const successCount = results.filter((result) => result.status === 'success').length;
      const parts: string[] = [];
      if (hasProductUpdate) parts.push(`产品表现 ${newProducts.length} 条`);
      if (hasSkuUpdate) parts.push(`SKU匹配 ${newSkus.length} 条`);
      if (hasTLUpdate) parts.push(`TL ${newTLs.length} 条`);

      onUpdateOrdersAds({
        boardId: 'orders_ads',
        productRecords: finalProducts,
        skuMappings: finalSkus,
        tlRecords: finalTLs,
        sourceLabel: `订单广告批量导入 ${successCount} 个文件 (${parts.join(' · ')})`,
        fileNames: allFileNames,
        updatedAt: new Date().toLocaleString('zh-CN'),
        isCustom: true,
      });
      setStatusMsg(`已完成订单&广告看板批量${shouldAppend ? '追加合并' : '导入'}：${parts.join('，')}；当前产品表现 ${finalProducts.length.toLocaleString()} 行，刷新网页不会丢失`);
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorBatchUpload = async (
    targetType: 'auto' | 'sku' | 'accounting',
    rawFiles: FileList | File[] | null | undefined
  ) => {
    const files = filterValidFiles(rawFiles);
    if (files.length === 0) {
      if (rawFiles && Array.from(rawFiles).length > 0) {
        setErrorMsg('请选择 .xlsx、.xls 或 .csv 格式的表格文件。');
      }
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setBatchResults([]);

    const batchStamp = Date.now();
    const results: BatchFileResult[] = [];
    const newSkus: SkuMappingRecord[] = [];
    const newAccounting: SupervisorDataset['accountingDetails'] = [];
    const succeededFileNames: string[] = [];
    let hasSkuUpdate = false;
    let hasAccountingUpdate = false;

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        try {
          const rows = await readExcelRows(file);
          if (rows.length === 0) {
            results.push({ fileName: file.name, categoryLabel: '空表格', rowCount: 0, status: 'error', message: '未解析到有效数据行' });
            continue;
          }
          const resolvedType = targetType === 'auto' ? detectSupervisorTableType(rows, file.name) : targetType;
          if (resolvedType === 'sku') {
            const parsed = parseSupervisorSkuRows(rows);
            if (parsed.length === 0) {
              results.push({ fileName: file.name, categoryLabel: '新老SKU匹配表', rowCount: 0, status: 'error', message: '未识别到 SKU / NewestSKU 列' });
              continue;
            }
            newSkus.push(...parsed);
            hasSkuUpdate = true;
            succeededFileNames.push(file.name);
            results.push({ fileName: file.name, categoryLabel: '新老SKU匹配表', rowCount: parsed.length, status: 'success' });
          } else if (resolvedType === 'accounting') {
            const parsed = parseSupervisorAccountingRows(rows, `SUP-IMP-${batchStamp}-${index}`);
            newAccounting.push(...parsed);
            hasAccountingUpdate = true;
            succeededFileNames.push(file.name);
            results.push({ fileName: file.name, categoryLabel: '核算报表明细', rowCount: parsed.length, status: 'success' });
          } else {
            results.push({ fileName: file.name, categoryLabel: '未识别类型', rowCount: rows.length, status: 'error', message: '请使用下方对应表类型单独导入' });
          }
        } catch (fileError) {
          results.push({ fileName: file.name, categoryLabel: '解析异常', rowCount: 0, status: 'error', message: fileError instanceof Error ? fileError.message : '文件读取失败' });
        }
      }

      setBatchResults(results);
      if (!hasSkuUpdate && !hasAccountingUpdate) {
        setErrorMsg('本批次没有可导入的主管财报或 SKU 数据，请查看文件解析详情。');
        return;
      }

      const shouldAppend = importMode === 'append';
      const finalSkus = hasSkuUpdate
        ? dedupeSkuMappings(shouldAppend ? [...supervisorDataset.skuMappings, ...newSkus] : newSkus)
        : supervisorDataset.skuMappings;
      const finalAccounting = hasAccountingUpdate
        ? shouldAppend
          ? [...supervisorDataset.accountingDetails, ...newAccounting]
          : newAccounting
        : supervisorDataset.accountingDetails;
      const allFileNames = Array.from(new Set([
        ...(shouldAppend ? supervisorDataset.fileNames : []),
        ...succeededFileNames,
      ]));
      const successCount = results.filter((result) => result.status === 'success').length;
      const parts: string[] = [];
      if (hasAccountingUpdate) parts.push(`财报 ${newAccounting.length} 条`);
      if (hasSkuUpdate) parts.push(`SKU匹配 ${newSkus.length} 条`);

      onUpdateSupervisor({
        boardId: 'supervisor',
        skuMappings: finalSkus,
        accountingDetails: finalAccounting,
        sourceLabel: `主管批量导入 ${successCount} 个文件 (${parts.join(' · ')})`,
        fileNames: allFileNames,
        updatedAt: new Date().toLocaleString('zh-CN'),
        isCustom: true,
      });
      setStatusMsg(`已完成主管看板批量${shouldAppend ? '追加合并' : '导入'}：成功 ${successCount}/${files.length} 个文件（${parts.join('，')}），当前财报 ${finalAccounting.length.toLocaleString()} 行，刷新网页不会丢失`);
    } finally {
      setLoading(false);
    }
  };

  const ordersAdsSlots = [
    {
      key: 'product' as const,
      title: '产品表现表',
      count: `${ordersAdsDataset.productRecords.length} 条明细`,
      hint: '日期、MSKU、国家、销量、订单量、销售额、展示、点击及广告字段，支持多日文件合并',
    },
    {
      key: 'sku' as const,
      title: '新老 SKU 匹配表',
      count: `${ordersAdsDataset.skuMappings.length} 条规则`,
      hint: '按 Country + Sku-Market + SKU 关联，老SKU自动替换为NewestSKU',
    },
    {
      key: 'tl' as const,
      title: 'TL 架构表',
      count: `${ordersAdsDataset.tlRecords.length} 条OP映射`,
      hint: '必需字段：OP、TL；用于生成TL日销量与日销售额趋势追踪',
    },
  ];

  const supervisorSlots = [
    {
      key: 'accounting' as const,
      title: '核算报表明细',
      count: `${supervisorDataset.accountingDetails.length} 条明细`,
      hint: '支持 2021M11 周期、单件销售额/单件成本及多月文件批量追加',
    },
    {
      key: 'sku' as const,
      title: '新老 SKU 匹配表',
      count: `${supervisorDataset.skuMappings.length} 条规则`,
      hint: '按 Country + Sku-Market + SKU 去重，追加时后导入规则优先',
    },
  ];

  const directorSlots = [
    {
      key: 'tl' as const,
      title: '1. TL 架构表 (TL.xlsx)',
      count: `${directorDataset.tlRecords.length} 条 OP 映射`,
      hint: '支持多文件批量选择/拖入合并；必需字段: OP, TL',
    },
    {
      key: 'sku' as const,
      title: '2. 新老 SKU 匹配表',
      count: `${directorDataset.skuMappings.length} 条 SKU 规则`,
      hint: '支持多文件批量合并去重；必需字段: Country, Sku-Market, SKU, NewestSKU',
    },
    {
      key: 'accounting' as const,
      title: '3. 核算报表明细表 (支持多年/多月文件一次合并)',
      count: `${directorDataset.accountingDetails.length} 条明细`,
      hint: '可一次选中 2021 / 2023 / 2024 / 2025 等多个年份或月份明细文件批量合并',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="import-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 dark:bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            key="import-panel"
            initial={{ opacity: 0, y: 28, scale: 0.95, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  独立批量数据导入与持久化中心
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  全看板均支持多文件批量拖拽/选择合并；数据独立存储于本地，刷新页面不会消失
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Independent Board Switcher Tabs + Import Mode Switch */}
            <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isTabActive = selectedTab === tab.id;
                  const hasCustom =
                    tab.id === 'director'
                      ? Boolean(directorDataset.isCustom)
                      : tab.id === 'orders_ads'
                      ? ordersAdsDataset.isCustom
                      : supervisorDataset.isCustom;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedTab(tab.id);
                        setStatusMsg(null);
                        setErrorMsg(null);
                        setBatchResults([]);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                        isTabActive
                          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/40 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-white/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {hasCustom && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                          · 已存
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Batch Mode Selector: Replace vs Append */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    importMode === 'replace'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  批量覆盖
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    importMode === 'append'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>追加合并</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto erp-scroll">
              {/* Persistence & Source Status Bar */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>
                      {isCurrentTabCustom
                        ? '本地持久化已开启（刷新网页数据保留）'
                        : selectedTab === 'director'
                        ? '当前使用内置演示数据集（首次批量导入将自动替换演示数据）'
                        : selectedTab === 'supervisor'
                        ? '当前使用主管固定模拟数据（刷新网页保持不变）'
                        : '当前使用订单广告固定模拟数据（刷新网页保持不变）'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                    {selectedTab === 'director'
                      ? directorDataset.sourceLabel
                      : selectedTab === 'supervisor'
                      ? supervisorDataset.sourceLabel
                      : ordersAdsDataset.sourceLabel}
                  </div>
                </div>

                {selectedTab === 'director' ? (
                  <div className="flex items-center gap-5 font-mono tabular-nums shrink-0">
                    <div>
                      <div className="text-slate-400">明细行数</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {joinStats.totalRows.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">SKU 命中</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {joinStats.skuMappedCount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">TL 命中</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {joinStats.tlMatchedCount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : selectedTab === 'supervisor' ? (
                  <div className="flex items-center gap-5 font-mono tabular-nums shrink-0">
                    <div>
                      <div className="text-slate-400">财报行数</div>
                      <div className="font-bold text-slate-900 dark:text-white">{supervisorDataset.accountingDetails.length.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">SKU 规则</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">{supervisorDataset.skuMappings.length.toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-5 font-mono tabular-nums shrink-0">
                    <div>
                      <div className="text-slate-400">产品表现行数</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {ordersAdsDataset.productRecords.length.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">SKU / TL规则</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {ordersAdsDataset.skuMappings.length} / {ordersAdsDataset.tlRecords.length}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {statusMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusMsg}</span>
                </motion.div>
              )}

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* Tab Content: Director vs Orders&Ads vs Supervisor */}
              {selectedTab === 'director' ? (
                <div className="space-y-3">
                  {/* Unified Smart Mixed-Batch Dropzone */}
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragTarget('director-auto');
                    }}
                    onDragLeave={() => setDragTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragTarget(null);
                      void handleDirectorBatchUpload('auto', e.dataTransfer.files);
                    }}
                    className={`block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                      dragTarget === 'director-auto'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {loading
                          ? '正在批量解析与表关联合并...'
                          : '一键智能批量导入（拖入或一次多选多个 Excel / CSV 文件）'}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                        支持同时混选 TL.xlsx、新老SKU匹配表 及多个年份/月份的核算明细表，系统将自动识别表结构并合并入库
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      disabled={loading}
                      onChange={(e) => {
                        void handleDirectorBatchUpload('auto', e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {/* Individual Slots (Each ALSO supports multi-file batch select & drag-drop) */}
                  {directorSlots.map((slot, idx) => (
                    <motion.div
                      key={slot.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: 0.08 + idx * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragTarget(`slot-${slot.key}`);
                      }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragTarget(null);
                        void handleDirectorBatchUpload(slot.key, e.dataTransfer.files);
                      }}
                      className={`bi-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        dragTarget === `slot-${slot.key}`
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {slot.title}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                            ({slot.count})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{slot.hint}</p>
                      </div>

                      <label className="shrink-0 cursor-pointer px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors">
                        <Files className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{loading ? '解析中...' : '批量上传'}</span>
                        <input
                          type="file"
                          multiple
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          disabled={loading}
                          onChange={(e) => {
                            void handleDirectorBatchUpload(slot.key, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </motion.div>
                  ))}
                </div>
              ) : selectedTab === 'supervisor' ? (
                <motion.div
                  key="supervisor-import"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3"
                >
                  <label
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragTarget('supervisor-auto');
                    }}
                    onDragLeave={() => setDragTarget(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragTarget(null);
                      void handleSupervisorBatchUpload('auto', event.dataTransfer.files);
                    }}
                    className={`block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                      dragTarget === 'supervisor-auto'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{loading ? '正在解析主管财报与 SKU 表...' : '主管看板智能混合批量导入'}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">一次混选多个月份核算报表与新老 SKU 匹配表，自动识别、关联并独立保存，不影响总监和订单看板。</p>
                    </div>
                    <input type="file" multiple accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={(event) => { void handleSupervisorBatchUpload('auto', event.target.files); event.target.value = ''; }} />
                  </label>

                  {supervisorSlots.map((slot) => (
                    <div
                      key={slot.key}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragTarget(`supervisor-${slot.key}`);
                      }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragTarget(null);
                        void handleSupervisorBatchUpload(slot.key, event.dataTransfer.files);
                      }}
                      className={`bi-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${dragTarget === `supervisor-${slot.key}` ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" /><span className="text-sm font-semibold text-slate-900 dark:text-white">{slot.title}</span><span className="font-mono text-[11px] text-slate-400">({slot.count})</span></div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{slot.hint}</p>
                      </div>
                      <label className="shrink-0 cursor-pointer px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                        <Files className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /><span>{loading ? '解析中...' : '批量上传'}</span>
                        <input type="file" multiple accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={(event) => { void handleSupervisorBatchUpload(slot.key, event.target.files); event.target.value = ''; }} />
                      </label>
                    </div>
                  ))}

                  {supervisorDataset.isCustom && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-4 py-3 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-slate-800 dark:text-slate-200">主管已存文件清单 ({supervisorDataset.fileNames.length} 个)</span><span className="font-mono text-[11px] text-slate-400">更新时间 {supervisorDataset.updatedAt}</span></div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] break-all">{supervisorDataset.fileNames.join(' · ')}</div>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Orders&Ads structured three-table batch import */
                <motion.div
                  key="orders-ads-import"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3"
                >
                  <label
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragTarget('orders-ads-auto');
                    }}
                    onDragLeave={() => setDragTarget(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragTarget(null);
                      void handleOrdersAdsBatchUpload('auto', event.dataTransfer.files);
                    }}
                    className={`block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${dragTarget === 'orders-ads-auto' ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10' : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-slate-800/40'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{loading ? '正在解析产品表现、SKU与TL表...' : '订单&广告看板智能混合批量导入'}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">一次混选产品表现、新老SKU匹配和TL表，自动识别并按规则关联，独立保存不影响其他看板。</p>
                    </div>
                    <input type="file" multiple accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={(event) => { void handleOrdersAdsBatchUpload('auto', event.target.files); event.target.value = ''; }} />
                  </label>

                  {ordersAdsSlots.map((slot) => (
                    <div
                      key={slot.key}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragTarget(`orders-ads-${slot.key}`);
                      }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragTarget(null);
                        void handleOrdersAdsBatchUpload(slot.key, event.dataTransfer.files);
                      }}
                      className={`bi-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${dragTarget === `orders-ads-${slot.key}` ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" /><span className="text-sm font-semibold text-slate-900 dark:text-white">{slot.title}</span><span className="font-mono text-[11px] text-slate-400">({slot.count})</span></div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{slot.hint}</p>
                      </div>
                      <label className="shrink-0 cursor-pointer px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                        <Files className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /><span>{loading ? '解析中...' : '批量上传'}</span>
                        <input type="file" multiple accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={(event) => { void handleOrdersAdsBatchUpload(slot.key, event.target.files); event.target.value = ''; }} />
                      </label>
                    </div>
                  ))}

                  {ordersAdsDataset.isCustom && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-4 py-3 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-slate-800 dark:text-slate-200">订单广告已存文件清单 ({ordersAdsDataset.fileNames.length} 个)</span><span className="font-mono text-[11px] text-slate-400">更新时间 {ordersAdsDataset.updatedAt}</span></div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] break-all">{ordersAdsDataset.fileNames.join(' · ')}</div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Per-file Batch Parse Log */}
              {batchResults.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>本次批量导入明细 ({batchResults.length} 个文件)</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      成功 {batchResults.filter((r) => r.status === 'success').length} · 失败{' '}
                      {batchResults.filter((r) => r.status === 'error').length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-40 overflow-y-auto erp-scroll text-xs">
                    {batchResults.map((res, idx) => (
                      <div
                        key={`${res.fileName}-${idx}`}
                        className="px-4 py-2 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              res.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                            {res.fileName}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            · {res.categoryLabel}
                          </span>
                        </div>
                        <div className="shrink-0 font-mono tabular-nums">
                          {res.status === 'success' ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{res.rowCount.toLocaleString()} 行
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-sans">
                              {res.message}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/40">
              <button
                onClick={() => {
                  onResetBoard(selectedTab);
                  const tabLabel = TABS.find((t) => t.id === selectedTab)?.label ?? '';
                  setStatusMsg(
                    selectedTab === 'director'
                      ? `已重置「${tabLabel}」为内置演示数据，并清除本地持久化缓存`
                      : selectedTab === 'supervisor' || selectedTab === 'orders_ads'
                      ? `已重置「${tabLabel}」为固定模拟数据，并清除本地持久化缓存`
                      : `已重置并清空「${tabLabel}」的本地持久化数据`
                  );
                  setErrorMsg(null);
                  setBatchResults([]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  重置「{TABS.find((t) => t.id === selectedTab)?.label}」数据
                </span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                完成并返回看板
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
