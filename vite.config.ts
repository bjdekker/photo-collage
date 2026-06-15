import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Ensure service worker is not bundled with the app
        manualChunks: undefined
      }
    }
  },
  // Ensure public files like service-worker.js and manifest.json are copied as-is
  publicDir: 'public',
})
