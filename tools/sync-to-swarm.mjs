import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const swarm = path.resolve(process.argv[2] || path.join(root, '..', 'Swarm'))
const built = path.join(root, 'dist')

if (!fs.existsSync(path.join(built, 'index.html'))) throw new Error('Сначала выполните npm run build')
if (!fs.existsSync(path.join(swarm, 'dist'))) throw new Error(`Не найден Swarm/dist: ${swarm}`)

for (const base of [swarm, path.join(swarm, 'dist')]) {
  fs.mkdirSync(path.join(base, 'api'), { recursive: true })
  fs.mkdirSync(path.join(base, 'server'), { recursive: true })
  fs.copyFileSync(path.join(built, 'index.html'), path.join(base, 'ai-agentsad.html'))
  fs.cpSync(path.join(built, 'assets'), path.join(base, 'assets'), { recursive: true })
  fs.copyFileSync(path.join(built, 'favicon.svg'), path.join(base, 'ai-agent-favicon.svg'))
  fs.copyFileSync(path.join(root, 'api', 'chat.ts'), path.join(base, 'api', 'chat.ts'))
  fs.copyFileSync(path.join(root, 'api', 'status.ts'), path.join(base, 'api', 'status.ts'))
  fs.copyFileSync(path.join(root, 'server', 'prompt.ts'), path.join(base, 'server', 'prompt.ts'))
}

console.log(`Готово: ${path.join(swarm, 'dist', 'ai-agentsad.html')}`)
