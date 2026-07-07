# 煤矿瓦斯灾害知识库后端服务

基于 FastAPI + Neo4j + PostgreSQL 的知识库后端，为前端 `知识智能` 模块提供指标、规则、措施、案例、自然语言查询等 API。

## 启动

```bash
cd backend/knowledge-base
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
# 复制 .env.example 为 .env，按实际环境填写 Neo4j / PostgreSQL / DeepSeek 配置
python api_server.py
```

启动成功后：

- API 根地址：http://127.0.0.1:8000
- Swagger 文档：http://127.0.0.1:8000/docs

## 依赖外部服务

- Neo4j（默认 `bolt://localhost:7687`）
- PostgreSQL（默认 `localhost:5432`，库名 `coalgas_warning`）
- DeepSeek Chat Completions（可选，仅 `POST /api/ai-answer` 需要 `DEEPSEEK_API_KEY`）

任一服务不可用时，对应接口会返回 503 或空结果，不影响其它接口与前端代理。
`/api/ai-answer` 在未配置 DeepSeek 或调用失败时会降级为仅基于 Neo4j 检索证据的结构化摘要，不会编造无证据结论。

## 文件结构

```
backend/knowledge-base/
├── api_server.py            # FastAPI 入口，包含全部 REST 接口
├── neo4j_knowledge_base.py  # Neo4j 知识库核心类
├── nl_query_engine.py       # 自然语言查询引擎
├── postgres_storage.py      # PostgreSQL 静态数据与评价结果存储
├── fuzzy_evaluation.py       # 模糊数学综合评价
├── requirements.txt
├── .env.example             # 环境变量模板（不含真实密码）
└── .gitignore
```

## 与前端的连接

前端通过 Next.js API 代理 `frontend/src/app/api/knowledge/[...path]/route.ts` 将
`/api/knowledge/*` 转发到本服务 `/api/*`，前端不直接连接 Neo4j / PostgreSQL。

`KNOWLEDGE_API_BASE_URL` 默认指向 `http://127.0.0.1:8000`，可在 `frontend/.env.local` 覆盖。

## 检索增强问答

`POST /api/ai-answer` 接收：

```json
{ "question": "瓦斯超限应该怎么处理？", "top_k": 8 }
```

返回内容包含：

- `answer`：DeepSeek 基于知识库证据合成的回答；未配置 key 时为检索摘要。
- `citations`：本次命中的指标、规则措施、标准或案例证据。
- `structured_query`：自然语言解析结果与检索关键词。
- `warning`：未配置 key、模型调用失败或证据不足等边界提示。

真实 DeepSeek key 只应写入本地 `backend/knowledge-base/.env`，不要提交到仓库。

## 已知限制

- `version_management.py` 未随包提供，对应 `/api/version/*` 与 `/api/update-logs/*` 接口会返回 503。
- `psycopg2-binary` 在某些 Windows 环境下若安装失败，可改用 `psycopg2` 或预编译轮子。
