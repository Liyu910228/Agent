# 多 Agent 用户问题处理平台架构

## 1. 技术栈

### 前端

- React
- TypeScript
- Vite
- Tailwind CSS
- lucide-react
- 端口：3003

### 后端

- Node.js
- TypeScript
- Express
- OpenAI-compatible API
- 端口：8083

### 存储

第一版使用内存或 JSON 文件存储：

- Agent 配置
- Skill 注册信息
- MCP 工具注册信息
- 模型列表缓存
- 处理记录
- 城市 ID 知识库：`data/city-ids.tsv`，天气 MCP 调用前用于查询 CityID

后续可替换为 SQLite、PostgreSQL、Redis 或向量数据库。

## 2. 目录结构

```text
Agent/
  apps/
    web/
      src/
        pages/
          LoginPage.tsx
          AdminPage.tsx
          WorkerPage.tsx
        components/
          Layout.tsx
          AgentTrace.tsx
          StatusBadge.tsx
        api/
          client.ts
        types/
          index.ts
        main.tsx
        App.tsx
      vite.config.ts
      package.json

    api/
      src/
        config/
          env.ts
        data/
          store.ts
          seed.ts
        modules/
          agents/
            agentRegistry.ts
            agentTypes.ts
          models/
            modelClient.ts
            modelSelector.ts
            modelTypes.ts
          skills/
            skillRegistry.ts
            skillTypes.ts
          mcp/
            mcpRegistry.ts
            mcpTypes.ts
          orchestrator/
            orchestrator.ts
            router.ts
            runTypes.ts
          auth/
            authRoutes.ts
          runs/
            runRoutes.ts
        server.ts
      package.json

  docs/
    PRD.md
    ARCHITECTURE.md
    STATUS.md

  .env.example
  README.md
```

## 3. 模块边界

### 前端

前端只负责页面展示和调用后端 API。

- 不保存真实 API Key
- 不直接调用模型服务
- 不包含 Agent 调度逻辑

### 后端

后端负责业务核心能力。

- 登录
- Agent 调度
- 模型列表获取
- 模型调用
- 模型自动选择
- Skill 调用
- MCP 工具调用
- 处理记录保存

## 4. 后端模块

### Auth

第一版内置账号：

- admin/admin，角色 admin
- root/12345，角色 worker

### Agents

管理内置 Agent。

- Router Agent
- General Agent
- Research Agent
- Reasoning Agent
- Tool Agent
- Reviewer Agent

### Models

负责模型服务接入。

- 从 LLM_BASE_URL 获取模型列表
- 使用 LLM_API_KEY 进行认证
- 缓存模型列表
- 根据任务类型自动选择模型
- 调用 chat completion

### Skills

本地 Skill 注册表。

- classify_question
- summarize_text
- analyze_problem
- extract_action_items

### MCP

第一版实现 MCP 工具抽象层、模拟工具、MCP Server 注册表和天气城市 ID 知识库查询。

- search_docs
- query_order_status
- create_ticket
- 内置模拟 MCP Server
- 用户配置的 stdio/http/sse MCP Server
- 支持粘贴 `mcpServers` JSON 配置批量导入
- Server 配置持久化到 `data/mcp-servers.json`
- Server 连通性测试，HTTP/SSE 模式发送轻量 JSON-RPC 请求，stdio 模式校验启动配置
- Header 支持 `${ENV_NAME}` 环境变量占位符，测试时由后端解析
- 天气类 MCP 调用前先从 `data/city-ids.tsv` 按问题中的城市/区县名称查询 CityID，再传入工具参数

后续可接入真实 MCP Client。

### Orchestrator

核心调度器。

职责：

- 接收业务员问题
- 判断问题类型
- 选择 Agent
- 选择模型
- 判断是否调用 Skill/MCP
- 执行业务员通过 `/` 菜单指定的 Skill/MCP 调用指令
- 执行 Agent 和工具
- 调用 Reviewer Agent
- 保存处理记录
- 返回最终答案和调用链

### Runs

处理记录查询模块，为管理员页面提供记录列表和详情。

## 5. 核心数据流

```text
业务员提交问题
  ↓
后端 Orchestrator
  ↓
Router 判断问题类型
  ↓
Model Selector 选择模型
  ↓
选择 Agent、Skill、MCP
  ↓
执行 Agent 和工具
  ↓
Reviewer Agent 审核整理
  ↓
保存 Run Record
  ↓
返回最终答案和调用链
```

## 6. API 草案

```text
POST /api/auth/login
GET  /api/agents
PATCH /api/agents/:id
GET  /api/models
POST /api/models/refresh
GET  /api/skills
GET  /api/mcp/tools
GET  /api/mcp/servers
POST /api/mcp/servers
POST /api/mcp/servers/import-json
PATCH /api/mcp/servers/:id
POST /api/mcp/servers/:id/test
POST /api/runs
GET  /api/runs
GET  /api/runs/:id
```

`POST /api/runs` 支持可选 `directives` 字段，业务员页面的 `/` 菜单会用它指定本次要直接调用的 Skill、MCP Tool 或 MCP Server：

```json
{
  "question": "深圳天气怎么样",
  "directives": {
    "skillIds": ["summarize_text"],
    "mcpToolIds": ["query_order_status"],
    "mcpServerIds": ["weather-server"]
  }
}
```

## 7. 安全原则

- API Key 只在后端读取
- 不提交 `.env`
- 提供 `.env.example`
- 日志中不输出完整 API Key
- 前端不展示 API Key 明文
- 模型调用失败时返回可读错误，不泄露敏感配置
