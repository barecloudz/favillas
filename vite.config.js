import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  root: "./client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: 'esbuild',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./client/src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@assets': fileURLToPath(new URL('./attached_assets', import.meta.url)),
    },
  },
  cacheDir: '.vite-cache',
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: [],
    force: false
  }
});
