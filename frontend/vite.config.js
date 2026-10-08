import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
    compression({ algorithm: 'gzip', ext: '.gz' }),
  ],
  server: {
    historyApiFallback: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      react: path.resolve(__dirname, 'node_modules/react'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('react-helmet-async') || id.includes('react-side-effect') || id.includes('invariant')) return 'vendor-seo';
            if (id.includes('axios')) return 'vendor-axios';
            if (id.includes('browser-image-compression')) return 'vendor-imgcomp';
          }
          if (
            id.includes('/components/AdminPanel') ||
            id.includes('/components/LoanOrigination') ||
            id.includes('/components/LoanResearch') ||
            id.includes('/components/PermissionMatrix') ||
            id.includes('/components/SafetyNoticesAdmin') ||
            id.includes('/components/HeroSliderSettings') ||
            id.includes('/components/LoanApplicationDetail') ||
            id.includes('/components/LoanExposureMonitor')
          ) {
            return 'admin-bundle';
          }
        },
      },
    },
  },
})
