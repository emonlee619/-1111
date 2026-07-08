"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ConsoleCard } from "@/components/ui/ConsoleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RiskLevelBadge } from "@/components/ui/RiskLevelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchConfig,
  fetchCultureBoard,
  fetchDoublePreventionOverview,
  fetchEscalations,
  fetchHazard,
  fetchHazards,
  fetchMeasures,
  fetchReviews,
  fetchRiskCard,
  fetchRiskCards,
  fetchRiskControls,
  fetchRiskMap,
  fetchWorkflow,
} from "@/lib/doublePreventionApi";
import { doublePreventionContractMatrix } from "@/data/doublePreventionContract";
import type { HazardLedgerItem, KeyValueItem, RiskCard, RiskControlItem } from "@/types/business";
import {
  BoundaryCard,
  DataTable,
  DetailActions,
  DoublePreventionShell,
  FilterBar,
  KeyValueGrid,
  matchKeyword,
  ResourceState,
  RiskLevelSelect,
  RiskTableLink,
  SearchBox,
  SelectFilter,
  SourceBadge,
  uniqueOptions,
  useApiResource,
  WorkflowStrip,
} from "./shared";

function metrics(items: Array<{ label: string; value: string; hint: string; risk?: "low" | "normal" | "high" | "critical" }>) {
  return items;
}

function filterRiskItems<T extends { riskLevel: string; regionName: string; ownerUnit: string; name?: string; id: string; measureSummary?: string }>(
  items: T[],
  filters: { risk: string; region: string; owner: string; keyword: string },
) {
  return items.filter((item) => {
    const riskOk = filters.risk === "all" || item.riskLevel === filters.risk;
    const regionOk = filters.region === "all" || item.regionName === filters.region;
    const ownerOk = filters.owner === "all" || item.ownerUnit === filters.owner;
    const keywordOk = matchKeyword([item.id, item.name, item.regionName, item.ownerUnit, item.measureSummary], filters.keyword);
    return riskOk && regionOk && ownerOk && keywordOk;
  });
}

function hazardRows(hazards: HazardLedgerItem[], filters: { risk: string; step: string; status: string; overdue: string; keyword: string }) {
  return hazards.filter((item) => {
    const riskOk = filters.risk === "all" || item.riskLevel === filters.risk;
    const stepOk = filters.step === "all" || item.currentStep === filters.step;
    const statusOk = filters.status === "all" || item.status === filters.status;
    const overdueOk = filters.overdue === "all" || (filters.overdue === "overdue" ? item.overdueDays > 0 : item.overdueDays === 0);
    const keywordOk = matchKeyword([item.id, item.description, item.regionName, item.owner, item.ownerUnit, item.measureSummary], filters.keyword);
    return riskOk && stepOk && statusOk && overdueOk && keywordOk;
  });
}

export function DoublePreventionOverview() {
  const resource = useApiResource(fetchDoublePreventionOverview);
  return (
    <DoublePreventionShell routePath="/double-prevention">
      <ResourceState {...resource}>
        {(overview) => (
          <div className="grid min-w-0 gap-5">
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics([
                { label: "风险管控项", value: String(overview.riskControlCount), hint: "mock API /risk-controls", risk: "high" },
                { label: "隐患台账", value: String(overview.hazardCount), hint: "mock API /hazards" },
                { label: "逾期事项", value: String(overview.overdueCount), hint: "仅页面提醒，不发通知", risk: "critical" },
                { label: "复盘案例", value: String(overview.reviewCount), hint: "独立于八步闭环" },
              ]).map((metric) => (
                <ConsoleCard key={metric.label}>
                  <p className="text-sm font-medium text-muted">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-ink">{metric.value}</p>
                  <p className="mt-2 text-sm text-muted">{metric.hint}</p>
                </ConsoleCard>
              ))}
            </div>
            <ConsoleCard title="双控业务链路" description="按风险分级管控和隐患排查治理闭环组织展示，不触发真实处置。">
              <div className="grid gap-3 md:grid-cols-4">
                {["风险识别", "风险告知", "隐患治理", "闭环复盘"].map((item, index) => (
                  <div key={item} className="rounded-[14px] border border-line bg-card p-4">
                    <p className="text-xs font-medium text-primary">0{index + 1}</p>
                    <p className="mt-2 text-base font-semibold text-ink">{item}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">通过 mock API 只读展示，保留人工复核边界。</p>
                  </div>
                ))}
              </div>
            </ConsoleCard>
            <BoundaryCard items={[overview.boundary, "B01-B41 只作为物理约束生成指标辅助复核，不写成真实传感器。", "复盘不作为第九步，单独进入 /double-prevention/review。"]} />
            <ContractMatrixPanel compact />
          </div>
        )}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function RiskControlWorkspace() {
  const resource = useApiResource(fetchRiskControls);
  const [filters, setFilters] = useState({ risk: "all", region: "all", owner: "all", keyword: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <DoublePreventionShell routePath="/double-prevention/risk-control">
      <ResourceState {...resource}>
        {(items) => {
          const rows = filterRiskItems(items, filters);
          const selected = items.find((item) => item.id === selectedId) ?? rows[0] ?? null;
          return (
            <div className="grid min-w-0 gap-5 xl:grid-cols-[1.4fr_0.8fr]">
              <ConsoleCard title="风险辨识清单" description="筛选只作用于前端 mock API 返回数据。">
                <FilterBar>
                  <RiskLevelSelect value={filters.risk} onChange={(risk) => setFilters({ ...filters, risk })} />
                  <SelectFilter label="区域" value={filters.region} options={uniqueOptions(items.map((item) => item.regionName))} onChange={(region) => setFilters({ ...filters, region })} />
                  <SelectFilter label="责任单位" value={filters.owner} options={uniqueOptions(items.map((item) => item.ownerUnit))} onChange={(owner) => setFilters({ ...filters, owner })} />
                  <SearchBox value={filters.keyword} onChange={(keyword) => setFilters({ ...filters, keyword })} />
                </FilterBar>
                <DataTable
                  headers={["编号", "风险名称", "等级", "区域", "责任单位", "来源", "告知卡"]}
                  rows={rows.map((item) => [
                    <button key="id" className="font-semibold text-primary" onClick={() => setSelectedId(item.id)}>{item.id}</button>,
                    item.name,
                    <RiskLevelBadge key="risk" level={item.riskLevel} />,
                    item.regionName,
                    item.ownerUnit,
                    <SourceBadge key="source" sourceType={item.sourceType} />,
                    <RiskTableLink key="link" href={`/double-prevention/risk-cards/${item.id}`}>查看</RiskTableLink>,
                  ])}
                />
              </ConsoleCard>
              <ConsoleCard title="风险项摘要" description="点击左侧风险项后联动展示。">
                {selected ? <RiskSummary item={selected} /> : <EmptyState title="无匹配风险项" />}
              </ConsoleCard>
            </div>
          );
        }}
      </ResourceState>
    </DoublePreventionShell>
  );
}

function RiskSummary({ item }: { item: RiskControlItem }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <RiskLevelBadge level={item.riskLevel} />
        <SourceBadge sourceType={item.sourceType} />
        {item.needsHumanReview ? <StatusBadge tone="warning">需人工复核</StatusBadge> : <StatusBadge tone="success">只读展示</StatusBadge>}
      </div>
      <KeyValueGrid items={[
        { label: "风险名称", value: item.name },
        { label: "区域", value: item.regionName },
        { label: "责任单位", value: item.ownerUnit },
        { label: "责任人", value: item.responsiblePerson },
        { label: "检查频次", value: item.inspectionFrequency },
        { label: "管控措施", value: item.measureSummary },
        { label: "触发来源", value: item.triggerSource },
        { label: "支撑真实通道", value: item.supportingRealChannels.join("、") || "无" },
      ]} />
      <Link className="inline-flex rounded-[12px] border border-line bg-surface px-4 py-2 text-sm font-semibold text-primary" href={`/double-prevention/risk-cards/${item.id}`}>
        关联风险告知卡
      </Link>
    </div>
  );
}

export function RiskMapPanel() {
  const resource = useApiResource(fetchRiskMap);
  const [region, setRegion] = useState("all");
  return (
    <DoublePreventionShell routePath="/double-prevention/risk-map">
      <ResourceState {...resource}>
        {(items) => {
          const rows = items.filter((item) => region === "all" || item.regionName === region);
          return (
            <ConsoleCard title="风险四色图" description="mock 区域网格，不使用真实矿区精确坐标。">
              <FilterBar>
                <SelectFilter label="区域" value={region} options={uniqueOptions(items.map((item) => item.regionName))} onChange={setRegion} />
              </FilterBar>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {rows.map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-line bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">{item.regionName}</p>
                      <RiskLevelBadge level={item.riskLevel} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted">{item.riskPoint}</p>
                    <p className="mt-2 text-sm text-ink">{item.measureSummary}</p>
                    <div className="mt-3"><SourceBadge sourceType={item.sourceType} /></div>
                  </div>
                ))}
              </div>
            </ConsoleCard>
          );
        }}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function RiskCardList() {
  const resource = useApiResource(fetchRiskCards);
  const [filters, setFilters] = useState({ risk: "all", region: "all", owner: "all", keyword: "" });
  return (
    <DoublePreventionShell routePath="/double-prevention/risk-cards">
      <ResourceState {...resource}>
        {(items) => {
          const rows = filterRiskItems(items, filters);
          return (
            <ConsoleCard title="风险告知卡列表" description="点击编号进入动态 ID 详情。">
              <FilterBar>
                <RiskLevelSelect value={filters.risk} onChange={(risk) => setFilters({ ...filters, risk })} />
                <SelectFilter label="区域" value={filters.region} options={uniqueOptions(items.map((item) => item.regionName))} onChange={(region) => setFilters({ ...filters, region })} />
                <SelectFilter label="责任单位" value={filters.owner} options={uniqueOptions(items.map((item) => item.ownerUnit))} onChange={(owner) => setFilters({ ...filters, owner })} />
                <SearchBox value={filters.keyword} onChange={(keyword) => setFilters({ ...filters, keyword })} />
              </FilterBar>
              <DataTable headers={["告知卡", "风险名称", "等级", "区域", "责任单位", "措施摘要", "详情"]} rows={rows.map((item) => [
                item.id,
                item.name,
                <RiskLevelBadge key="risk" level={item.riskLevel} />,
                item.regionName,
                item.ownerUnit,
                item.measureSummary,
                <RiskTableLink key="link" href={`/double-prevention/risk-cards/${item.id}`}>进入</RiskTableLink>,
              ])} />
            </ConsoleCard>
          );
        }}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function RiskCardDetail({ id }: { id: string }) {
  const loadCard = useCallback(() => fetchRiskCard(id), [id]);
  const resource = useApiResource(loadCard);
  return (
    <DoublePreventionShell routePath="/double-prevention/risk-cards/[id]">
      <ResourceState {...resource}>
        {(card) => (
          <ConsoleCard title={card.name} description="动态路由参数读取详情，不匹配时显示空状态。">
            <RiskCardContent card={card} />
          </ConsoleCard>
        )}
      </ResourceState>
    </DoublePreventionShell>
  );
}

function RiskCardContent({ card }: { card: RiskCard }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <RiskLevelBadge level={card.riskLevel} />
        <SourceBadge sourceType={card.sourceType} />
        <StatusBadge tone="neutral">{card.status}</StatusBadge>
      </div>
      <KeyValueGrid items={[
        { label: "风险名称", value: card.name },
        { label: "风险等级", value: card.riskLevel },
        { label: "所在区域", value: card.regionName },
        { label: "责任单位", value: card.ownerUnit },
        { label: "管控措施", value: card.measureSummary },
        { label: "应急处置", value: card.emergencyAction },
        { label: "检查频次", value: card.inspectionFrequency },
        { label: "责任人", value: card.responsiblePerson },
      ]} />
      <div className="rounded-[12px] border border-line bg-card p-3.5">
        <p className="text-sm font-semibold text-ink">关联隐患列表</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {card.relatedHazards.map((hazardId) => (
            <Link key={hazardId} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-primary" href={`/double-prevention/hazard-ledger/${hazardId}`}>
              {hazardId}
            </Link>
          ))}
        </div>
      </div>
      <DetailActions listHref="/double-prevention/risk-cards" />
    </div>
  );
}

export function MeasureLibraryPanel() {
  const resource = useApiResource(fetchMeasures);
  const [category, setCategory] = useState("all");
  return (
    <DoublePreventionShell routePath="/double-prevention/measure-library">
      <ResourceState {...resource}>
        {(items) => {
          const rows = items.filter((item) => category === "all" || item.category === category);
          return (
            <ConsoleCard title="管控措施库" description="措施条目只作为 mock 引用，不发布正式制度条款。">
              <FilterBar>
                <SelectFilter label="措施分类" value={category} options={uniqueOptions(items.map((item) => item.category))} onChange={setCategory} />
              </FilterBar>
              <DataTable headers={["编号", "分类", "适用风险", "执行频次", "责任角色", "检查要点", "来源"]} rows={rows.map((item) => [
                item.id,
                item.category,
                item.applicableRisk,
                item.executionFrequency,
                item.role,
                item.checklist,
                <SourceBadge key="source" sourceType={item.sourceType} />,
              ])} />
            </ConsoleCard>
          );
        }}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function HazardGovernanceWorkspace() {
  const resource = useApiResource(fetchHazards);
  return (
    <DoublePreventionShell routePath="/double-prevention/hazard-governance">
      <ResourceState {...resource}>
        {(items) => {
          const overdue = items.filter((item) => item.overdueDays > 0).length;
          const active = items.filter((item) => item.status !== "closed").length;
          return (
            <div className="grid min-w-0 gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <ConsoleCard><p className="text-sm text-muted">隐患总数</p><p className="mt-2 text-3xl font-semibold text-ink">{items.length}</p></ConsoleCard>
                <ConsoleCard><p className="text-sm text-muted">治理中</p><p className="mt-2 text-3xl font-semibold text-ink">{active}</p></ConsoleCard>
                <ConsoleCard><p className="text-sm text-muted">逾期事项</p><p className="mt-2 text-3xl font-semibold text-red-600">{overdue}</p></ConsoleCard>
              </div>
              <HazardLedgerTable items={items} />
            </div>
          );
        }}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function HazardLedgerList() {
  const resource = useApiResource(fetchHazards);
  return (
    <DoublePreventionShell routePath="/double-prevention/hazard-ledger">
      <ResourceState {...resource}>
        {(items) => <HazardLedgerTable items={items} />}
      </ResourceState>
    </DoublePreventionShell>
  );
}

function HazardLedgerTable({ items }: { items: HazardLedgerItem[] }) {
  const [filters, setFilters] = useState({ risk: "all", step: "all", status: "all", overdue: "all", keyword: "" });
  const rows = hazardRows(items, filters);
  return (
    <ConsoleCard title="隐患台账" description="支持风险等级、当前步骤、处置状态、逾期状态和关键词筛选。">
      <FilterBar>
        <RiskLevelSelect value={filters.risk} onChange={(risk) => setFilters({ ...filters, risk })} />
        <SelectFilter label="当前步骤" value={filters.step} options={uniqueOptions(items.map((item) => item.currentStep))} onChange={(step) => setFilters({ ...filters, step })} />
        <SelectFilter label="处置状态" value={filters.status} options={uniqueOptions(items.map((item) => item.status))} onChange={(status) => setFilters({ ...filters, status })} />
        <SelectFilter label="逾期状态" value={filters.overdue} options={["all", "overdue", "normal"]} onChange={(overdue) => setFilters({ ...filters, overdue })} />
        <SearchBox value={filters.keyword} onChange={(keyword) => setFilters({ ...filters, keyword })} />
      </FilterBar>
      <DataTable headers={["隐患编号", "描述", "等级", "区域", "责任人/单位", "当前步骤", "期限", "逾期", "详情"]} rows={rows.map((item) => [
        item.id,
        item.description,
        <RiskLevelBadge key="risk" level={item.riskLevel} />,
        item.regionName,
        `${item.owner} / ${item.ownerUnit}`,
        item.currentStep,
        item.deadline,
        item.overdueDays > 0 ? `${item.overdueDays} 天` : "未逾期",
        <RiskTableLink key="link" href={`/double-prevention/hazard-ledger/${item.id}`}>进入</RiskTableLink>,
      ])} />
    </ConsoleCard>
  );
}

export function HazardLedgerDetail({ id }: { id: string }) {
  const loadHazard = useCallback(() => fetchHazard(id), [id]);
  const hazard = useApiResource(loadHazard);
  const workflow = useApiResource(fetchWorkflow);
  return (
    <DoublePreventionShell routePath="/double-prevention/hazard-ledger/[id]">
      <ResourceState {...hazard}>
        {(item) => (
          <div className="grid gap-5">
            <ConsoleCard title={item.description} description="隐患详情按动态 ID 读取，不默认展示第一条。">
              <div className="mb-4 flex flex-wrap gap-2">
                <RiskLevelBadge level={item.riskLevel} />
                <StatusBadge tone={item.overdueDays > 0 ? "danger" : "neutral"}>{item.overdueDays > 0 ? `逾期 ${item.overdueDays} 天` : "未逾期"}</StatusBadge>
                <SourceBadge sourceType={item.sourceType} />
              </div>
              <KeyValueGrid items={[
                { label: "隐患基础信息", value: item.description },
                { label: "风险等级", value: item.riskLevel },
                { label: "所属区域", value: item.regionName },
                { label: "责任人/责任单位", value: `${item.owner} / ${item.ownerUnit}` },
                { label: "当前八步节点", value: item.currentStep },
                { label: "deadline", value: item.deadline },
                { label: "overdueDays", value: item.overdueDays },
                { label: "status", value: item.status },
                { label: "整改材料摘要", value: item.measureSummary },
                { label: "验收/审查/销号状态", value: item.currentStep === "销号" ? "已销号" : "待后续节点确认" },
                { label: "关联入口", value: item.warningEventId ?? "关联风险卡按来源通道复核" },
              ]} />
              <DetailActions listHref="/double-prevention/hazard-ledger" />
            </ConsoleCard>
            <ConsoleCard title="八步闭环进度">
              <ResourceState {...workflow}>
                {(steps) => <WorkflowStrip steps={steps} currentStep={item.currentStep} />}
              </ResourceState>
            </ConsoleCard>
          </div>
        )}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function HazardWorkflowPanel() {
  const resource = useApiResource(fetchWorkflow);
  return (
    <DoublePreventionShell routePath="/double-prevention/hazard-workflow">
      <ResourceState {...resource}>
        {(steps) => (
          <div className="grid gap-5">
            <ConsoleCard title="固定八步闭环" description="整理 -> 分析 -> 通报 -> 整改 -> 反馈 -> 验收 -> 审查 -> 销号，复盘独立跳转。">
              <WorkflowStrip steps={steps} />
            </ConsoleCard>
            <BoundaryCard items={["当前步骤高亮来自 workflow.status=active。", "复盘不能作为第九步，只能跳转 /double-prevention/review。", "本页不写入真实隐患流程。"]} />
          </div>
        )}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function OverdueEscalationPanel() {
  const resource = useApiResource(fetchEscalations);
  const [level, setLevel] = useState("all");
  return (
    <DoublePreventionShell routePath="/double-prevention/overdue-escalation">
      <ResourceState {...resource}>
        {(items) => {
          const rows = [...items].filter((item) => level === "all" || item.escalationLevel === level).sort((a, b) => b.overdueDays - a.overdueDays);
          return (
            <ConsoleCard title="逾期升级" description="按逾期天数排序，展示通知策略但不触发真实通知。">
              <FilterBar>
                <SelectFilter label="升级级别" value={level} options={uniqueOptions(items.map((item) => item.escalationLevel))} onChange={setLevel} />
              </FilterBar>
              <DataTable headers={["隐患", "责任人", "逾期天数", "升级级别", "通知策略", "处理建议"]} rows={rows.map((item) => [
                <RiskTableLink key="link" href={`/double-prevention/hazard-ledger/${item.hazardId}`}>{item.hazardId}</RiskTableLink>,
                item.owner,
                item.overdueDays,
                item.escalationLevel,
                item.notifyStrategy,
                item.suggestion,
              ])} />
            </ConsoleCard>
          );
        }}
      </ResourceState>
    </DoublePreventionShell>
  );
}

export function ReviewPanel() {
  const resource = useApiResource(fetchReviews);
  const [objectType, setObjectType] = useState("all");
  const [trackingStatus, setTrackingStatus] = useState("all");
  return (
    <DoublePreventionShell routePath="/double-prevention/review">
      <ResourceState {...resource}>
        {(items) => {
          const rows = items.filter((item) => (objectType === "all" || item.objectType === objectType) && (trackingStatus === "all" || item.trackingStatus === trackingStatus));
          return (
            <ConsoleCard title="闭环复盘" description="复盘独立于八步闭环，只展示改进建议和跟踪状态。">
              <FilterBar>
                <SelectFilter label="对象类型" value={objectType} options={uniqueOptions(items.map((item) => item.objectType))} onChange={setObjectType} />
                <SelectFilter label="跟踪状态" value={trackingStatus} options={uniqueOptions(items.map((item) => item.trackingStatus))} onChange={setTrackingStatus} />
              </FilterBar>
              <DataTable headers={["编号", "标题", "对象类型", "复盘结论", "改进建议", "追踪状态"]} rows={rows.map((item) => [item.id, item.title, item.objectType, item.conclusion, item.improvement, item.trackingStatus])} />
            </ConsoleCard>
          );
        }}
      </ResourceState>
    </DoublePreventionShell>
  );
}

function RuleSection({ title, items }: { title: string; items: KeyValueItem[] }) {
  return (
    <ConsoleCard title={title}>
      <KeyValueGrid items={items} />
    </ConsoleCard>
  );
}

export function DoublePreventionConfigPanel() {
  const resource = useApiResource(fetchConfig);
  return (
    <DoublePreventionShell routePath="/double-prevention/config">
      <ResourceState {...resource}>
        {(config) => (
          <div className="grid gap-5">
            <div className="flex justify-end">
              <button className="rounded-[12px] border border-line bg-card px-4 py-2 text-sm font-semibold text-muted" disabled>
                只读演示，不保存
              </button>
            </div>
            <RuleSection title="风险等级规则" items={config.riskLevelRules} />
            <RuleSection title="隐患期限规则" items={config.closureDeadlineRules} />
            <RuleSection title="逾期升级规则" items={config.overdueEscalationRules} />
            <RuleSection title="检查频次规则" items={config.inspectionFrequencyRules} />
            <RuleSection title="责任组织" items={config.responsibilityOrganizations} />
            <RuleSection title="通知边界" items={config.notificationBoundary} />
            <RuleSection title="模型边界" items={config.modelIntegrationBoundary} />
            <RuleSection title="真实传感器触发边界" items={config.realSensorTriggerBoundary} />
            <RuleSection title="物理约束生成指标边界" items={config.physicsConstrainedMetricBoundary} />
            <RuleSection title="mock API 覆盖说明" items={config.mockApiCoverage} />
            <ContractMatrixPanel />
          </div>
        )}
      </ResourceState>
    </DoublePreventionShell>
  );
}

function ContractMatrixPanel({ compact = false }: { compact?: boolean }) {
  const rows = compact ? doublePreventionContractMatrix.slice(0, 6) : doublePreventionContractMatrix;

  return (
    <ConsoleCard
      title="只读接口契约矩阵"
      description={compact ? "总览展示核心契约，完整矩阵见配置页。" : "未来真实后端仅按只读 GET 契约映射，不开放保存、通知或发布。"}
    >
      <DataTable
        headers={["实体", "mock API", "未来只读后端", "方法", "写入风险", "生产边界"]}
        rows={rows.map((item) => [
          item.entity,
          item.mockApiPath,
          item.futureReadonlyBackendPath,
          item.method,
          item.writeRisk,
          item.productionBoundary,
        ])}
      />
      {compact ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          已定义 {doublePreventionContractMatrix.length} 条实体契约，config、escalations、culture-board 分别标注 readonly/no_real_notification/no_official_publish。
        </p>
      ) : null}
    </ConsoleCard>
  );
}

export function CultureBoardPanel() {
  const resource = useApiResource(fetchCultureBoard);
  return (
    <DoublePreventionShell routePath="/double-prevention/culture-board">
      <ResourceState {...resource}>
        {(board) => (
          <div className="grid gap-5">
            <RuleSection title="双控理念" items={board.philosophy} />
            <RuleSection title="风险四色说明" items={board.colorRiskGuide} />
            <RuleSection title="八步闭环图文说明" items={board.workflowGuide} />
            <RuleSection title="班组宣传内容" items={board.teamPromotionItems} />
            <RuleSection title="优秀整改案例" items={board.excellentCases} />
            <RuleSection title="真实传感器触发闭环说明" items={board.realSensorTriggerGuide} />
            <RuleSection title="物理约束生成指标只作辅助复核说明" items={board.physicsConstrainedBoundary} />
            <RuleSection title="与 /knowledge/culture-board 的边界说明" items={board.knowledgeCultureBoardBoundary} />
          </div>
        )}
      </ResourceState>
    </DoublePreventionShell>
  );
}
