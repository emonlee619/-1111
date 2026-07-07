# 前端开发状态记忆

## 1. 文件作用

本文件用于记录前端设计与开发循环中的长期状态，供 Codex / AI Agent 每次新开任务前读取，避免重复工作和上下文丢失。

## 2. 当前阶段

当前阶段：后端展示闭环与通道口径修正 / 阶段 3：验收收口与演示整理。
阶段 0～8 已完成。阶段 9 视觉精修作为历史阶段保留；当前不重构导航、入口和路由，重点收口验收清单、路由映射、演示路径和数据边界一致性。

## 3. 已确认约束

- 路由地图来源：docs/frontend-route-map.md
- 设计风格来源：docs/frontend-design-guide.md
- 验收规则来源：docs/frontend-acceptance-checklist.md
- 前端工作树约束来源：AGENTS.md
- frontend/AGENTS.md 仅作为 frontend/ 目录入口说明，不重复维护执行规则
- 页面最低需求来源：docs/frontend-page-requirements.md

## 4. 已完成事项

- [x] 2026-07-04 已按 `动态-6-10.xlsx` 将通道口径更新为 21 个现场监测通道、41 个 WGAN-GP 生成前兆指标通道、62 维动态指标字典；此为旧口径，已被 `瓦斯突出预警系统完整附录卡_v2_63维.md` 的 63 维口径替换
- [x] 前端路由地图确认
- [x] 前端设计指导确认
- [x] 前端验收清单确认
- [x] frontend/AGENTS.md 确认
- [x] 页面最低需求文件确认
- [x] 阶段 9 核心文档体系确认
- [x] 路由骨架开始开发
- [x] AppShell 开始开发
- [x] mock 数据契约开始开发
- [x] 采用路由根：frontend/src/app
- [x] 全部 50 个路由占位页面已创建
- [x] AppShell、Topbar、Sidebar、PageHeader 已创建
- [x] ConsoleCard、MetricCard、StatusBadge、RiskLevelBadge、EmptyState 已创建
- [x] PageScaffold 已创建
- [x] navigation.ts 与 routeMeta.ts 已创建
- [x] 已确认一级导航先进入模块总览，二级入口合并精简，总览图表优先
- [x] 已确认前端 UI 概念图落地专项 8 阶段执行方案
- [x] 已确认阶段 4 优先打磨综合驾驶舱、监测预警、双重预防三大样板页
- [x] 已确认样板页未达到 85 分以上不进入全模块迁移
- [x] 阶段 5 已迁移 /source-tracing、/twin、/data、/knowledge、/system 五个剩余一级总览模块

## 5. 当前待解决问题

- AGENTS.md 已作为唯一执行约束来源，frontend/AGENTS.md 仅保留目录入口说明。
- 页面最低需求文件已覆盖 docs/frontend-route-map.md 中全部路由。
- UI 总设计、视觉参考学习和 AI 视觉自检流程已补齐。
- 人工确认阶段 1 采用 frontend/src/app 作为唯一 Next.js App Router 路由根。
- 前端项目实际 package.json 位置已确认：frontend/package.json。
- lint/build 命令已确认并通过。
- npm audit 当前仍提示 2 个 moderate：来源为 Next 16.2.9 内部 postcss 审计项；npm 给出的修复建议为降级到 Next 9.3.3，不适用于 App Router，未执行破坏性降级。

## 6. 2026-07-04 通道口径更新记录

## 28. 最近一次 Codex 任务记录

日期：2026-06-30
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：知识库后端接入与前端 API 代理（并行阶段，不重构导航和无关页面）。
本次完成阶段：知识库后端整理 + 前端 API 代理 + 知识智能三个页面接入。

后端整理（新增 backend/knowledge-base/）：

- 压缩包"知识库"目录整理到 backend/knowledge-base/ 根目录。
- 模糊数学评价.py → fuzzy_evaluation.py，同步修改 api_server.py、postgres_storage.py 的 import。
- api_server.py 中 version_management 模块（未上传）改为 try/except 可选加载，9 个版本管理端点加 503 守卫，保持 python api_server.py 可启动。
- 默认启动地址：http://127.0.0.1:8000；FastAPI 文档：http://127.0.0.1:8000/docs。
- 新增 requirements.txt（fastapi、uvicorn、neo4j、psycopg2-binary、python-dotenv、numpy、pydantic）。
- 新增 .env.example（保留变量名，密码用占位符）。
- 新增 .gitignore（忽略 .venv/、**pycache**/、.env、.env.local）。
- 新增 README.md（启动说明、文件结构、已知限制）。

前端环境变量与 API 代理：

- frontend/.env.local.example 增加 KNOWLEDGE_API_BASE_URL=http://127.0.0.1:8000。
- 新增 frontend/src/app/api/knowledge/[...path]/route.ts：转发 /api/knowledge/_ → KNOWLEDGE_API_BASE_URL/api/_，支持 GET/POST/PUT/DELETE，cache=no-store，后端不可用返回 503 占位 JSON，浏览器不暴露数据库连接信息。
- 新增 frontend/src/lib/knowledgeApi.ts：共享类型与 fetch 工具，导出 fetchCategories/fetchRegions/fetchHighRiskIndicators/fetchStats/fetchPgStatus/fetchIndicators/fetchRules/fetchMeasures/fetchNlQuery 与 riskTone/riskLabel 辅助函数，自定义 KnowledgeApiError。

知识智能页面：

- 新增 frontend/src/app/knowledge/overview/page.tsx（知识库总览）。
- 新增 frontend/src/app/knowledge/rules/page.tsx（规则指标库）。
- 新增 frontend/src/app/knowledge/assistant/page.tsx（智能问答）。
- 新增 frontend/src/components/knowledge/KnowledgeOverviewClient.tsx：调用 categories/regions/risk/high-risk/stats/pg/status，展示指标卡、Neo4j/PostgreSQL 连接状态徽章、分类列表、高风险指标清单和边界说明。
- 新增 frontend/src/components/knowledge/KnowledgeRulesClient.tsx：支持关键词、动态/静态、分类筛选；指标卡片展示 id/name/threshold/category/risk_level/type/symbol/region/description；点击指标预留知识图谱详情入口；下方展示风险规则与管控措施。
- 新增 frontend/src/components/knowledge/KnowledgeAssistantClient.tsx：placeholder 按任务要求；快捷示例查询；结构化 JSON 展示 + 预留相关指标/阈值依据/处置措施/法规来源/相似案例卡片。
- 三个页面均为 "use client" 客户端组件，偏离现有 PageScaffold mock 模式以支持真实 fetch。
- 视觉：复用项目科技深色风格，半透明卡片、青蓝边框、高风险橙红强调，页面标题统一为"知识智能 / 煤矿瓦斯灾害知识库"。

导航与路由元数据：

- frontend/src/config/navigation.ts：知识智能组 items 新增 知识库总览、规则知识库、智能问答，hiddenItems 新增 案例标准库、AI 问答入口；保留原项 总览/标准检索/致灾图谱/知识文化展板。
- frontend/src/config/routeMeta.ts：routes 数组末尾新增 /knowledge/overview、/knowledge/rules、/knowledge/assistant 三条元数据（module=知识库与智能体、status=后端接入）。

约束文件更新：

- AGENTS.md：新增"并行阶段：知识库后端接入"；修改范围允许 backend/knowledge-base/\*\*；不提交清单增加 backend/knowledge-base/.venv、**pycache**、.env；第 5 节"路由与数据边界"增加知识库 API 代理例外说明。
- docs/frontend-progress.md：追加本节记录。

修改文件清单：

- AGENTS.md
- docs/frontend-progress.md
- frontend/.env.local.example
- frontend/src/config/navigation.ts
- frontend/src/config/routeMeta.ts
- backend/knowledge-base/api_server.py（修复 import 与 version_management 可选加载）
- backend/knowledge-base/postgres_storage.py（修复 import）

新增文件清单：

- backend/knowledge-base/requirements.txt
- backend/knowledge-base/.env.example
- backend/knowledge-base/.gitignore
- backend/knowledge-base/README.md
- backend/knowledge-base/fuzzy_evaluation.py（由 模糊数学评价.py 重命名）
- frontend/src/app/api/knowledge/[...path]/route.ts
- frontend/src/lib/knowledgeApi.ts
- frontend/src/app/knowledge/overview/page.tsx
- frontend/src/app/knowledge/rules/page.tsx
- frontend/src/app/knowledge/assistant/page.tsx
- frontend/src/components/knowledge/KnowledgeOverviewClient.tsx
- frontend/src/components/knowledge/KnowledgeRulesClient.tsx
- frontend/src/components/knowledge/KnowledgeAssistantClient.tsx

边界确认：

- 前端不直连 Neo4j / PostgreSQL，仅通过 Next.js API 代理调用 FastAPI。
- 不提交 .env 真实密码，后端 .env 用 .gitignore 排除。
- Python 代码不打包进 frontend。
- 未引入复杂图谱依赖（项目已有 recharts，暂未引入图谱可视化）。
- 不改动其它一级导航结构。

未完成事项：

- 未运行后端实际启动验证（version_management.py 未上传，9 个版本管理端点会返回 503，主流程不受影响）。
- 未在浏览器实测三个页面与真实后端联调（需要本机启动 Neo4j + PostgreSQL + FastAPI 才能完整联调）。
- 知识图谱详情入口仅为预留，本阶段不做图谱可视化。
- PostgreSQL 静态评价（模糊数学评价）页面未做，仅后端保留 fuzzy_evaluation.py。

下一步建议：

- 后端启动验证：cd backend/knowledge-base；python -m venv .venv；.venv\Scripts\activate；pip install -r requirements.txt；python api_server.py。
- 前端联调验证：cd frontend；npm run lint；npm run dev；访问 /knowledge/overview、/knowledge/rules、/knowledge/assistant。
- 后续如需接入知识图谱可视化，可基于已有 recharts 或引入 react-flow。
- 如需 PostgreSQL 静态评价页面，可在 /knowledge/cases 或新路由下扩展 fuzzy_evaluation 展示。

## 29. 最近一次 Codex 任务记录

日期：2026-06-30
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：修复知识库接入完整性——frontend/src/lib/knowledgeApi.ts、frontend/src/lib/cn.ts 与 frontend/.env.local.example 之前被 .gitignore 误忽略，未推送到 GitHub。

问题根因：

- .gitignore 第 17 行 `lib/`（Python 打包目录规则）误匹配 frontend/src/lib/，导致 knowledgeApi.ts 与 cn.ts（被 25 个组件引用）从未被 git 跟踪。
- .gitignore 第 236 行 `.env.*` 仅放行 `.env.example`，未放行 `.env.local.example`，导致环境变量模板未跟踪。
- 代理路由 frontend/src/app/api/knowledge/[...path]/route.ts 已正常跟踪推送。

修复内容：

- .gitignore：`lib/` → `/lib/`、`lib64/` → `/lib64/`（锚定到仓库根，保留 Python 打包目录忽略语义）；新增 `!.env.local.example` 放行环境变量模板。
- 新增跟踪文件：frontend/src/lib/knowledgeApi.ts、frontend/src/lib/cn.ts、frontend/.env.local.example。
- knowledgeApi.ts 已确认包含 fetchCategories/fetchRegions/fetchHighRiskIndicators/fetchStats/fetchPgStatus/fetchIndicators/fetchRules/fetchMeasures/fetchNlQuery/KnowledgeApiError/riskLabel/riskTone，且 fetchNlQuery 使用参数名 q（不是 query）。

运行命令与结果：

- git check-ignore -v：修复后 lib 文件不再被忽略，.env.local.example 命中放行规则。
- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由（含 /api/knowledge/[...path] 与三个知识智能页面）。

非本任务文件检查（git diff --name-status origin/main...HEAD）：

- data-augmentation/ 整目录、docs/appendix/ 整目录、docs/sources/ 在本分支相对 origin/main 显示为 Deleted，属于本分支历史提交造成的删除，本次知识库修复任务未改动它们，需人工确认是否恢复。
- docs/ui-review/screenshots/ 下 40 张 PNG 截图为本分支历史新增并已推送，本次未改动。
- 工作树未跟踪大文件：PSD源文件/、参考图.rar、参考图/、矿井建模/、预览图/，按 AGENTS.md 不提交清单保持未跟踪，未加入暂存区。

提交与推送：

- 待提交：.gitignore、frontend/src/lib/knowledgeApi.ts、frontend/src/lib/cn.ts、frontend/.env.local.example、docs/frontend-progress.md。
- 推送目标：feature/frontend-worktree（不强制推送）。

下一步建议：

- 人工确认是否恢复 data-augmentation/ 与 docs/appendix/（超出知识库接入任务范围，未自行恢复）。

## 30. 最近一次 Codex 任务记录

日期：2026-07-01
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：阶段 9 视觉精修，参考 PSD 大头部与流程图/小标题蓝色组件，优化全站一级选项卡头部与综合驾驶舱小标题。

完成范围：

- 顶部一级导航改为左 4 个一级模块、右 4 个一级模块，中间标题为“煤矿灾害预警平台”。
- 参考大头部.psd 的蓝色横梁、斜切翼板、分段标签、底部高亮线和选中态光效，转译为代码化 CSS，不贴 PSD 图片。
- 综合驾驶舱小标题参考“流程图、小标题、弹窗、词云.psd”的蓝色短梁、角标、细分隔线和右侧刻度，新增 `blueBeam` 标题变体。
- 390px 小屏隐藏右侧快捷图标，优先保证菜单、平台名和矿井信息清晰。
- 修复 Sidebar 中同 href 二级入口导致的 React duplicate key warning。

修改文件：

- frontend/src/components/layout/Topbar.tsx
- frontend/src/components/layout/Sidebar.tsx
- frontend/src/components/cockpit/CockpitSectionPanel.tsx
- frontend/src/components/pages/Stage4CoreShowcasePage.tsx
- frontend/src/app/globals.css
- docs/frontend-progress.md

未采用内容：

- 未整图贴入 PSD。
- 未复制 PSD 模板文字、品牌资产或完整布局。
- 未新增或删除路由，未重构导航数据结构。

运行命令与结果：

- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。
- 本地 dev server：http://127.0.0.1:3000。
- Chrome headless 截图检查 /dashboard 桌面 1440x980 与移动 390x1200：一级选项卡完整显示，小屏顶栏无半截按钮；综合驾驶舱小标题清晰，无新增顶部遮挡。

提交与推送：

- 本地已提交；推送失败，原因是当前环境无法连接 GitHub 443 端口。
- 本次任务开始前工作树已有知识库修复相关暂存变更，视觉提交已用 `git commit --only` 避免混入非本次文件。

下一步建议：

- 继续按阶段 9 精修监测预警、双重预防等页面的标题条与图表密度，但仍保持 PSD 只做视觉语言参考。

## 31. 最近一次 Codex 任务记录

日期：2026-07-03
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：从第一性原理统一知识智能下二级选项卡 UI，修复总览、知识库总览、规则知识库、标准检索、致灾图谱、智能问答之间界面不一致问题。

完成范围：

- 新增统一知识智能工作台组件，统一标题区、二级 tab、指标卡、蓝色标题条、舱体面板、边界提示和移动端列表排布。
- /knowledge、/knowledge/overview、/knowledge/rules、/knowledge/search、/knowledge/causal-graph、/knowledge/assistant 全部切换到同一套 UI 外壳。
- 同步修复隐藏入口 /knowledge/culture-board 与旧 /agent 入口，避免从知识智能相关入口进入旧占位界面。
- 保留 FastAPI / Next.js API 代理边界：后端不可用时显示待连接或 503 提示，不把空结果伪装成真实生产数据。

新增文件：

- frontend/src/components/knowledge/KnowledgeWorkspace.tsx

修改文件：

- frontend/src/app/knowledge/page.tsx
- frontend/src/app/knowledge/overview/page.tsx
- frontend/src/app/knowledge/rules/page.tsx
- frontend/src/app/knowledge/search/page.tsx
- frontend/src/app/knowledge/causal-graph/page.tsx
- frontend/src/app/knowledge/assistant/page.tsx
- frontend/src/app/knowledge/culture-board/page.tsx
- frontend/src/app/agent/page.tsx
- docs/frontend-progress.md

运行命令与结果：

- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。
- HTTP smoke：/knowledge、/knowledge/overview、/knowledge/rules、/knowledge/search、/knowledge/causal-graph、/knowledge/assistant、/knowledge/culture-board、/agent 均返回 200，且包含统一知识智能 tab 与边界提示。
- Chrome headless 截图检查：/knowledge/overview、/knowledge/rules、/knowledge/assistant 桌面 1440x980 与 /knowledge 移动 390x1200；检查重点为首屏统一、tab 状态、指标卡、面板边界、移动端徽章裁切。

提交与推送：

- 已提交并推送：581127c（接入数字孪生三维底模）。

下一步建议：

- 如需继续，可把知识图谱详情和 PostgreSQL 静态评价补成真实二级业务落点，但仍应保持当前统一工作台结构。

## 32. 最近一次 Codex 任务记录

日期：2026-07-04
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：将 3Dmodel.dwg 转为前端可加载的 GLB 演示底模，并接入 /twin/tunnel 数字孪生三维展示。

完成范围：

- 通过 AutoCAD COM 读取 3Dmodel.dwg，确认 38 个 AcDb3dSolid、40 条标注，并导出模型元数据。
- 生成 frontend/public/models/twin/3dmodel.glb，每个 solid 以独立 mesh 保留 CAD handle 名称。
- /twin/tunnel 切换为 Three.js 客户端渲染，支持拖拽旋转、滚轮缩放、实体点击高亮、风险标记与模拟传感器点位。
- 右侧信息面板展示模型来源、选中 handle、风险/传感器 mock 状态，并保留“演示/模拟”边界。

新增文件：

- frontend/public/models/twin/3dmodel.glb
- frontend/public/models/twin/3dmodel-metadata.json
- frontend/src/components/twin/TwinTunnelViewer.tsx
- frontend/src/data/twinTunnelScene.ts

修改文件：

- frontend/package.json
- frontend/package-lock.json
- frontend/src/app/twin/tunnel/page.tsx
- docs/frontend-progress.md

清理内容：

- 未提交 STLOUT 尝试文件、SAT/DXF/BMP 中间导出物、临时 Playwright 脚本或截图。
- 未把 3Dmodel.dwg、PSD、参考图、预览图、构建产物或 node_modules 加入提交范围。

运行命令与结果：

- npm install three @types/three：通过。
- npm install -D @playwright/test：通过，用于本地页面验证。
- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。
- Chrome headless 验证 http://127.0.0.1:3000/twin/tunnel：页面 200、canvas 非空、无 Next.js 错误覆盖、无 console error/warning，点击 RISK-2A76 后当前选中更新为 CAD handle 2A76。
- 桌面 1440x980、移动 390x820 截图检查：三维底模、标记、右侧/下方信息面板可读，无明显遮挡或空白渲染。

提交与推送：

- 已提交并推送：581127c（接入数字孪生三维底模）；43ad238d（更新数字孪生任务记录）。

下一步建议：

- 若需要更接近原始 CAD 曲面，可后续接入可靠的 ACIS/SAT 三角化工具链，替换当前包围盒 GLB 演示底模。

## 33. 最近一次 Codex 任务记录

日期：2026-07-04
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：把 /twin/tunnel 使用的 DWG 演示包围盒底模替换为 AcDb3dSolid 真实几何三角化 GLB。

完成范围：

- 通过 AutoCAD COM 按 CAD handle 导出 38 个 AcDb3dSolid 的 SAT 中间几何，避免继续使用整体包围盒。
- 新增 SAT 到 GLB 转换脚本，解析 ACIS face/loop/coedge/edge/vertex/point 拓扑并生成三角面；圆柱类实体按 SAT 椭圆边界生成解析网格。
- 替换 frontend/public/models/twin/3dmodel.glb，输出 38 个 mesh 节点、1488 个三角面。
- 每个 mesh 节点命名为 solid\_<handle>，并在 GLB extras 与 metadata 中保留 CAD handle、bodyId、来源对象、体积、曲面统计和三角化诊断。
- 更新 /twin/tunnel 的模型说明，明确当前底模来自 SAT 拓扑三角化，传感器与风险标记仍为 mock 演示边界。

新增文件：

- frontend/scripts/sat_to_gltf.py

修改文件：

- frontend/public/models/twin/3dmodel.glb
- frontend/public/models/twin/3dmodel-metadata.json
- frontend/src/data/twinTunnelScene.ts
- docs/frontend-progress.md

清理内容：

- 未提交 3Dmodel.dwg、PSD、参考图、预览图、work/ SAT/DWG 中间文件、构建产物或 node_modules。
- 保留上一轮 Three.js viewer、旋转缩放、点击高亮、传感器点位和风险标记能力，只替换底模几何与来源说明。

运行命令与结果：

- python frontend/scripts/sat_to_gltf.py：通过，生成 frontend/public/models/twin/3dmodel.glb；38 个节点、1488 个三角面、无包围盒 fallback。
- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。
- Chrome headless 验证 /twin/tunnel：通过，页面无 console error/pageerror，canvas 渲染真实几何底模，点击 RISK-2A76 后当前选中更新为 CAD handle 2A76；桌面 1440x980 与移动 390x820 截图检查无明显遮挡。

提交与推送：

- 已提交：01131f4b（替换数字孪生真实几何底模）；将随本次进度记录一并推送。

下一步建议：

- 若后续要进入工程级数字孪生，可继续把 CAD 标注、业务设备清单和传感器台账合并为 handle 到业务 ID 的可维护映射表。

## 34. 最近一次 Codex 任务记录

日期：2026-07-04
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：基于动态-6-10.xlsx、真实 GLB metadata 和矿井通风系统公开资料，整理 62 个真实点位到三维底模的空间锚点与 handle 映射草案。

完成范围：

- 读取动态-6-10.xlsx，确认 62 行点位，字段为监测指标、单位、空间位置。
- 查阅煤矿安全规程、30 CFR Part 75、NIOSH 通风概览和长壁通风结构资料，形成进风侧/运输巷、采面、回风巷、回风管路、顶底板钻孔等自动归类规则。
- 新增自动生成脚本，输入 Excel 与 frontend/public/models/twin/3dmodel-metadata.json，输出空间锚点和 62 点位映射草案。
- 生成 26 个空间锚点，全部 62 个点位完成自动映射；其中 10 个低置信度点位标记为待确认。
- 保持边界：真实位置来自 Excel；三维锚点与 CAD handle 是规则推断；实时数值仍为 mock/待接入。

新增文件：

- frontend/scripts/build_sensor_mapping_draft.py
- frontend/src/data/twinSensorMappingDraft.json
- docs/frontend-sensor-anchor-mapping-draft.md

修改文件：

- docs/frontend-progress.md

清理内容：

- 未改 viewer 渲染逻辑，未把 62 点位直接接入页面。
- 未提交 3Dmodel.dwg、PSD、参考图、预览图、构建产物或 node_modules。

运行命令与结果：

- python frontend/scripts/build_sensor_mapping_draft.py：通过，输出 62 mappedSensors、26 anchors、10 lowConfidenceSensors。
- git diff --check：通过。
- npm run lint：通过，0 warning。

提交与推送：

- 已提交：cdd2bed（生成传感器三维映射草案）；将随本次进度记录一并推送。

下一步建议：

- 由业务侧确认 10 个低置信度点位和关键区段 handle；确认后再把草案数据接入 /twin/tunnel 的点位筛选、聚合和点击联动。

## 35. 最近一次 Codex 任务记录

日期：2026-07-04
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：把 62 点位从“全部尝试贴到三维巷道模型”调整为分层展示。

完成范围：

- 在 docs/frontend-sensor-anchor-mapping-draft.md 增加“展示策略结论”和推荐展示层分类，明确 handle 260D、2615 可作为回风侧管路候选结构展示。
- 将 /twin/tunnel 改为只直显 ventilation_3d 与 pipe_3d：7 个空间锚点承载 23 个通风/管路强相关点位，并支持点击后展示多个 metrics。
- 将 /twin/sensors 改为读取 frontend/src/data/twinSensorMappingDraft.json，展示全部 62 点位、统计卡、筛选和明细表。
- 将 /twin/risk-heatmap 改为 6 个聚合风险区域，不逐个铺开 62 点位。
- 将 /data/features 改为说明 Excel、DWG/GLB、mock 数值、物理传感器和派生指标关系。
- 调整三维锚点按钮短标签和投影偏移，避免管路、通风锚点和风险标记重叠。

新增文件：

- frontend/src/data/twinSensorMappingDraft.json

修改文件：

- docs/frontend-sensor-anchor-mapping-draft.md
- frontend/src/app/data/features/page.tsx
- frontend/src/app/twin/risk-heatmap/page.tsx
- frontend/src/app/twin/sensors/page.tsx
- frontend/src/app/twin/tunnel/page.tsx
- frontend/src/components/twin/TwinTunnelViewer.tsx
- frontend/src/data/twinTunnelScene.ts
- docs/frontend-progress.md

清理内容：

- 未删除任何 62 点位，只增加 displayLayer、isPhysicalSensor、isDerivedMetric、derivedFrom、frontendPlacement 等结构化展示字段。
- 未提交 3Dmodel.dwg、PSD、参考图、预览图、压缩包、构建产物、node_modules 或环境文件。

运行命令与结果：

- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。
- Playwright + 系统 Chrome 验证 http://127.0.0.1:3002：通过；/twin/tunnel 管路 B 点击后显示多指标，/twin/sensors 低置信筛选为 10 / 62，/twin/risk-heatmap 展示 6 个聚合区域，console/pageerror 为空。

提交与推送：

- 主体实现已提交并推送：f9e3500（调整孪生点位分层展示）。

下一步建议：

- 业务侧确认低置信点位后，可补建煤壁钻孔、顶底板、采空区和构造异常区模型层，再把 model_extension_required 点位逐步转入三维直显。

## 36. 最近一次 Codex 任务记录

日期：2026-07-04
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：按确认决策接入 alert warning 后端，使用 63 节点模型口径展示预警模型、动态数据、静态数据、事件台账、贡献溯源和显式推理写库。

完成范围：

- 后端 api.py 新增运行期 schema/index 初始化、事件台账字段补齐、/api/sensors/latest、/api/sensor-data/series、/api/warnings/{id}、/api/warnings/{id}/contribution、/api/events/ledger。
- 后端 predict 写入 warning_results 时同步写入事件状态、责任组、确认状态、摘要、处置记录和建议。
- 后端 model_inference.py 增加 SQLite fallback：缺少历史传感器目录、空间 Excel、静态矿井 CSV 时，从 meta_info、dynamic_sensor_data、static_mine_data 读取 63 节点顺序、图结构和静态属性。
- 前端新增 /api/outburst/[...path] 通用代理，浏览器端不直连 FastAPI。
- 前端新增 OutburstIntegrationPage，覆盖 dashboard、monitoring、warning、source-tracing、data、model、twin/risk-heatmap、twin/sensors 等预警模型相关页面。
- /data/features、/twin/risk-heatmap、/twin/sensors 回到 PageScaffold，进入统一后端分流。
- routeMeta 关键文案从 14/33/19 旧口径调整为 63 节点后端模型口径。
- 双控、区域风险中心、系统用户/日志/配置写入继续保留 mock，不接 alert warning 后端。

新增文件：

- frontend/src/app/api/outburst/[...path]/route.ts
- frontend/src/components/pages/OutburstIntegrationPage.tsx
- frontend/src/lib/outburstApi.ts
- frontend/src/lib/outburstRoutes.ts

修改文件：

- alert warning/alert warning/api.py
- alert warning/alert warning/model_inference.py
- frontend/src/app/data/features/page.tsx
- frontend/src/app/twin/risk-heatmap/page.tsx
- frontend/src/app/twin/sensors/page.tsx
- frontend/src/components/pages/PageScaffold.tsx
- frontend/src/config/routeMeta.ts
- docs/frontend-progress.md

清理内容：

- 未提交 .pt、.db、PSD、参考图、预览图、压缩包、构建产物、node_modules 或环境文件。
- 未开放 PUT /api/config 到前端 UI；系统管理仍保持 mock。
- 未把双控和区域风险中心改成真实后端。

运行命令与结果：

- python -m py_compile api.py model_inference.py：通过。
- python -m pip install fastapi==0.138.2 uvicorn==0.49.0：补齐本机后端运行依赖。
- python -m pip install torch-geometric==2.8.0：补齐本机模型推理依赖。
- Invoke-RestMethod http://127.0.0.1:8000/api/health：healthy / database connected。
- Invoke-RestMethod http://127.0.0.1:8000/api/sensors/latest：返回 63。
- Invoke-RestMethod http://127.0.0.1:8000/api/sensor-data/series?bucket_minutes=1&limit=5：通过，返回聚合序列。
- Invoke-RestMethod POST http://127.0.0.1:8000/api/predict：通过，写入事件台账，返回 63 个贡献节点。
- Invoke-RestMethod http://127.0.0.1:3000/api/outburst/health：通过。
- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。
- Playwright + 系统 Chrome 验证 http://127.0.0.1:3000：/warning/events 显示 /api/outburst 与 63 节点，点击“运行一次预警推理”后台账行数 4 -> 5，/data/features 显示 63 行，console/pageerror 为空。

提交与推送：

- 待提交、待推送。

下一步建议：

- 如需事件台账可人工编辑状态、负责人、处置记录，需要再明确开放写接口和权限边界；当前只开放显式模型推理写库。

## 37. 最近一次 Codex 任务记录

日期：2026-07-04
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：修正综合驾驶舱与数字孪生展示边界，恢复数字孪生空间 UI，并把 63 节点后端数据作为数据层嵌入。

完成范围：

- 从预警后端通用适配路由中移除 /dashboard、/twin/risk-heatmap、/twin/sensors。
- 综合驾驶舱改为六大业务总览：监测预警、溯源研判、双重预防、数字孪生、数据模型、知识智能；不展示系统管理详情。
- 综合驾驶舱中心复用 3D GLB 数字孪生建模图，并用图表/表格展示六个模块关键态势。
- /twin/risk-heatmap 恢复空间热力 UI，叠加 /api/outburst/warnings 和事件摘要。
- /twin/sensors 恢复空间点位 UI，叠加 /api/outburst/sensors/latest、/api/outburst/stats 的 63 节点最新值。
- TwinTunnelViewer 增加 dashboard 紧凑模式，保留原 /twin/tunnel 完整模式。

新增文件：

- frontend/src/components/pages/DashboardOverviewPage.tsx
- frontend/src/components/pages/TwinRiskHeatmapPage.tsx
- frontend/src/components/pages/TwinSensorsPage.tsx

修改文件：

- frontend/src/app/dashboard/page.tsx
- frontend/src/app/twin/risk-heatmap/page.tsx
- frontend/src/app/twin/sensors/page.tsx
- frontend/src/components/twin/TwinTunnelViewer.tsx
- frontend/src/lib/outburstRoutes.ts
- docs/frontend-progress.md

清理内容：

- 未新增后端接口。
- 未把系统管理放入综合驾驶舱内容区。
- 未提交 3Dmodel.dwg、PSD、参考图、预览图、压缩包、构建产物、node_modules 或环境文件。

运行命令与结果：

- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。
- Playwright + 系统 Chrome 验证 http://127.0.0.1:3000：/dashboard 显示数字孪生建模图和六大业务模块，无接口杂项、无系统管理详情；/twin/tunnel 存在 canvas；/twin/risk-heatmap 保留风险热力图并显示后端事件叠加；/twin/sensors 保留空间点位分布并显示 63 节点最新值；/warning/events 仍显示完整事件台账。
- Playwright + 系统 Chrome 验证 production 服务 http://127.0.0.1:3003：上述页面 framework overlay 和 console error 均为 0。

提交与推送：

- 待提交、待推送。

下一步建议：

- 若需要知识智能在综合驾驶舱显示真实知识库统计，请同时启动知识库后端并设置 KNOWLEDGE_API_BASE_URL 指向知识库服务，避免与 OUTBURST_API_BASE_URL 共用同一端口。

## 38. 最近一次 Codex 任务记录

日期：2026-07-05
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：完善知识智能问答，使 AI 基于知识库证据回答问题，并沿用现有知识智能 UI 风格。

完成范围：

- 后端知识库服务新增 `POST /api/ai-answer` 检索增强问答接口。
- 接口先从 Neo4j 检索指标、规则措施、标准与案例证据，再读取本地环境变量 `DEEPSEEK_API_KEY` 调用 DeepSeek Chat Completions。
- 未配置 DeepSeek key、模型调用失败或证据不足时，接口降级为 `retrieval_only` 知识库检索摘要，不编造无证据结论。
- 前端知识智能问答页从原始结构化 JSON 查询升级为 AI 回答、引用证据、检索词、降级提示和原始 JSON 核查视图。
- `.env.example` 与后端 README 仅增加 DeepSeek 环境变量占位说明，未写入真实 key。

新增文件：无。

修改文件：

- backend/knowledge-base/api_server.py
- backend/knowledge-base/.env.example
- backend/knowledge-base/README.md
- frontend/src/lib/knowledgeApi.ts
- frontend/src/components/knowledge/KnowledgeWorkspace.tsx
- docs/frontend-progress.md

清理内容：

- 未提交真实 API key、`.env`、PSD、参考图、压缩包、构建产物、node_modules 或数据库文件。
- 保留浏览器端不直连 Neo4j / PostgreSQL / DeepSeek 的边界，前端仍只通过 Next.js API 代理访问知识库后端。

运行命令与结果：

- Select-String 检查本次修改文件：通过，未发现真实 DeepSeek key 落盘。
- python -m py_compile backend/knowledge-base/api_server.py backend/knowledge-base/nl_query_engine.py：通过。
- git diff --name-only：通过，确认本次文件外仍存在用户既有 `alert warning/alert warning/requirements.txt` 变更，未纳入本次范围。
- git diff --check：通过，仅有 LF/CRLF 换行提示。
- npm run lint：通过，0 warning。
- npm run build：通过，Next.js 16.2.9 生成 51 个路由。

提交与推送：

- 已提交并推送：bba7b4e（完善知识智能检索增强问答）。

下一步建议：

- 启动 Neo4j 与知识库 FastAPI 后端，在本地 `backend/knowledge-base/.env` 配置轮换后的 `DEEPSEEK_API_KEY`，再用典型问题验证回答引用是否覆盖指标、措施、标准和案例。

## 39. 最近一次 Codex 任务记录

日期：2026-07-05
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：双重预防机制第一阶段开发，完成数据口径、mock API 和业务骨架打通。

完成范围：

- 核验双重预防 14 个路由文件均已存在，未删除既有双控路由。
- 扩充 `mockDoublePrevention`：风险管控、风险地图、告知卡、措施库、隐患台账、八步闭环、逾期升级、复盘案例、配置规则和文化展板均有 mock 数据。
- 四类触发来源均已覆盖：`real_sensor`、`physics_constrained`、`static_prior`、`manual_check`。
- `R01-R22` 作为真实传感器来源时标记 `sourceType=real_sensor`，可靠性权重为 `1.0`。
- `B01-B41` 相关样例统一标记 `sourceType=physics_constrained`，`needsHumanReview=true`，`majorHazardCandidate=pending`，仅触发待复核、辅助预警或专项复核。
- `S01-S32` 仅作为静态风险先验、管控建议和隐患闭环来源，不占动态通道。
- 新增统一 mock API：`GET /api/double-prevention/[...path]`，统一返回 `ok/module/endpoint/data/meta`，404 返回 `Double prevention resource not found`。
- API 支持 `overview`、`risk-controls`、`risk-map`、`risk-cards`、`risk-cards/{id}`、`measures`、`measure-library`、`hazards`、`hazard-ledger`、`hazards/{id}`、`hazard-ledger/{id}`、`workflow`、`escalations`、`reviews`、`config`、`culture-board`。
- API 已兼容 `RC001` -> `CARD-001`、`H001` -> `HZ-001` 的 ID 映射。
- `/double-prevention/config` 展示风险等级规则、闭环期限规则、逾期升级规则、检查频次规则、责任组织、通知边界和模型接入边界。
- `/double-prevention/culture-board` 展示双控理念、四色风险、八步闭环、真实传感器触发、物理约束生成指标边界、优秀整改案例、班组宣传和考核指标。

当前数据来源：

- 本阶段全部来自本地 TypeScript mock 数据和 Zod schema 校验。
- 当前不接真实模型、不接真实数据库、不触发真实处置。
- 模型分数、模型版本、warningEventId、reliabilityWeight、supportingRealChannels 为后续真实模型 API 和后端台账预留字段。

新增文件：

- frontend/src/app/api/double-prevention/[...path]/route.ts
- frontend/src/data/doublePreventionApi.ts

修改文件：

- frontend/src/data/mockDoublePrevention.ts
- frontend/src/data/mockDataModel.ts
- frontend/src/data/mockMonitoring.ts
- frontend/src/data/businessPages.ts
- frontend/src/schemas/businessSchemas.ts
- frontend/src/types/business.ts
- frontend/src/app/api/knowledge/[...path]/route.ts
- frontend/src/app/api/outburst/[...path]/route.ts
- frontend/src/components/knowledge/KnowledgeOverviewClient.tsx
- frontend/src/components/pages/Stage6SecondaryWorkstationPage.tsx
- frontend/src/config/routeMeta.ts
- docs/frontend-progress.md

未修改范围：

- 未修改 WGAN/data-augmentation 训练逻辑。
- 未接真实数据库。
- 未接真实预警模型 API。
- 未把 B01-B41 写成真实传感器。
- 未把物理约束生成指标作为断电、撤人或重大隐患最终判定依据。

## 31. 最近一次 Codex 任务记录

日期：2026-07-05
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：双重预防机制第二阶段：页面交互、动态 ID 详情、config/culture-board 专用页面、mock API 前端接入。

修改/新增文件：

- frontend/src/lib/doublePreventionApi.ts
- frontend/src/components/double-prevention/Panels.tsx
- frontend/src/components/double-prevention/shared.tsx
- frontend/src/app/double-prevention/**/page.tsx
- frontend/src/data/doublePreventionApi.ts
- frontend/src/data/mockDoublePrevention.ts
- frontend/src/types/business.ts
- frontend/src/schemas/businessSchemas.ts
- docs/frontend-progress.md

新增能力：

- 14 个双重预防路由切换为专用组件。
- 前端统一通过 /api/double-prevention/* 读取 mock API。
- 风险管控、风险告知卡、隐患台账、逾期升级、复盘页面支持筛选和详情联动。
- /double-prevention/risk-cards/[id] 支持 RC001、RC-001、CARD-001。
- /double-prevention/hazard-ledger/[id] 支持 H001、HZ-001。
- config 页面只读展示规则、边界和 mock API 覆盖。
- culture-board 页面展示双控理念、四色风险、八步闭环、班组宣贯和知识库展板边界。

验证命令和结果：

- cd frontend; npm run lint：通过。
- cd frontend; npm run build：通过，生成 51 个路由。
- git diff --check：通过。
- frontend/src 直连后端地址扫描：无命中。
- frontend/src 旧固定通道口径残留扫描：无命中。

API smoke 结果：

- GET /api/double-prevention/overview：200。
- GET /api/double-prevention/risk-controls：200。
- GET /api/double-prevention/risk-cards：200。
- GET /api/double-prevention/risk-cards/RC001：200，返回 CARD-001。
- GET /api/double-prevention/hazards：200。
- GET /api/double-prevention/hazard-ledger/H001：200，返回 HZ-001。
- GET /api/double-prevention/config：200。
- GET /api/double-prevention/culture-board：200。
- GET /api/double-prevention/unknown：404。

页面 smoke 结果：

- /double-prevention、/double-prevention/risk-control、/double-prevention/risk-map、/double-prevention/risk-cards、/double-prevention/risk-cards/RC001、/double-prevention/measure-library、/double-prevention/hazard-governance、/double-prevention/hazard-ledger、/double-prevention/hazard-ledger/H001、/double-prevention/hazard-workflow、/double-prevention/overdue-escalation、/double-prevention/review、/double-prevention/config、/double-prevention/culture-board：全部 200、非空、无框架错误覆盖。

commit / push 状态：

- commit hash：7426a2ad619853095c4d41908534ee87fd9d7f1a。
- push 状态：已 push 到 origin/feature/frontend-worktree。

下一步建议：

- 阶段 3 可做双控页面视觉密度统一、移动端截图复核和后续真实只读后端契约映射。

## 32. 最近一次 Codex 任务记录

日期：2026-07-05
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
本次任务：双重预防机制第三阶段：视觉密度统一、移动端复核、真实只读后端契约映射。

修改/新增文件：

- AGENTS.md
- docs/frontend-progress.md
- frontend/src/components/double-prevention/Panels.tsx
- frontend/src/components/double-prevention/shared.tsx
- frontend/src/data/doublePreventionApi.ts
- frontend/src/data/doublePreventionContract.ts
- frontend/src/lib/doublePreventionApi.ts

视觉密度统一范围：

- 双控模块顶部统一增加 mock API、writeEnabled=false、真实只读契约复核标签。
- 筛选条、表格、key-value 详情卡、八步闭环卡片统一收紧间距和字号。
- 表格保持移动端局部横向滚动，不撑破页面整体。
- 总览和配置页新增只读接口契约矩阵展示，不新增路由。

移动端复核结果：

- 1440px、1024px、390px 三档宽度检查 14 个双控页面。
- 全部页面返回 200、非空、无框架错误覆盖。
- 390px 下筛选条可换行、详情 key-value 单列、八步闭环顺序可读、config/culture-board 无整体横向溢出。

契约矩阵新增情况：

- 新增 frontend/src/data/doublePreventionContract.ts。
- 覆盖 overview、risk-controls、risk-map、risk-cards、risk-card detail、measures、hazards、hazard detail、workflow、escalations、reviews、config、culture-board。
- method 全部为 GET，currentSource 全部为 mock_api，写入风险为 none/disabled。
- config 标注 readonly/no_save，escalations 标注 no_real_notification，culture-board 标注 no_official_publish，physics_constrained 标注 auxiliary_review_only。

API smoke 结果：

- GET /api/double-prevention/overview：200。
- GET /api/double-prevention/risk-controls：200。
- GET /api/double-prevention/risk-cards/RC001：200，返回 CARD-001。
- GET /api/double-prevention/risk-cards/RC-001：200，返回 CARD-001。
- GET /api/double-prevention/risk-cards/CARD-001：200，返回 CARD-001。
- GET /api/double-prevention/hazard-ledger/H001：200，返回 HZ-001。
- GET /api/double-prevention/hazard-ledger/HZ-001：200，返回 HZ-001。
- GET /api/double-prevention/config：200。
- GET /api/double-prevention/culture-board：200。
- GET /api/double-prevention/unknown：404。
- meta 已包含 apiMode=mock、writeEnabled=false、contractVersion=double-prevention-readonly-v1、productionReady=false。

页面 smoke 结果：

- /double-prevention、/double-prevention/risk-control、/double-prevention/risk-map、/double-prevention/risk-cards、/double-prevention/risk-cards/RC001、/double-prevention/measure-library、/double-prevention/hazard-governance、/double-prevention/hazard-ledger、/double-prevention/hazard-ledger/H001、/double-prevention/hazard-workflow、/double-prevention/overdue-escalation、/double-prevention/review、/double-prevention/config、/double-prevention/culture-board：全部 200、非空、无框架错误覆盖。

lint/build/diff-check 结果：

- cd frontend; npm run lint：通过。
- cd frontend; npm run build：通过，生成 51 个路由。
- git diff --check：通过。
- frontend/src 直连后端地址扫描：无命中。
- frontend/src 旧固定通道口径残留扫描：无命中。
- double-prevention page.tsx PageScaffold 残留扫描：无命中。

commit hash：

- 提交后以最终汇报为准。

push 状态：

- 提交后 push 到 origin/feature/frontend-worktree。

下一步建议：

- 阶段 4 可开始真实只读后端字段对齐评审，但仍先保持浏览器只访问 /api/double-prevention/*。

## 33. 最近一次 Codex 任务记录

日期：2026-07-05
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
阶段：后端展示闭环基础打通

完成：

- 修正旧固定通道错误口径，当前页面不再把旧固定通道数量作为系统事实。
- 统一为 63 维动态通道口径：R01-R22 真实传感器指标位 + B01-B41 物理约束生成/估计指标。
- 通道数量改为以后端 meta/sensors/stats 实测为准，不硬编码当前节点数。
- 硬化 /api/outburst/* 代理白名单，移除 outburst 代理内的 knowledge 隐藏路径。
- 扩展 outburstApi 后端接口封装，新增 recent/raw/latest warning/contribution/events ledger/static-risk/batch dry-run。
- 新增接口覆盖矩阵，展示开放策略、页面入口和风险说明。
- 增强监测、预警、溯源、数据、模型页面真实后端展示。
- 禁止 PUT config、PATCH、DELETE 和非白名单接口。
- 保留系统配置写入为未开放状态，配置页仅展示只读快照和禁用说明。

下一步：

- 强化隐患闭环模板。
- 强化 R/B 通道解释和处置建议。
- 完善批量 dry-run 和静态风险试算体验。

## 34. 最近一次 Codex 任务记录

日期：2026-07-05
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
阶段：业务解释与隐患闭环增强

完成：

- 修正 frontend-progress 顶部旧阶段说明，将当前阶段改为后端展示闭环与通道口径修正 / 阶段 2。
- 将旧 62 维记录标注为旧口径，说明已被 63 维附录卡替换。
- 增加 R/B/S 来源分类规则。
- 增加真实传感器、生成/估计指标、静态风险三类业务边界。
- 增加隐患闭环模板数据。
- 增强事件详情风险解释。
- 增强溯源贡献来源解释。
- 增强数据特征页 63 维通道说明。
- 增强静态风险和批量 dry-run 的业务边界说明。

下一步：

- 阶段 3 做验收收口、文档清理、页面一致性检查和最终演示路径整理。

## 35. 最近一次 Codex 任务记录

日期：2026-07-05
分支：feature/frontend-worktree
仓库根目录：D:\coal-gas-outburst-warning-system\gas-outburst-frontend-worktree
阶段：阶段 3 验收收口与最终演示整理

完成：

- 清理当前阶段说明和旧口径冲突。
- 更新后端展示闭环验收清单。
- 更新核心路由映射的数据来源和演示重点。
- 新增最终演示路径文档。
- 检查核心页面文案一致性。
- 确认 R/B/S 边界、写操作边界和 mock/真实数据边界。

下一步：

- 可进入最终演示、答辩截图、真实后端联调或部署收尾。
