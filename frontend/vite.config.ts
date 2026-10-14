import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The Pages/base path can be overridden at build time:
//   BASE_PATH=/WeatherApplication/ npm run build
// (see .github/workflows/pages.yml). Defaults to root.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
