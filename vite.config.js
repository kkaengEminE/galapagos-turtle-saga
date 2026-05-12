import { defineConfig } from 'vite';

export default defineConfig({
  base: '/galapagos-turtle-saga/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
