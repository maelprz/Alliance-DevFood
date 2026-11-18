import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
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
