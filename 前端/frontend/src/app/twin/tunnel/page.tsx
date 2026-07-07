import { PageHeader } from "@/components/layout/PageHeader";
import { MetricStrip } from "@/components/cockpit/MetricStrip";
import { TwinTunnelViewer } from "@/components/twin/TwinTunnelViewer";
import { routeMetaByPath } from "@/config/routeMeta";

export default function Page() {
  const meta = routeMetaByPath["/twin/tunnel"];

  return (
    <div className="min-w-0">
      <PageHeader title={meta.title} module={meta.module} description="基于 3Dmodel.dwg 转换的 GLB 底模进行前端数字孪生演示，只直显通风、气体环境和回风侧管路强相关锚点。" status="分层展示已接入" />
      <MetricStrip
        metrics={[
          { label: "GLB 节点", value: "38", hint: "由 DWG 3D solid 转换" },
          { label: "空间锚点", value: "7", hint: "通风 5 + 管路 2", risk: "normal" },
          { label: "直显点位", value: "23", hint: "62 点位分层后的三维展示集", risk: "normal" },
          { label: "风险标记", value: "3", hint: "mock 联动高亮", risk: "high" },
        ]}
      />
      <div className="mt-5">
        <TwinTunnelViewer />
      </div>
    </div>
  );
}
