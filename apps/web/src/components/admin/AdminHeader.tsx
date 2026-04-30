import { Activity, LogOut, ShieldCheck } from "lucide-react";
import type { BootstrapStatus, SessionUser } from "../../types";

interface AdminHeaderProps {
  onLogout: () => void;
  status: BootstrapStatus | null;
  user: SessionUser;
}

function AdminHeader({ onLogout, status, user }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
            <ShieldCheck size={17} />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">管理员工作台</h1>
            <p className="text-sm text-slate-500">当前账号：{user.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              status?.modelServiceConfigured
                ? "hidden items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 sm:flex"
                : "hidden items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-100 sm:flex"
            }
          >
            <Activity size={14} />
            {status?.modelServiceConfigured ? "模型服务已连接" : "模型服务待配置"}
          </span>
          <button
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={17} />
            退出
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
