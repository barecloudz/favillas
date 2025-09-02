import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react(),
      // Only use development plugins in development  
      ...(isDev ? [runtimeErrorOverlay()] : []),
    ],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"), 
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      minify: isProd ? 'esbuild' : false,
      target: 'es2020',
      cssMinify: 'esbuild',
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
      sourcemap: false,
      rollupOptions: {
        external: isProd ? [] : [],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@tanstack/react-query', 'lucide-react'],
            utils: ['clsx', 'tailwind-merge']
          }
        }
      }
    },
    cacheDir: '.vite-cache',
    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query', 'clsx', 'tailwind-merge'],
      exclude: [],
      force: false
    },
    define: {
      __DEV__: isDev,
      'process.env.NODE_ENV': JSON.stringify(mode),
      'global': 'globalThis',
      'React': 'react'
    },
    esbuild: {
      legalComments: 'none',
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd,
    }
  };
});
