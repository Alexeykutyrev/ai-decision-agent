import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowUp, ImagePlus, LoaderCircle, RotateCcw, Sparkles, Square, X } from 'lucide-react'
import { sendChat } from '../lib/api'
import type { Attachment, ChatMessage, MonitoringContext } from '../types'

const suggestions = [
  'Какие данные нужны для прогноза урожайности яблони?',
  'Как интерпретировать количество цветков и завязей?',
  'Составь план анализа изображений с помощью YOLO и VLM',
]

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

function savedMessages(): ChatMessage[] {
  try {
    const value = JSON.parse(localStorage.getItem('decision_agent_chat_v1') || '[]')
    if (!Array.isArray(value)) return []
    return value.slice(-30).filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
  } catch {
    return []
  }
}

interface Props {
  context: MonitoringContext | null
  onOpenContext: () => void
  configured: boolean
}

export default function ChatPanel({ context, onOpenContext, configured }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(savedMessages)
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [busy, setBusy] = useState(false)
  const [composerError, setComposerError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('decision_agent_chat_v1', JSON.stringify(messages.slice(-30).map(({ id, role, content }) => ({ id, role, content }))))
  }, [messages])

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ block: 'nearest', behavior: busy ? 'auto' : 'smooth' })
  }, [messages, busy])

  async function submit(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (busy || (!text && !attachment)) return
    setComposerError('')
    const userMessage: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: text || 'Проанализируйте это изображение и опишите видимые признаки.',
      attachment: attachment || undefined,
    }
    const assistantId = makeId()
    const next = [...messages, userMessage]
    setMessages([...next, { id: assistantId, role: 'assistant', content: '' }])
    setInput('')
    setAttachment(null)
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller
    let answer = ''
    try {
      await sendChat({
        messages: next,
        context,
        signal: controller.signal,
        onDelta: delta => {
          answer += delta
          setMessages(current => current.map(item => item.id === assistantId ? { ...item, content: answer } : item))
        },
      })
      if (!answer.trim()) throw new Error('Модель вернула пустой ответ. Повторите запрос.')
    } catch (cause) {
      const aborted = cause instanceof DOMException && cause.name === 'AbortError'
      if (aborted) {
        setMessages(current => current.filter(item => item.id !== assistantId || Boolean(item.content)))
      } else {
        const message = cause instanceof Error ? cause.message : 'Неизвестная ошибка'
        setMessages(current => current.map(item => item.id === assistantId ? { ...item, content: message, error: true } : item))
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  function chooseImage(file?: File) {
    setComposerError('')
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setComposerError('Поддерживаются PNG, JPEG и WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setComposerError('Размер изображения не должен превышать 2 МБ.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAttachment({ name: file.name, url: String(reader.result) })
    reader.onerror = () => setComposerError('Не удалось прочитать изображение.')
    reader.readAsDataURL(file)
  }

  return (
    <section className="chat-page" aria-label="Диалог с ИИ-агентом">
      <div className="chat-toolbar">
        <div>
          <h1>Рабочий диалог</h1>
          <button className="context-chip" type="button" onClick={onOpenContext}>
            {context ? `Контекст: ${context.crop || 'наблюдение'}` : 'Добавить данные мониторинга'}
          </button>
        </div>
        <button
          className="icon-text-button"
          type="button"
          disabled={!messages.length || busy}
          onClick={() => setMessages([])}
          title="Очистить диалог"
        >
          <RotateCcw size={16} /> <span>Новый диалог</span>
        </button>
      </div>

      <div className="messages" aria-live="polite">
        {!messages.length && (
          <div className="welcome">
            <div className="welcome-icon"><Sparkles size={24} strokeWidth={1.6} /></div>
            <h2>Что нужно проанализировать?</h2>
            <p>Задайте вопрос, приложите фотографию или добавьте параметры наблюдения. Агент поможет интерпретировать данные и обозначит ограничения вывода.</p>
            <div className="suggestions">
              {suggestions.map(suggestion => (
                <button type="button" key={suggestion} onClick={() => void submit(suggestion)}>{suggestion}<ArrowUp size={16} /></button>
              ))}
            </div>
          </div>
        )}
        {messages.map(message => (
          <article className={`message ${message.role} ${message.error ? 'error' : ''}`} key={message.id}>
            <div className="message-role">{message.role === 'user' ? 'Вы' : 'ИИ-агент'}</div>
            {message.attachment && <img className="message-image" src={message.attachment.url} alt={`Приложение: ${message.attachment.name}`} />}
            <div className="message-content">
              {message.role === 'assistant' ? (
                message.content ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: props => <a {...props} target="_blank" rel="noreferrer" /> }}>{message.content}</ReactMarkdown> : <span className="thinking"><LoaderCircle size={17} /> Анализирую данные…</span>
              ) : message.content}
            </div>
          </article>
        ))}
        <div ref={endRef} />
      </div>

      <div className="composer-wrap">
        {!configured && <div className="connection-note">Подключение модели настраивается. Интерфейс доступен, а отправка станет активной после добавления API-ключа.</div>}
        {attachment && (
          <div className="attachment-preview">
            <img src={attachment.url} alt="Выбранное изображение" />
            <span>{attachment.name}</span>
            <button type="button" onClick={() => setAttachment(null)} aria-label="Удалить изображение"><X size={16} /></button>
          </div>
        )}
        {composerError && <div className="composer-error" role="alert">{composerError}</div>}
        <div className="composer">
          <textarea
            aria-label="Вопрос ИИ-агенту"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={keyDown}
            placeholder="Опишите наблюдение или задайте вопрос…"
            rows={1}
            maxLength={8000}
            disabled={busy}
          />
          <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { chooseImage(event.target.files?.[0]); event.target.value = '' }} />
          <button className="attach-button" type="button" onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Приложить изображение" title="Приложить изображение"><ImagePlus size={20} /></button>
          {busy ? (
            <button className="send-button stop" type="button" onClick={() => abortRef.current?.abort()} aria-label="Остановить ответ" title="Остановить"><Square size={16} fill="currentColor" /></button>
          ) : (
            <button className="send-button" type="button" onClick={() => void submit()} disabled={!input.trim() && !attachment} aria-label="Отправить вопрос" title="Отправить"><ArrowUp size={20} /></button>
          )}
        </div>
        <p className="composer-hint">Enter — отправить · Shift + Enter — новая строка. Выводы ИИ требуют проверки специалистом.</p>
      </div>
    </section>
  )
}
