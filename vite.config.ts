import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { commitSha } from './scripts/commit-sha.mjs'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(commitSha()),
  },
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
