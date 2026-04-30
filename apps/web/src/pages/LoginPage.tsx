import { LockKeyhole, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { apiClient } from "../api/client";
import type { SessionUser } from "../types";

interface LoginPageProps {
  onLogin: (user: SessionUser) => void;
  statusError: string;
}

function LoginPage({ onLogin, statusError }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiClient.login(username, password);
      onLogin(response.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="mb-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <LockKeyhole size={22} />
          </div>
          <h1 className="text-3xl font-semibold">多 Agent 问题处理平台</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            使用管理员或业务员账号进入对应工作台。
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <label className="block text-sm font-medium text-slate-700">
            账号
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            密码
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>

          {(error || statusError) && (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error || statusError}
            </p>
          )}

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoading}
            type="submit"
          >
            <LogIn size={18} />
            {isLoading ? "登录中" : "登录"}
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p>管理员：admin / admin</p>
          <p className="mt-1">业务员：root / 12345</p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;

