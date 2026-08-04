import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/frontend/',
  plugins: [react(), tailwindcss()],
  // Public short paths match the production gateway. Vite rewrites them to the
  // internal service prefixes used by local `kubectl port-forward` targets
  // (see k8s-dev/README.md). Keep /api/v2/report for heatmap media URLs that
  // report-read still emits with the internal prefix.
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '/api/v2/auth'),
      },
      '/upload/video': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upload\/video/, '/api/v1/video'),
      },
      '/upload/audio': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upload\/audio/, '/api/v1/audio'),
      },
      '/reports': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/reports/, '/api/v2/report'),
      },
      '/api/v2/report': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
      // Optional: kubectl port-forward -n dev svc/usage-tracking-service 8085:80
      '/usage': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/usage/, '/api/v1/usage'),
      },
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react'],
          lib: ['libphonenumber-js']
        }
      }
    }
  }
})
