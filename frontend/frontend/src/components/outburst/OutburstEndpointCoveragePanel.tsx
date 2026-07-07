import { CockpitSectionPanel } from "@/components/cockpit";

type EndpointCoverageRow = {
  endpoint: string;
  method: string;
  frontendStatus: string;
  pageEntry: string;
  policy: string;
  risk: string;
};

const rows: EndpointCoverageRow[] = [
  { endpoint: "health", method: "GET", frontendStatus: "已展示", pageEntry: "/monitoring", policy: "只读开放", risk: "健康状态，不含内部路径" },
  { endpoint: "stats", method: "GET", frontendStatus: "已展示", pageEntry: "/monitoring", policy: "只读开放", risk: "仅展示聚合数量和时间" },
  { endpoint: "meta", method: "GET", frontendStatus: "已展示", pageEntry: "/monitoring/channels", policy: "只读开放", risk: "通道数量事实来源" },
  { endpoint: "sensors/latest", method: "GET", frontendStatus: "已展示", pageEntry: "/monitoring/realtime", policy: "只读开放", risk: "最新节点值，不写库" },
  { endpoint: "sensor-data/series", method: "GET", frontendStatus: "已展示", pageEntry: "/data/dynamic", policy: "只读开放", risk: "降采样趋势，避免全量加载" },
  { endpoint: "sensor-data/recent", method: "GET", frontendStatus: "已接入，阶段 2 增强解释", pageEntry: "/monitoring/realtime", policy: "只读开放", risk: "近期采样分页展示" },
  { endpoint: "warnings", method: "GET", frontendStatus: "已展示", pageEntry: "/warning/events", policy: "只读开放", risk: "事件列表与风险等级" },
  { endpoint: "warnings/latest", method: "GET", frontendStatus: "已接入，阶段 2 增强解释", pageEntry: "/warning/events", policy: "只读开放", risk: "最新事件摘要" },
  { endpoint: "warnings/{id}", method: "GET", frontendStatus: "已展示", pageEntry: "/warning/events/[id]", policy: "只读开放", risk: "单事件详情" },
  { endpoint: "warnings/{id}/contribution", method: "GET", frontendStatus: "已接入，阶段 2 增强解释", pageEntry: "/source-tracing/attention", policy: "只读开放", risk: "贡献度不等于唯一物理因果" },
  { endpoint: "events/ledger", method: "GET", frontendStatus: "已接入，待业务细化", pageEntry: "/source-tracing/events/[id]", policy: "只读开放", risk: "处置台账只读" },
  { endpoint: "config", method: "GET", frontendStatus: "只读展示", pageEntry: "/model/version", policy: "只读开放", risk: "敏感字段脱敏，不提供编辑" },
  { endpoint: "static-risk", method: "POST", frontendStatus: "手动试算", pageEntry: "/data/static", policy: "受控开放", risk: "试算结果不写正式事件" },
  { endpoint: "predict", method: "POST", frontendStatus: "手动动作", pageEntry: "/model", policy: "受控开放", risk: "可能写入事件台账，禁止自动触发" },
  { endpoint: "predict-batch", method: "POST", frontendStatus: "dry-run", pageEntry: "/model/evaluation", policy: "受控开放", risk: "默认 dry_run=true" },
  { endpoint: "config", method: "PUT", frontendStatus: "禁止开放", pageEntry: "/system/config", policy: "代理阻断", risk: "真实配置写入需鉴权与审计" },
  { endpoint: "*", method: "DELETE", frontendStatus: "禁止开放", pageEntry: "无", policy: "代理阻断", risk: "禁止浏览器触发删除" },
];

export function OutburstEndpointCoveragePanel() {
  return (
    <CockpitSectionPanel title="接口覆盖矩阵" badge="allowlist" tone="info">
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full border-separate border-spacing-0 text-left text-xs">
          <thead className="text-[11px] uppercase tracking-[0.08em] text-cyan-100/72">
            <tr>
              {["接口", "方法", "前端状态", "页面入口", "开放策略", "风险说明"].map((header) => (
                <th key={header} className="border-b border-cyan-300/16 px-3 py-2 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted">
            {rows.map((row) => (
              <tr key={`${row.method}-${row.endpoint}`} className="odd:bg-cyan-300/[0.025]">
                <td className="border-b border-cyan-300/10 px-3 py-2 font-mono text-cyan-100">{row.endpoint}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2">{row.method}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2">{row.frontendStatus}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2 font-mono">{row.pageEntry}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2">{row.policy}</td>
                <td className="border-b border-cyan-300/10 px-3 py-2">{row.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CockpitSectionPanel>
  );
}
