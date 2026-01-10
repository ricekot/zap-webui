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
      // Proxy API requests to ZAP API server
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        // Note: /api/events WebSocket is served by the add-on's WebUiServer,
        // not by ZAP's API. During development, you'll need to run the add-on
        // or mock the WebSocket endpoint.
      },
    },
  },
})
