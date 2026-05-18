import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // In local development, forward /api/* to the ASP.NET Core backend.
      // HTTPS with a self-signed dev certificate: secure is set to false.
      // In production the backend itself serves the frontend build,
      // so both share the same origin and no proxy is needed.
      //
      // Change the target port here or set VITE_API_BASE_URL in frontend/.env
      // if the ASP.NET backend runs on a different port.
      '/api': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
