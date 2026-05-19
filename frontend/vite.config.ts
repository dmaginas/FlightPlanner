import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load the .env file for the current mode so we can read VITE_* variables
  // inside the config itself (import.meta.env is not available here).
  const env = loadEnv(mode, process.cwd(), '')

  // Determine the dev-server proxy target from the backend selection.
  // This mirrors what apiConfig.ts does at runtime so that `npm run dev`
  // routes /api/* to the correct backend automatically.
  const backend = env['VITE_API_BACKEND'] ?? 'aspnet'
  const proxyTarget =
    backend === 'node'
      ? (env['VITE_NODE_API_BASE_URL'] ?? 'http://localhost:3001')
      : (env['VITE_ASPNET_API_BASE_URL'] ?? env['VITE_API_BASE_URL'] ?? 'https://localhost:5001')

  // Use secure: false only when the target is HTTPS with a self-signed dev cert.
  const isHttps = proxyTarget.startsWith('https://')

  return {
    plugins: [react()],

    server: {
      proxy: {
        // In local development, forward /api/* to the selected backend.
        // In production the ASP.NET backend itself serves the frontend build
        // (same origin), so no proxy is needed there.
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          // Disable TLS verification for self-signed development certificates.
          secure: !isHttps,
        },
      },
    },
  }
})
