import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Babel plugin for styled-components is not used here; we rely on the runtime
// `displayName`-via-component-naming approach plus production minification.
// If desired, add `babel-plugin-styled-components` to enable SSR-friendly class
// names and component display names automatically.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          charts: ['recharts'],
        },
      },
    },
  },
});
