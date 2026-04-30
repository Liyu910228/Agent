import { Router } from "express";

const users = [
  { username: "admin", password: "admin", role: "admin" },
  { username: "root", password: "12345", role: "worker" }
] as const;

export const authRoutes = Router();

authRoutes.post("/login", (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  const user = users.find(
    (item) => item.username === username && item.password === password
  );

  if (!user) {
    res.status(401).json({ error: "账号或密码错误" });
    return;
  }

  res.json({
    user: {
      username: user.username,
      role: user.role
    }
  });
});

