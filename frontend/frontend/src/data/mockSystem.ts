import { systemSnapshotSchema } from "@/schemas/businessSchemas";
import type { SystemSnapshot } from "@/types/business";

export const mockSystem = systemSnapshotSchema.parse({
  users: [
    { name: "演示用户 A", role: "安全管理员", unit: "安全科", permissionScope: "预警、隐患、复盘查看", status: "启用展示", lastLoginAt: "2026-06-27 08:40" },
    { name: "演示用户 B", role: "监测人员", unit: "监测中心", permissionScope: "监测通道与事件查看", status: "启用展示", lastLoginAt: "2026-06-26 18:20" },
    { name: "演示用户 C", role: "系统管理员", unit: "信息中心", permissionScope: "系统配置查看", status: "启用展示", lastLoginAt: "2026-06-25 10:05" },
  ],
  logs: [
    { time: "2026-06-27 09:30", actor: "演示用户 A", module: "预警事件", action: "查看详情", result: "成功", riskLevel: "normal" },
    { time: "2026-06-27 09:26", actor: "演示用户 B", module: "监测通道", action: "查看健康状态", result: "成功" },
    { time: "2026-06-27 09:10", actor: "演示用户 C", module: "系统配置", action: "打开配置页", result: "成功", riskLevel: "low" },
  ],
  configs: [
    { label: "平台参数", value: "红岩示范矿井 / 东翼采掘区" },
    { label: "数据刷新策略", value: "mock 1 分钟刷新说明" },
    { label: "告警阈值", value: "静态说明，不保存真实参数" },
    { label: "通知配置", value: "未接真实短信、电话、企业微信或邮件" },
  ],
}) as SystemSnapshot;
