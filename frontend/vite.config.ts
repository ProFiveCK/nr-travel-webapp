import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: ['travel.naurufinance.info', '192.168.1.26', 'localhost'],
  },
});
