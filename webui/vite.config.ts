import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy ZAP API requests to ZAP API server during development
      "/JSON": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/UI": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/OTHER": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
})
