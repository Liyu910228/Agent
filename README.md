# 多 Agent 用户问题处理平台

自动化多 Agent 用户问题处理平台。业务员输入用户问题，系统后续会自动选择 Agent、模型、Skill 和 MCP 工具处理；管理员负责配置和查看运行记录。

## 开发端口

- 前端：http://localhost:3003
- 后端：http://localhost:8083

## 环境变量

复制 `.env.example` 为 `.env` 后填写真实模型服务配置。

```text
PORT=8083
LLM_BASE_URL=
LLM_API_KEY=
LLM_DEFAULT_MODEL=
WEB_ORIGIN=http://localhost:3003
```

## 安装依赖

```bash
npm install
```

## 启动开发服务

```bash
npm run dev -w @agent-platform/api
npm run dev -w @agent-platform/web
```

## 质量检查

```bash
npm run check
```

## 测试账号

- 管理员：admin / admin
- 业务员：root / 12345

