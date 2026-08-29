import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['moneylink-1.onrender.com', '.onrender.com', 'admin.moneylink.sn']
  }
});
