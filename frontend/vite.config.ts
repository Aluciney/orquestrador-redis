import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O backend roda em :4000. Em dev, fazemos proxy de /api e /admin para ele,
// assim o iframe do Bull Board e as chamadas REST funcionam sob a mesma origem.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/admin': { target: BACKEND, changeOrigin: true },
    },
  },
});
