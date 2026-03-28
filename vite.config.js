import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    // 確保資源路徑正確
    assetsInlineLimit: 100000000, 
    chunkSizeWarningLimit: 100000000,
  },
})