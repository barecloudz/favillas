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
      // Only load cartographer for Replit environment in development
      // Note: Removed async import to fix vite config type issues
    ],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
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
      // Optimize build performance aggressively
      minify: isProd ? 'esbuild' : false, // Skip minification in dev builds
      target: 'es2020', // Modern target for smaller bundles
      cssMinify: 'esbuild',
      reportCompressedSize: false, // Skip gzip size reporting to save time
      chunkSizeWarningLimit: 2000, // Increase to reduce warnings
      sourcemap: false, // Disable sourcemaps for faster builds
      rollupOptions: {
        output: {
          // Simple manual chunks for better caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@tanstack/react-query', 'lucide-react'],
            utils: ['clsx', 'tailwind-merge']
          }
        }
      }
    },
    // Enable build caching and optimization
    cacheDir: '.vite-cache',
    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query', 'clsx', 'tailwind-merge'],
      exclude: [],
      force: false // Don't force re-optimization unless needed
    },
    define: {
      // Pre-define environment variables to avoid runtime checks
      __DEV__: isDev,
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    esbuild: {
      // Optimize esbuild for production
      legalComments: 'none',
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd,
    }
  };
});
