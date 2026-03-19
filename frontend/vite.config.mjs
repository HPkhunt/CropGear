import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000'
  const basePath = env.VITE_BASE_PATH || '/'
  const requestedPort = Number(env.VITE_DEV_PORT || env.VITE_PORT || 5173)
  const devPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 5173
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`

  return {
    plugins: [react()],
    server: {
      port: devPort,
      strictPort: false,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    build: { outDir: 'dist' },
    base: normalizedBase
  }
})
