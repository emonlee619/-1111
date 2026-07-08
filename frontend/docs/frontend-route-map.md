# 前端路由地图

## 1. 文件定位
## 2. 路由根规则

推荐使用 Next.js App Router。

人工确认结论：前端阶段 1 采用 `frontend/src/app` 作为唯一 Next.js App Router 路由根。

- 禁止创建仓库根目录 `app/`。
- 禁止创建仓库根目录 `src/app/`。
- 禁止创建 `frontend/app/`。
- 只允许创建 `frontend/src/app/`。
- `frontend/package.json` 作为前端项目根配置文件。
- `frontend/public/` 保留为前端静态资源目录。
- `frontend/src/components/`、`frontend/src/lib/`、`frontend/src/types/`、`frontend/src/data/` 用于前端源码组织。

下方路由树使用 `frontend/src/app/` 表示实际落地目录。

## 3. 完整路由树

```txt
frontend/src/app/
  page.tsx                                  -> /
  dashboard/
    page.tsx                                -> /dashboard
  monitoring/
    page.tsx                                -> /monitoring
    realtime/
      page.tsx                              -> /monitoring/realtime
    channels/
      page.tsx                              -> /monitoring/channels
  warning/
    page.tsx                                -> /warning
    events/
      page.tsx                              -> /warning/events
      [id]/
        page.tsx                            -> /warning/events/[id]
  source-tracing/
    page.tsx                                -> /source-tracing
    attention/
      page.tsx                              -> /source-tracing/attention
    events/
      [id]/
        page.tsx                            -> /source-tracing/events/[id]
  regions/
    page.tsx                                -> /regions
    [regionId]/
      page.tsx                              -> /regions/[regionId]
  double-prevention/
    page.tsx                                -> /double-prevention
    risk-control/
      page.tsx                              -> /double-prevention/risk-control
    risk-map/
      page.tsx                              -> /double-prevention/risk-map
    risk-cards/
      page.tsx                              -> /double-prevention/risk-cards
      [id]/
        page.tsx                            -> /double-prevention/risk-cards/[id]
    measure-library/
      page.tsx                              -> /double-prevention/measure-library
    hazard-governance/
      page.tsx                              -> /double-prevention/hazard-governance
    hazard-ledger/
      page.tsx                              -> /double-prevention/hazard-ledger
      [id]/
        page.tsx                            -> /double-prevention/hazard-ledger/[id]
    hazard-workflow/
      page.tsx                              -> /double-prevention/hazard-workflow
    overdue-escalation/
      page.tsx                              -> /double-prevention/overdue-escalation
    review/
      page.tsx                              -> /double-prevention/review
    config/
      page.tsx                              -> /double-prevention/config
    culture-board/
      page.tsx                              -> /double-prevention/culture-board
  twin/
    page.tsx                                -> /twin
    tunnel/
      page.tsx                              -> /twin/tunnel
    risk-heatmap/
      page.tsx                              -> /twin/risk-heatmap
    sensors/
      page.tsx                              -> /twin/sensors
  knowledge/
    page.tsx                                -> /knowledge
    search/
      page.tsx                              -> /knowledge/search
    causal-graph/
      page.tsx                              -> /knowledge/causal-graph
    culture-board/
      page.tsx                              -> /knowledge/culture-board
  agent/
    page.tsx                                -> /agent
  data/
    page.tsx                                -> /data
    dynamic/
      page.tsx                              -> /data/dynamic
    static/
      page.tsx                              -> /data/static
      import/
        page.tsx                            -> /data/static/import
    features/
      page.tsx                              -> /data/features
    datasets/
      page.tsx                              -> /data/datasets
    augmentation/
      page.tsx                              -> /data/augmentation
  model/
    page.tsx                                -> /model
    evaluation/
      page.tsx                              -> /model/evaluation
    version/
      page.tsx                              -> /model/version
  system/
    page.tsx                                -> /system
    users/
      page.tsx                              -> /system/users
    logs/
      page.tsx                              -> /system/logs
    config/
      page.tsx                              -> /system/config
```

## 4. 后端展示闭环演示路由

### `/monitoring`

- 页面作用：监测侧总览入口。
- 数据来源：`/api/outburst/health`、`/api/outburst/stats`。
- 演示重点：后端状态、动态数据量、实测节点数、最新数据时间。

### `/monitoring/realtime`

- 页面作用：实时监测工作台。
- 数据来源：`/api/outburst/sensors/latest`、`/api/outburst/sensor-data/series`、`/api/outburst/sensor-data/recent`。
- 演示重点：趋势曲线、近期采样、后端不可用占位。

### `/monitoring/channels`

- 页面作用：监测通道元数据核查。
- 数据来源：`/api/outburst/meta`、`/api/outburst/sensors/latest`。
- 演示重点：单位、空间位置、source_type、当前返回节点数。

### `/warning/events`

- 页面作用：预警事件列表。
- 数据来源：`/api/outburst/warnings`、`/api/outburst/warnings/latest`。
- 演示重点：事件列表、风险等级、动态/静态/综合风险。

### `/warning/events/[id]`

- 页面作用：单事件详情。
- 数据来源：`/api/outburst/warnings/{id}`、`/api/outburst/warnings/{id}/contribution`。
- 演示重点：风险解释、闭环模板、处置建议、人工复核提示。

### `/source-tracing/attention`

- 页面作用：贡献节点和注意力解释。
- 数据来源：预警贡献接口、`/api/outburst/meta`。
- 演示重点：R/B 来源、业务边界、贡献度不是唯一物理因果。

### `/source-tracing/events/[id]`

- 页面作用：事件流转与台账。
- 数据来源：`/api/outburst/events/ledger`、事件详情接口。
- 演示重点：触发、确认、处置、复核、关闭的保守展示。

### `/data/dynamic`

- 页面作用：动态数据资产。
- 数据来源：`/api/outburst/sensor-data/series`、`/api/outburst/sensor-data/recent`。
- 演示重点：降采样趋势、近期采样、不全量加载。

### `/data/static`

- 页面作用：静态数据与风险试算。
- 数据来源：`/api/outburst/static-data`、手动 `POST /api/outburst/static-risk`。
- 演示重点：S01-S32 静态风险项、不占动态槽位、试算不写正式事件。

### `/data/features`

- 页面作用：动态通道口径说明。
- 数据来源：63 维附录卡口径、`/api/outburst/meta`。
- 演示重点：R01-R22、B01-B41、source_type、当前后端节点数。

### `/model`

- 页面作用：模型推理入口。
- 数据来源：预警后端状态、手动 `POST /api/outburst/predict`。
- 演示重点：预测必须手动触发，可能写入事件台账。

### `/model/evaluation`

- 页面作用：批量推理 dry-run。
- 数据来源：手动 `POST /api/outburst/predict-batch`。
- 演示重点：dry_run=true、不写正式台账、生成/估计通道仅辅助解释。

### `/model/version`

- 页面作用：模型配置只读快照。
- 数据来源：`GET /api/outburst/config`。
- 演示重点：配置脱敏、只读展示、不提供编辑。

### `/system/config`

- 页面作用：系统配置写入边界说明。
- 数据来源：`GET /api/outburst/config` 只读快照和本地禁用说明。
- 演示重点：真实配置写入未开放，需要鉴权与审计后才能启用。
