import { defineConfig } from 'vite';
import { default as viteReact } from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import svgr from 'vite-plugin-svgr';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact(), svgr(), tailwindcss()],
  server: {
    strictPort: true,
  },
  build: {
    outDir: `build`,
  },
  resolve: {
    alias: {
      $fonts: resolve('./public/fonts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
