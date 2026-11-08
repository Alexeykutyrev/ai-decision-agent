import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { inspectAttr } from 'kimi-plugin-inspect-react'
import chat from './api/chat'
import status from './api/status'

function localApi(): Plugin {
  return {
    name: 'local-vercel-functions',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0]
        if (pathname !== '/api/chat' && pathname !== '/api/status') return next()
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })
          const response = await (pathname === '/api/chat' ? chat : status).fetch(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          if (!response.body) return res.end()
          const reader = response.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(Buffer.from(value))
          }
          res.end()
        } catch (cause) {
          console.error(cause)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Внутренняя ошибка локального API' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.AI_GATEWAY_API_KEY) process.env.AI_GATEWAY_API_KEY = env.AI_GATEWAY_API_KEY
  else delete process.env.AI_GATEWAY_API_KEY
  if (env.MOONSHOT_API_KEY) process.env.MOONSHOT_API_KEY = env.MOONSHOT_API_KEY
  else delete process.env.MOONSHOT_API_KEY
  if (env.AI_MODEL) process.env.AI_MODEL = env.AI_MODEL
  else delete process.env.AI_MODEL
  return {
    base: './',
    plugins: [localApi(), inspectAttr(), react()],
    server: { port: 3000 },
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  }
})
