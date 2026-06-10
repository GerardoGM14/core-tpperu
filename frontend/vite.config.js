import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend (NestJS) corre en :4000. En desarrollo el navegador habla
// solo con Vite (:3000) y Vite reenvía /api y /socket.io al backend.
// Esto evita problemas de upgrade de WebSocket directo navegador→:4000.
const API_TARGET = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/socket.io': { target: API_TARGET, changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: 'dist',
  },
});
