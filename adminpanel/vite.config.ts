import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: mode === 'production' ? '/' : '/adminpanel/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: mode === 'production'
            ? 'https://tradewithgrow.com'
            : (env.VITE_API_BASE_URL || 'http://localhost:3001'),
          changeOrigin: true,
          secure: false,
        },
      },
      // In local dev, we might visit /settings directly, but Vite dev server 
      // is at root. We can use a rewrite to handle /adminpanel prefix in dev.
      // But actually, it's better to just use the basename in Router.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
