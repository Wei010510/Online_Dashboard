# 主管经营看板实施计划

## Context

当前主管经营看板仍是 `PlaceholderBoard` 占位页和通用表格数据。此次只实现主管经营看板：使用独立、确定性的模拟财报与 SKU 映射数据，完成全部经营组件、筛选联动、批量导入追加和本地持久化。总监财报看板、订单广告看板、主页、导航及现有视觉交互保持不变。

## 实施方案

### 1. 主管专用数据与计算层

- 新建 `src/types/supervisor.ts`：定义 `SupervisorDataset`、主管明细/筛选/聚合类型；复用 `AccountingDetailRecord`、`SkuMappingRecord` 等基础类型，不改变总监类型。
- 新建 `src/data/supervisorSample.ts`：确定性生成 2024–2025 年、多 OP/PM/产品线/市场/SPU/SKU 的模拟数据及新老 SKU 映射。每次初始化和重置得到相同数据，无 API、无随机刷新变化。
- 新建 `src/utils/supervisorEngine.ts`：复用 `buildEnrichedRecords` 的 NewestSKU 修正与 SPU 前三位规则，补充主管专用聚合、筛选、月环比及格式化。
- 新建 `src/utils/supervisorParser.ts`：复用现有 Excel/CSV 读取及基础财报、SKU 解析；主管分支额外支持 `2021M11` 周期和 `单件销售额/单件成本`，不修改共享解析器的总监行为。
- 计算口径：GMV/利润/成本均为汇总；人数为 OP 去重；客单价为每行单件销售额的均值（缺失时才以该行 GMV/销量回退）；成本、广告、售后占比均为汇总后除以 GMV；月环比使用同筛选维度下的上一自然月，零分母返回空。

### 2. 主管专用看板与图表

- 新建 `src/components/supervisor/SupervisorDashboard.tsx`，提供标题“主管经营数据监控看板”及以下模块：
  - 15 项经营汇总指标。
  - 每月各成本项占 GMV 比例表。
  - OP 销量、OP GMV、月份销量、月份 GMV 四个环形图。
  - OP 九指标横向分轴条形图。
  - GMV/利润月环比：环比柱 + 当月绝对值折线，正负增长及 tooltip 完整。
  - GMV 绝对值与月差值双柱反差图；销量、利润率、客单价、广告占比、售后占比柱线趋势图。
  - OP-SPU 趋势追踪表：序号、OP、SPU 与 GMV、总成本、利润、利润率、广告%、售后%标签。
- 新建 `src/components/supervisor/SupervisorCharts.tsx`，实现主管专用 SVG 图表，复用现有 `bi-card`、`erp-scroll`、格式化函数及悬浮交互样式，不修改总监图表组件。
- 年、月、PM、产品线、市场、周期、OP、SPU、SKU 使用统一筛选状态；提供模糊搜索和一键重置。图表、表格点击写回同一状态，再次点击取消；各模块保留可切换的其他维度项，hover 展示年月、绝对值和比例。

### 3. 独立状态、持久化与导入

- `src/App.tsx` 只调整 supervisor 分支：接入新模拟数据、聚合记录、`SupervisorDashboard` 和专用更新回调；director/orders_ads 分支保持原逻辑。
- `src/utils/storage.ts` 仅扩展现有持久化联合类型，继续以 `supervisor` key 独立读写 IndexedDB；载入时校验新结构，旧通用占位缓存回退到主管模拟数据，避免异常。
- `src/components/DataImportModal.tsx` 新增 supervisor 专用分支：
  - 支持财报与 SKU 文件混选自动识别、分类批量上传、覆盖/追加合并、逐文件结果提示。
  - 追加财报生成唯一 ID，SKU 按 Country + Sku-Market + SKU 去重且后导入优先。
  - 导入后保存；刷新保持；重置清除本地修改并恢复固定模拟数据。
  - orders_ads 继续调用原 `handleGenericBatchUpload` 与通用界面，director 分支不改。

## 验证

1. 运行 TypeScript 检查与生产构建，重新生成可直接打开的 `dist/index.html`。
2. 浏览器检查全部主管模块、九类筛选、模糊搜索、图表点击联动、取消筛选、重置与 tooltip。
3. 用手算样例核对 SKU/SPU、客单价均值、成本比例、利润率和月环比。
4. 实际导入财报/SKU 样本，验证批量追加、刷新后保持及重置恢复；模拟旧 supervisor 缓存确认不报错。
5. 回归总监财报、订单广告、主页和导航，确认无行为或布局变化。
