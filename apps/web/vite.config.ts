import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3003,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: 3003
    }
  }
});

