/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // e2e/ 는 Playwright 전용이라 vitest 가 집어가면 안 된다(@playwright/test import 로 실패)
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
  base: '/', // Use root-relative assets so nested SPA routes load deployed files.
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
})
