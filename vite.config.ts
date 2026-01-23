import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Helper to parse JSON body since Vite middleware doesn't do it automatically
const parseBody = (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
};

const apiMiddleware = () => {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          const apiPath = req.url.split('?')[0]; // simple path matching
          const fileName = apiPath.replace('/api/', '') + '.js';
          const filePath = path.join(process.cwd(), 'api', fileName);

          if (fs.existsSync(filePath)) {
            try {
              // Parse body for POST requests
              if (req.method === 'POST') {
                (req as any).body = await parseBody(req);
              }

              // Mock Express methods
              (res as any).status = (statusCode) => {
                res.statusCode = statusCode;
                return res;
              };
              (res as any).json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return res;
              };

              // Load env vars if needed (process.env is usually populated by Vite in this context)

              // Import and run handler
              // Dynamic import cache busting for dev experience
              const handlerModule = await import(`file://${filePath}?t=${Date.now()}`);
              await handlerModule.default(req, res);
            } catch (error) {
              console.error(`API Error ${apiPath}:`, error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
            return;
          }
        }
        next();
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Expose env variables to process.env for API handlers
  process.env = { ...process.env, ...env };

  return {
    plugins: [react(), apiMiddleware()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
