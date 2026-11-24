import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, "index.html"),
        admin: resolve(projectRoot, "admin/index.html"),
        adminOrders: resolve(projectRoot, "admin/orders/index.html"),
        adminMenu: resolve(projectRoot, "admin/menu/index.html"),
        adminStatistics: resolve(projectRoot, "admin/statistics/index.html"),
        adminCoupons: resolve(projectRoot, "admin/coupons/index.html"),
        adminNotifications: resolve(projectRoot, "admin/notifications/index.html"),
        adminUsers: resolve(projectRoot, "admin/users/index.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Forwards all /api requests from React → ASP.NET Core API on port 5143.
      // This eliminates CORS issues and avoids hardcoding the backend port in frontend code.
      "/api": {
        target: "http://localhost:5143",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5143",
        changeOrigin: true,
      },
    },
  },
});
