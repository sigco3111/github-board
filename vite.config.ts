import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          // GitHub API 프록시 설정
          '/api/github': {
            target: 'https://api.github.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/github/, ''),
            headers: {
              'User-Agent': 'GitHub-Dashboard-App/1.0',
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        }
      }
    };
});
