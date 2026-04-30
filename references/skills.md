# Skill 参考

## Skill 元数据

每个 Skill 建议包含：

- id
- name
- description
- useCases
- inputSchema
- outputSchema
- enabled

## 第一版内置 Skill

- classify_question：问题分类
- summarize_text：文本总结
- analyze_problem：复杂问题分析
- extract_action_items：提取行动项

## 调用要求

- Router Agent 判断是否需要 Skill。
- Skill 执行输入输出写入调用链。
- Skill 失败不能导致整个流程崩溃。

