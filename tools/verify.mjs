import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shots = path.join(root, '..', 'verification-ai')
fs.mkdirSync(shots, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '7100', '--strictPort'], { cwd: root, stdio: 'pipe' })
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += chunk })
server.stderr.on('data', chunk => { serverLog += chunk })
let browser

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://127.0.0.1:7100/')).ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Сервер не запустился:\n${serverLog}`)
}

try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() === 404) errors.push(`404 ${response.url()}`) })

  await page.goto('http://127.0.0.1:7100/', { waitUntil: 'networkidle' })
  await page.getByLabel('Пароль').fill('incorrect-test-value')
  await page.getByRole('button', { name: 'Открыть проект' }).click()
  await page.getByText('Неверный пароль. Попробуйте ещё раз.').waitFor()
  await page.evaluate(() => sessionStorage.setItem('new_project_access_v1', 'granted'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Что нужно проанализировать?' }).waitFor()
  await page.screenshot({ path: path.join(shots, 'desktop.png'), fullPage: true })

  await page.getByRole('button', { name: 'Мониторинг', exact: true }).click()
  await page.getByLabel('Площадь, га').fill('12.5')
  await page.getByLabel('Плодов на растении').fill('86')
  await page.getByLabel('Температура, °C').fill('21.4')
  await page.getByRole('button', { name: 'Использовать в диалоге' }).click()
  await page.getByText('Контекст: Яблоня').waitFor()

  await page.getByRole('button', { name: 'Архитектура', exact: true }).click()
  await page.getByRole('heading', { name: 'От наблюдения к обоснованному решению' }).waitFor()
  await page.getByRole('button', { name: 'Диалог', exact: true }).click()

  let requestBody = ''
  await page.route('**/api/chat', async route => {
    requestBody = route.request().postData() || ''
    await route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: '**Наблюдение:** данные приняты.\n\nДля прогноза потребуется калибровка.' })
  })
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  await page.locator('input[type=file]').setInputFiles({ name: 'leaf.png', mimeType: 'image/png', buffer: image })
  await page.locator('.attachment-preview').waitFor()
  await page.getByLabel('Вопрос ИИ-агенту').fill('Проанализируйте наблюдение')
  await page.getByRole('button', { name: 'Отправить вопрос' }).click()
  await page.getByText('Для прогноза потребуется калибровка.').waitFor()
  assert(requestBody.includes('data:image/png;base64,'))
  assert(requestBody.includes('12.5'))

  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    requests: performance.getEntriesByType('resource').length,
    bytes: performance.getEntriesByType('resource').reduce((sum, item) => sum + (item.transferSize || 0), 0),
  }))
  assert(metrics.scrollWidth <= metrics.viewport)

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
  mobile.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  mobile.on('pageerror', error => errors.push(error.message))
  await mobile.goto('http://127.0.0.1:7100/', { waitUntil: 'networkidle' })
  await mobile.evaluate(() => sessionStorage.setItem('new_project_access_v1', 'granted'))
  await mobile.reload({ waitUntil: 'networkidle' })
  await mobile.screenshot({ path: path.join(shots, 'mobile.png'), fullPage: true })
  const mobileWidth = await mobile.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  assert(mobileWidth.scrollWidth <= mobileWidth.viewport)
  await mobile.getByRole('button', { name: 'Мониторинг', exact: true }).click()
  await mobile.getByRole('heading', { name: 'Данные мониторинга' }).waitFor()

  const missingKey = await page.request.post('http://127.0.0.1:7100/api/chat', { data: { messages: [{ role: 'user', content: 'test' }] } })
  assert.equal(missingKey.status(), 503)
  assert.equal(errors.length, 0, errors.join('\n'))
  console.log(JSON.stringify({ result: 'OK', consoleErrors: errors.length, metrics, mobileWidth }, null, 2))
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
  await new Promise(resolve => server.once('exit', resolve))
}
