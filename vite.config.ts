import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Priorizar OPEN_AI (nueva key) sobre OPENROUTER_API_KEY (puede estar expirada)
    const aiKey = process.env.OPEN_AI || env.OPEN_AI || process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || '';
    console.log('[Vite Build] AI Key found:', aiKey ? `${aiKey.substring(0, 12)}...` : 'NONE');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(aiKey),
        'process.env.OPEN_AI': JSON.stringify(aiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
