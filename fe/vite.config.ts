/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Also read fe/.env.local, so VITE_API_PROXY does not have to be set in the shell every time.
  // A variable set in the shell wins over the file.
  const env = loadEnv(mode, process.cwd(), '')
  // Set VITE_API_PROXY when the backend runs on another port.
  const apiProxyTarget = process.env.VITE_API_PROXY ?? env.VITE_API_PROXY ?? 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Listen on every interface so a phone on the same Wi-Fi can open http://<LAN IP>:5173 as well as localhost.
      host: true,
      proxy: {
        '/api': apiProxyTarget,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: false,
      // tests do not depend on the backend address in a local .env file
      env: { VITE_API_BASE_URL: '' },
    },
  }
})
