import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
                if (id.includes('lucide-react')) return 'vendor-icons';
                if (id.includes('@google/genai')) return 'vendor-ai';
                return 'vendor';
              }
              if (id.includes('/components/analytics/')) return 'view-analytics';
              if (id.includes('/components/RoadmapView')) return 'view-roadmap';
              if (id.includes('/components/WorkloadView')) return 'view-resources';
              if (id.includes('/components/ProjectsLifecycleView')) return 'view-projects';
              if (id.includes('/components/SettingsModal')) return 'modal-settings';
              if (id.includes('/components/AICommandCenter') || id.includes('/components/AIModal') || id.includes('/components/VisionModal')) {
                return 'modal-ai';
              }
              return undefined;
            }
          }
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        include: ['services/__tests__/**/*.test.ts']
      }
    };
});
