export type QuestionType = "general" | "research" | "reasoning" | "tool";

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

export const classifyQuestion = (question: string): QuestionType => {
  if (
    includesAny(question, [
      "查询",
      "订单",
      "状态",
      "编号",
      "客户",
      "工单",
      "天气",
      "气温",
      "温度",
      "下雨",
      "实时",
      "搜索",
      "今天",
      "现在",
      "图片",
      "图像",
      "画图",
      "画一张",
      "生图",
      "插画",
      "海报",
      "生成一张",
      "生成图",
      "文生图",
      "image",
      "weather",
      "forecast"
    ])
  ) {
    return "tool";
  }

  if (includesAny(question, ["怎么", "为什么", "分析", "方案", "建议"])) {
    return "reasoning";
  }

  if (includesAny(question, ["资料", "文档", "政策", "知识库", "规定"])) {
    return "research";
  }

  return "general";
};
