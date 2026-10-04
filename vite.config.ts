import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: true,
    proxy: {
      '/api/wait-times': { target: 'https://edwaittimes.ca', changeOrigin: true },
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api/wait-times': { target: 'https://edwaittimes.ca', changeOrigin: true },
    },
  },
})
