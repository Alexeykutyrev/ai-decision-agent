import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'

const ACCESS_HASH = '9bde56ede7d09ad1fac295b08a1d4ddab90c1e0c51df220b07e8d01f9a8f1cc5'
const STORAGE_KEY = 'new_project_access_v1'

export default function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'granted')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setChecking(true)
    setError('')
    try {
      const bytes = new TextEncoder().encode(password)
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
      if (hash === ACCESS_HASH) {
        sessionStorage.setItem(STORAGE_KEY, 'granted')
        setUnlocked(true)
      } else {
        setError('Неверный пароль. Попробуйте ещё раз.')
        setPassword('')
      }
    } catch {
      setError('Не удалось проверить пароль. Обновите страницу.')
    } finally {
      setChecking(false)
    }
  }

  if (unlocked) return children

  return (
    <main className="access-screen">
      <form className="access-card" onSubmit={submit}>
        <a className="back-link" href="https://alexeykutyrev.pro/"><ArrowLeft size={17} /> Все проекты</a>
        <div className="access-mark"><LockKeyhole size={22} /></div>
        <p className="access-kicker">Исследовательский проект</p>
        <h1>ИИ-агент поддержки принятия решений</h1>
        <p className="access-copy">Для доступа к рабочей области введите пароль проекта.</p>
        <label htmlFor="project-password">Пароль</label>
        <input
          id="project-password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
        <div className="access-error" role="alert" aria-live="polite">{error}</div>
        <button className="primary-button" type="submit" disabled={checking}>
          {checking ? 'Проверяем…' : 'Открыть проект'} <ArrowRight size={18} />
        </button>
      </form>
    </main>
  )
}
