import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // In local development, forward /api/* to the backend.
      // In production the backend itself serves the frontend build,
      // so both share the same origin and no proxy is needed.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
