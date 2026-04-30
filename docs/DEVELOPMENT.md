# 开发规范

## 1. 通用原则

- 使用 TypeScript。
- 前端不保存、不展示、不传递真实模型 API Key。
- 后端从环境变量读取敏感配置。
- 业务调度逻辑放在后端，不写进 UI 组件。
- Agent、Skill、MCP、Model、Run Record 分模块维护。
- 第一版以清晰可运行为优先，避免过早抽象。

## 2. 命名规范

- 文件名：React 组件使用 PascalCase，例如 `LoginPage.tsx`；普通模块使用 camelCase，例如 `modelSelector.ts`。
- 类型名：PascalCase，例如 `AgentConfig`、`RunRecord`。
- 变量和函数：camelCase。
- 常量：UPPER_SNAKE_CASE。
- API 路由：使用复数资源名，例如 `/api/agents`、`/api/runs`。

## 3. 前端规范

- 页面放在 `apps/web/src/pages`。
- 通用组件放在 `apps/web/src/components`。
- API 客户端放在 `apps/web/src/api`。
- 跨页面类型放在 `apps/web/src/types`。
- UI 组件不直接拼接后端 URL，统一通过 `api/client.ts`。
- 样式优先使用 Tailwind class，避免大段内联样式。

## 4. 后端规范

- 配置读取集中在 `apps/api/src/config/env.ts`。
- Agent 相关逻辑放在 `modules/agents`。
- 模型接入和选择放在 `modules/models`。
- Skill 注册和执行放在 `modules/skills`。
- MCP 工具注册和执行放在 `modules/mcp`。
- 调度主流程放在 `modules/orchestrator`。
- 处理记录查询放在 `modules/runs`。

## 5. 环境变量

必须提供 `.env.example`，真实 `.env` 不提交。

```text
PORT=8083
LLM_BASE_URL=
LLM_API_KEY=
LLM_DEFAULT_MODEL=
WEB_ORIGIN=http://localhost:3003
```

## 6. 错误处理

- 后端 API 返回统一错误结构。
- 模型调用失败时记录失败原因。
- Skill/MCP 单步失败时写入调用链。
- 自动模型选择失败时回退默认模型，并记录回退原因。

## 7. 日志与安全

- 不打印完整 API Key。
- 错误日志可包含模型服务状态码和错误摘要。
- Run Record 可记录模型名、耗时、token 信息和调用状态。
- 开发账号仅用于第一版本地验证。

## 8. 质量检查

第一版至少提供：

- TypeScript 类型检查
- 前端构建
- 后端构建
- 基础 lint 或格式化命令

根目录质量命令：

```text
npm run typecheck
npm run lint
npm run build
npm run check
```

各应用在步骤 10 创建可运行骨架时补齐自己的脚本。

## 9. 文件大小建议

- 单个源文件超过约 300 行时，优先拆分到同模块子文件。
- 跨模块复用逻辑放到明确的 shared/common 位置。
- Feature 内部实现不直接依赖另一个 Feature 的内部文件。
