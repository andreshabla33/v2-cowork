import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const openrouterKey = env.OPENROUTER_API_KEY || env.OPEN_AI || process.env.OPENROUTER_API_KEY || process.env.OPEN_AI || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(openrouterKey),
        'process.env.OPEN_AI': JSON.stringify(env.OPEN_AI || process.env.OPEN_AI || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
