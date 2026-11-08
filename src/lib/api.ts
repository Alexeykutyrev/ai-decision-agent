import type { ChatMessage, MonitoringContext } from '../types'

interface SendOptions {
  messages: ChatMessage[]
  context: MonitoringContext | null
  signal: AbortSignal
  onDelta: (text: string) => void
}

export async function sendChat({ messages, context, signal, onDelta }: SendOptions) {
  const payload = messages.slice(-12).map((message, index, all) => ({
    role: message.role,
    content: message.content,
    image: index === all.length - 1 ? message.attachment?.url : undefined,
  }))

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: payload, context }),
    signal,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(data?.error || 'Не удалось получить ответ. Попробуйте ещё раз.')
  }
  if (!response.body) throw new Error('Браузер не поддерживает потоковый ответ.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onDelta(decoder.decode(value, { stream: true }))
  }
  onDelta(decoder.decode())
}
