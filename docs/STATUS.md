# 项目状态

## 当前阶段

Vibe Coding 步骤 12/13：小步迭代与模块边界维护。

## 已确认内容

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 平台定位 | 已确认 | 自动化多 Agent 用户问题处理平台 |
| 用户流程编排 | 已确认 | 业务员不编排流程，系统自动调度 Agent |
| 页面范围 | 已确认 | 登录页、管理员页面、业务员页面 |
| 管理员账号 | 已确认 | admin/admin |
| 业务员账号 | 已确认 | root/12345 |
| 真实模型 API | 已确认 | 使用 LLM_BASE_URL 和 LLM_API_KEY |
| 模型列表获取 | 已确认 | 后端自动获取并展示 |
| 自动模型选择 | 已确认 | 按任务类型选择模型 |
| Skill 自动调用 | 已确认 | 后端本地 Skill 注册表 |
| MCP 自动调用 | 已确认 | 第一版抽象层加模拟工具，预留真实 MCP Client |
| 前端端口 | 已确认 | 3003 |
| 后端端口 | 已确认 | 8083 |
| 技术栈 | 已确认 | React + TypeScript + Vite + Tailwind，Node.js + TypeScript + Express |
| 开发规范 | 已创建 | docs/DEVELOPMENT.md |
| 参考资料夹 | 已创建 | references/ |
| Git 基础配置 | 已创建 | .gitignore |
| 环境变量样例 | 已创建 | .env.example |
| 根级质量命令 | 已创建 | package.json |

## 第一版范围

| 功能 | 状态 |
| --- | --- |
| 登录页 | 骨架已创建 |
| 管理员页面 | 骨架已创建 |
| 业务员页面 | 骨架已创建 |
| Auth API | 骨架已创建 |
| Agent 注册表 | 第一切片已创建 |
| 模型服务接入 | 模型列表切片已创建 |
| 模型自动选择 | 已创建 |
| Skill 注册表 | 第一切片已创建 |
| MCP 工具抽象 | 第一切片已创建 |
| MCP Server 注册表 | 已创建 |
| Orchestrator | 第一切片已创建 |
| 处理记录 | 第一切片已创建 |
| 管理员 Agent 配置 | 已创建 |
| 管理员 Skill/MCP 展示 | 已创建 |

## 待确认步骤

1. 步骤 15：科学应对报错
2. 步骤 16：改完必须验证和人工确认
3. 步骤 17：功能验收

## 最近验证

| 检查项 | 结果 | 命令或方式 |
| --- | --- | --- |
| 依赖安装 | 通过 | npm install |
| 类型检查 | 通过 | npm run check |
| 后端构建 | 通过 | npm run check |
| 前端构建 | 通过 | npm run check |
| 后端健康检查 | 通过 | GET http://localhost:8083/api/health |
| 前端页面响应 | 通过 | GET http://localhost:3003 |
| 管理员登录 | 通过 | admin/admin 返回 admin |
| 业务员登录 | 通过 | root/12345 返回 worker |
| 错误登录 | 通过 | 返回 401 |
| 业务员提交问题 API | 通过 | POST /api/runs |
| 工具型路由 | 通过 | 订单状态问题调用 Tool Agent 和 query_order_status |
| 资料型路由 | 通过 | 政策资料问题调用 Research Agent 和 search_docs |
| 分析型路由 | 通过 | 分析方案问题调用 Reasoning Agent 和分析类 Skill |
| 管理员处理记录 API | 通过 | GET /api/runs |
| 模型状态 API | 通过 | GET /api/models |
| 模型刷新未配置分支 | 通过 | POST /api/models/refresh 返回可读错误 |
| 模型列表解析 | 通过 | 使用 mock OpenAI-compatible /v1/models 响应验证 |
| 真实模型配置 | 通过 | DashScope compatible-mode 模型列表刷新成功，默认模型 qwen-plus |
| 自动模型选择 | 通过 | 每个 Agent 独立选模型，并尽量避开本次 Run 已使用模型 |
| 真实 Chat Completions | 通过 | Agent step 调用真实模型，写入输出、token 信息，并支持默认模型兜底 |
| 模型失败避让 | 通过 | Chat 调用失败后标记模型暂不可用，后续选择自动跳过 |
| 管理员配置台 | 通过 | Agent 可编辑且调度读取配置，Skill/MCP 可查看 |
| 全局 Skill 发现 | 通过 | 自动读取 ~/.codex/skills 下的 SKILL.md 并按问题类型匹配 |
| Garden Skills 平台配置 | 通过 | gpt-image-2、kb-retriever、web-design-engineer 标记为平台 Skill |
| Skill 启用禁用 | 通过 | 管理员可切换 Skill 状态，自动调度跳过禁用 Skill |
| MCP 启用禁用 | 通过 | 管理员可切换 MCP 工具状态，自动调度降级处理禁用工具 |
| 处理记录详情 | 通过 | 管理员可展开 Run 查看完整调用链、模型、token、错误 |
| 本地 JSON 持久化 | 通过 | Run、Agent 配置、Skill/MCP 开关写入 data/*.json，重启后恢复 |
| Agent 模型策略 | 通过 | 管理员可配置 Agent 自动/固定模型，调度优先读取配置 |
| 业务员运行状态 | 通过 | 提交期间防重复、显示处理状态和最近处理记录 |
| 管理员运行指标 | 通过 | 后端计算 Run 总数、成功率、平均耗时、token 并展示 |
| 管理员页面模块拆分 | 通过 | AdminPage 拆分为总览、Agent、能力、模型、记录组件，check 通过 |
| MCP Server 注册表 | 通过 | 管理员可登记 stdio/http MCP Server，后端持久化到 data/mcp-servers.json |
| MCP Server 连通性测试 | 通过 | 管理员可测试 MCP Server，内置模拟 Server 和 HTTP/stdio 配置返回可读结果 |
| MCP JSON 配置导入 | 通过 | 支持 mcpServers JSON，包含 sse、baseUrl、headers、isActive，并保留环境变量占位符 |
| 业务端聊天界面 | 通过 | 业务员页面已简化为一问一答聊天界面，不展示管理型调用链信息 |
| 日志分页管理 | 通过 | 管理员日志按 page/pageSize 分页加载，展示总数和页码 |
| MCP 自动匹配调用 | 通过 | 天气/实时/搜索类问题会匹配已配置 MCP Server；天气 MCP 已验证自动调用成功 |
| 天气问答结果修正 | 通过 | 深圳天气问题走 Tool Agent，传入墨迹 CityID=892 和工具 token，最终只输出天气结果 |
| 业务员调度摘要 | 通过 | 答案区集中展示本次自动调用的 Agent、模型、Skill、MCP，check 通过 |
| 安全底线走查 | 通过 | .env 已忽略，源码/文档未发现真实 sk-* 密钥，Key 仅由后端环境变量读取 |
| MCP SSE 响应解析增强 | 通过 | 支持 JSON、SSE data 多行事件、[DONE] 忽略和不可解析响应可读报错；api build 通过 |
| 天气城市 ID 知识库 | 通过 | 已建立 data/city-ids.tsv，天气 MCP 调用前优先查询知识库；深圳=892、北京朝阳区=3、成都=2635 已验证 |
| 业务端 New chat | 通过 | 业务员页面新增 New chat 按钮，可清空当前前端聊天记录和已选能力 |
| 业务端 Slash 能力调用 | 通过 | 输入 / 可选择 Skill、MCP Tool、MCP Server；POST /api/runs 支持 directives 指定本次调用能力 |
| QwenImage MCP 生图 | 通过 | 根因是缺少 prompt 参数；已补充图像关键词路由和 MCP prompt 参数，真实调用返回图片 URL |
| 业务端图片预览 | 通过 | 业务员聊天消息支持 Markdown 图片和图片直链渲染，QwenImage 返回结果可直接预览 |
| 管理员/业务员页面优化 | 通过 | 管理员页优化顶部状态、指标卡、能力区和日志区；业务员页优化聊天头部、空态和输入区；check 通过 |
| 页面时间显示 | 通过 | 业务员对话消息显示真实发送/完成时间；管理员日志显示创建和完成时间；格式为 yyyy/M/d HH:mm |
| 业务端多会话主题 | 通过 | 业务员页面新增左侧 chat 列表和主题设置，每个 chat 独立保存背景主题并持久化到 localStorage；check 通过 |
| 业务端图片上传与 VL 处理 | 通过 | 图片附件进入 Vision Agent，使用 LLM_VISION_MODEL=qwen3-vl-plus 调用视觉模型；20x20 测试图片识别通过 |
| 业务端语音输入 | 通过 | 输入框新增麦克风按钮，基于浏览器 Web Speech API 进行中文听写，识别结果自动填入当前问题；check 通过 |
| Feedback Agent 错误反馈 | 通过 | 新增 Feedback Agent；不前置拦截用户问题，工具/MCP 执行后若失败则反馈具体报错原因，参数类错误再提示用户如何补充提问 |
| 管理员能力配置编辑 | 通过 | 管理员页面支持 Skill 启用/禁用和名称/描述编辑；支持 MCP Server 新增、编辑、启用/禁用、headers 配置和测试；MCP Tool 支持启用/禁用 |

## 风险与备注

- 第一版账号密码仅用于开发验证，后续需要替换为真实认证。
- API Key 必须通过环境变量配置，不能提交到仓库。
- MCP 第一版先提供抽象和模拟工具，真实 MCP Client 接入需要后续确认具体 server 配置。
- 模型能力标签可能无法从模型服务完整获取，第一版需要结合模型名称进行启发式分类。
- WebSearch SSE 已增强通用 JSON/SSE 响应解析；仍需用真实 WebSearch Server 做一次端到端回归。

## PRD 验收结论

| 验收项 | 结论 | 说明 |
| --- | --- | --- |
| 登录与角色跳转 | 通过 | admin/admin 进入管理员页，root/12345 进入业务员页，错误账号返回 401 |
| 管理员页面 | 通过 | 可查看/配置 Agent、模型、Skill、MCP、处理记录和调用链 |
| 业务员页面 | 通过 | 可提交问题、查看处理状态、最终答案、调用链和自动调度摘要；支持 New chat 和 Slash 指定能力 |
| 模型接入 | 通过 | DashScope compatible-mode 已接入，模型列表刷新、自动选择、失败避让可用 |
| Skill 自动调用 | 通过 | 内置 Skill 和全局 Garden Skills 可发现、启停，并按问题类型匹配 |
| MCP 自动调用 | 部分通过 | 内置模拟 MCP 工具已自动调用；真实 MCP Client 仍需具体 Server 协议配置后接入 |
| 安全要求 | 通过 | Key 仅由后端环境变量读取，前端和文档未暴露真实密钥 |
| 天气城市 ID 查询 | 通过 | 天气 MCP 参数构造前会从本地知识库匹配城市/区县 CityID |
