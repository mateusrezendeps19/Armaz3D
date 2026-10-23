import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite que o Electron carregue o build via file://
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
});
