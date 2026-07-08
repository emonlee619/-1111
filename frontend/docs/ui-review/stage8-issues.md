# 前端 UI 概念图落地专项阶段 8 问题记录

日期：2026-06-29  
分支：feature/frontend-worktree

## 已发现并修复

| 编号 | 问题 | 影响 | 修复 |
|---|---|---|---|
| S8-01 | 部分 cockpit 页面和工作台组件直接显示“占位”等开发口吻。 | 不符合阶段 8 “不得出现开发中/占位页/Stage 标签”等可见文案要求。 | 新增 frontend/src/utils/displayText.ts，并在 PageHeader、MetricCard、ConsoleCard、StatusBadge、BusinessSections、BusinessPage、PageScaffold、Stage3BusinessPage、CockpitPageFrame、CockpitHeroPanel、CockpitSectionPanel、QuickActionDock、ModuleTabs、CockpitBottomTicker、HeroPanel、DetailDrawer、Stage4CoreShowcasePage、Stage6SecondaryWorkstationPage 等展示边界接入清洗；另将少量阶段 6 源文案改为“操作边界”“告警阈值展示”“通知配置边界”。 |
| S8-02 | 初次 Chrome CDP 截图检查捕获 /favicon.ico 404 资源噪声。 | 不属于应用运行时异常，但会污染 console/resource 检查。 | 新增 frontend/src/app/icon.svg，Next build 后生成 /icon.svg；最终轻量 smoke 显示 resource errors 为 0。 |
| S8-03 | WGAN 边界自动字面检查曾命中“保存模型权重”等词。 | 误报风险：实际文案是“不训练 WGAN-GP、不保存模型权重”。 | 调整最终 smoke 判定为 positive training language；最终结果 hasPositiveTrainingLanguage=false，hasBoundaryLanguage=true。 |

## 未修复问题

无阻塞未修复问题。

## 记录事项

- Browser / Computer Use 工具在当前会话不可调用；已按 frontend/AGENTS.md 使用 Chrome headless + Chrome DevTools Protocol 兜底。
- Playwright 包未安装；未临时安装依赖，使用系统 Chrome。
- 截图目录位于 C:\Users\ASUS\AppData\Local\Temp\gas-outburst-stage8-screenshots，未提交大量截图。
- 系统管理类页面保持低装饰、表格和配置可读性优先。
