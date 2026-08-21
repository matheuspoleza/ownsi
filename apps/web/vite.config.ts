import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// In dev the proxy mimics the Worker: a single origin, first-party cookie (PRD §3.1).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/p": "http://localhost:3000",
    },
  },
  build: { outDir: "dist" },
})
