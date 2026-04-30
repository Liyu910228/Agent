import { Bot, BrainCircuit, DatabaseZap, Wrench } from "lucide-react";
import type { BootstrapStatus, RunStats } from "../../types";

interface AdminOverviewProps {
  status: BootstrapStatus | null;
  runStats: RunStats | null;
}

function AdminOverview({ status, runStats }: AdminOverviewProps) {
  const metrics = [
    { label: "处理总数", value: runStats?.totalRuns ?? "-", icon: Bot },
    {
      label: "成功率",
      value: runStats ? `${runStats.successRate}%` : "-",
      icon: BrainCircuit
    },
    {
      label: "平均耗时",
      value: runStats ? `${runStats.averageDurationMs}ms` : "-",
      icon: Wrench
    },
    { label: "Token", value: runStats?.totalTokens ?? "-", icon: DatabaseZap }
  ];

  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              key={metric.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{metric.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Icon size={18} />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
          Agent <b className="ml-1 text-slate-900">{status?.agents ?? "-"}</b>
        </span>
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
          Skill <b className="ml-1 text-slate-900">{status?.skills ?? "-"}</b>
        </span>
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
          MCP <b className="ml-1 text-slate-900">{status?.mcpTools ?? "-"}</b>
        </span>
        <span
          className={
            status?.modelServiceConfigured
              ? "rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700"
              : "rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700"
          }
        >
          模型服务 {status?.modelServiceConfigured ? "已配置" : "待配置"}
        </span>
      </div>
    </>
  );
}

export default AdminOverview;
