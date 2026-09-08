import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const root = import.meta.dirname;

export default defineConfig(({ mode }) => ({
  root,
  plugins: [react()],
  build: {
    outDir: resolve(root, mode === 'public' ? 'dist/public' : 'dist/client'),
    emptyOutDir: true,
  },
  server: { host: '127.0.0.1' },
}));
