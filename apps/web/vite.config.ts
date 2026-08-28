import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Bundlea @crm/shared directamente desde su fuente TS en vez del dist/
      // CJS del workspace: Rollup no resuelve bien los named exports a través
      // de la cadena de __exportStar de ese CJS (ver notas del scaffold).
      '@crm/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
