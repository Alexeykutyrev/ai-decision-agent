import { SYSTEM_PROMPT } from '../server/prompt'

declare const process: { env: Record<string, string | undefined> }

type IncomingMessage = {
  role?: string
  content?: string
  image?: string
}

const MAX_TEXT = 12_000
const MAX_IMAGE = 2_900_000

function error(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function textResponse(upstream: Response) {
  if (!upstream.body) throw new Error('Пустой поток ответа модели')
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const raw of lines) {
          const line = raw.trim()
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue
          try {
            const event = JSON.parse(data)
            const content = event.choices?.[0]?.delta?.content
            if (typeof content === 'string' && content) controller.enqueue(encoder.encode(content))
          } catch {
            // Неполная JSON-строка останется в буфере следующего цикла.
          }
        }
      }
    },
    cancel() {
      return reader.cancel()
    },
  })
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return error('Метод не поддерживается', 405)
    const gatewayKey = process.env.AI_GATEWAY_API_KEY
    const apiKey = gatewayKey || process.env.MOONSHOT_API_KEY
    if (!apiKey) return error('Модель ещё не подключена: добавьте AI_GATEWAY_API_KEY в настройках окружения.', 503)

    let body: { messages?: IncomingMessage[]; context?: Record<string, unknown> | null }
    try {
      body = await request.json() as typeof body
    } catch {
      return error('Некорректный запрос', 400)
    }
    if (!Array.isArray(body.messages) || !body.messages.length) return error('Введите вопрос', 400)

    let messages
    try {
      messages = body.messages.slice(-12).map(message => {
        const text = String(message.content || '').slice(0, MAX_TEXT)
        if (message.image && message.role === 'user') {
          if (!/^data:image\/(png|jpeg|webp);base64,/.test(message.image) || message.image.length > MAX_IMAGE) {
            throw new Error('IMAGE_VALIDATION')
          }
          return {
            role: 'user',
            content: [
              { type: 'text', text: text || 'Проанализируйте изображение.' },
              { type: 'image_url', image_url: { url: message.image } },
            ],
          }
        }
        return { role: message.role === 'assistant' ? 'assistant' : 'user', content: text }
      })
    } catch {
      return error('Некорректное или слишком большое изображение', 400)
    }

    let system = SYSTEM_PROMPT
    if (body.context && typeof body.context === 'object') {
      system += `\n\nТекущий контекст мониторинга, переданный пользователем:\n${JSON.stringify(body.context).slice(0, 8000)}`
    }

    let upstream: Response
    try {
      upstream = await fetch(gatewayKey ? 'https://ai-gateway.vercel.sh/v1/chat/completions' : 'https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || (gatewayKey ? 'moonshotai/kimi-k2.6' : 'kimi-k2.6'),
          messages: [{ role: 'system', content: system }, ...messages],
          stream: true,
          max_tokens: 4096,
          ...(gatewayKey ? {} : { thinking: { type: 'disabled' } }),
        }),
        signal: request.signal,
      })
    } catch (cause) {
      if ((cause as Error).message === 'IMAGE_VALIDATION') return error('Некорректное изображение', 400)
      return error('Сервис модели временно недоступен', 502)
    }

    if (!upstream.ok) {
      const detail = await upstream.text()
      console.error('Model API error', upstream.status, detail.slice(0, 1000))
      if (upstream.status === 401) return error('API-ключ отклонён. Проверьте настройки Vercel.', 502)
      if (upstream.status === 429) return error('Превышен лимит запросов. Повторите попытку позже.', 429)
      return error('Модель не смогла обработать запрос', 502)
    }

    return new Response(textResponse(upstream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  },
}
