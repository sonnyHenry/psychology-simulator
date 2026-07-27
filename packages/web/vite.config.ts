import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages 项目页部署时由 CI 注入 VITE_BASE=/仓库名/,本地保持 /
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
