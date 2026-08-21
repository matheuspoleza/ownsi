import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Em dev o proxy imita o Worker: uma origem só, cookie first-party (PRD §3.1).
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
