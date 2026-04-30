# 模型服务参考

## OpenAI-compatible 模型接口

第一版按 OpenAI-compatible API 设计。

常见接口：

```text
GET /v1/models
POST /v1/chat/completions
```

## 模型选择启发式

当模型服务未返回完整能力标签时，可根据模型名称做初步判断。

- 名称包含 `mini`、`flash`、`lite`：速度优先
- 名称包含 `reason`、`thinking`、`r1`：推理优先
- 名称包含 `tool`、`function`：工具调用优先
- 名称包含 `long`、`128k`、`200k`、`1m`：长上下文优先

## 安全要求

- API Key 只从后端环境变量读取。
- 前端不展示 API Key。
- 日志不输出完整 API Key。

