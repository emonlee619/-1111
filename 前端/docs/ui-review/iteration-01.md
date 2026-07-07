# 阶段 4 视觉自检 iteration-01

本地服务：`http://127.0.0.1:3001`

工具：
- Browser：插件技能已读取，但当前会话未暴露 `node_repl js` 控制工具。
- Computer Use：插件技能已读取，但当前会话未暴露 `node_repl js` 控制工具。
- Playwright：CLI 可用；默认 Chromium 缓存缺失且安装超时，使用系统 Chrome channel 截图。

## 检查范围

桌面端：1440px 宽。

移动端：390px 宽。

必查页面：
- `/dashboard`
- `/monitoring/realtime`
- `/warning/events`
- `/source-tracing`
- `/double-prevention`
- `/double-prevention/hazard-workflow`
- `/twin`
- `/data/augmentation`
- `/model/evaluation`
- `/system`

## 首轮问题

| 页面 | 视口 | 截图 | 分数 | 问题 | 修复 |
| --- | --- | --- | ---: | --- | --- |
| `/dashboard` | 390 | `docs/ui-review/screenshots/dashboard-mobile-iteration-01.png` | 82 | Topbar 下方重复菜单按钮；图表和表格有裁切感。 | 删除 AppShell 内重复移动菜单，调整图表与表格容器。 |
| `/monitoring/realtime` | 390 | `docs/ui-review/screenshots/monitoring-realtime-mobile-iteration-01.png` | 83 | 页面顶部重复菜单按钮；筛选区可读但层级略重。 | 删除重复菜单，统一筛选控件 hover/focus。 |
| `/data/augmentation` | 390 | `docs/ui-review/screenshots/data-augmentation-mobile-iteration-01.png` | 80 | 饼图因内部最小宽度在移动端明显裁切。 | 图表容器改为移动端自然收缩。 |
| `/model/evaluation` | 390 | `docs/ui-review/screenshots/model-evaluation-mobile-iteration-01.png` | 84 | 消融图和矩阵能读，但图表内部宽度策略仍偏硬。 | 图表容器统一缩放，保留图例和单位说明。 |
| `/dashboard` | 1440 | `docs/ui-review/screenshots/dashboard-desktop-iteration-01.png` | 86 | 表格卡片内出现不必要横向滚动，部分列被遮住。 | 表格 wrapper 去掉固定 640px 最小宽度。 |

## 本轮修复文件

- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/ui/ResponsiveTableWrapper.tsx`
- `frontend/src/components/charts/ChartFrame.tsx`
- `frontend/src/components/charts/*Chart.tsx`
- `frontend/src/components/ui/ChartEmptyState.tsx`
- `frontend/src/components/ui/LoadingState.tsx`
- `frontend/src/components/ui/ErrorState.tsx`
- `frontend/src/components/ui/PageReviewBadge.tsx`
- `frontend/src/components/pages/BusinessPage.tsx`
- `frontend/src/components/pages/Stage3BusinessPage.tsx`

## 结论

首轮未达到稳定 85 分线，已进入第二轮复检。
