import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react(),
      // Only use development plugins in development
      ...(isDev ? [runtimeErrorOverlay()] : []),
      ...(isDev && process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
            ),
          ]
        : []),
    ],
    server: {
      port: 5001,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: 'ws://localhost:5000',
          ws: true,
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
      // Optimize build performance
      minify: 'esbuild', // Faster than terser
      target: 'es2020', // Modern target for smaller bundles
      cssMinify: 'esbuild',
      reportCompressedSize: false, // Skip gzip size reporting to save time
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Optimize chunk splitting
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-avatar'],
            utils: ['clsx', 'tailwind-merge', 'date-fns']
          }
        }
      }
    },
    // Enable build caching
    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query'],
      exclude: []
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
