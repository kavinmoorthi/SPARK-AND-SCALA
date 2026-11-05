import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/missions': 'http://localhost:8080',
      '/analytics': 'http://localhost:8080',
      '/command': 'http://localhost:8080',
      '/telemetry': 'http://localhost:8080',
      '/simulator': 'http://localhost:8080',
      '/live': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
