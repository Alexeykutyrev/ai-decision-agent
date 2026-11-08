import { useEffect, useState } from 'react'
import { ArrowUpRight, Database, LayoutDashboard, MessageSquareText, Sprout } from 'lucide-react'
import AccessGate from './components/AccessGate'
import ArchitecturePanel from './components/ArchitecturePanel'
import ChatPanel from './components/ChatPanel'
import MonitoringPanel from './components/MonitoringPanel'
import type { MonitoringContext } from './types'
import './App.css'

type Tab = 'chat' | 'monitoring' | 'architecture'
type Connection = { loading: boolean; configured: boolean; model: string }

const navigation = [
  { id: 'chat' as const, label: 'Диалог', icon: MessageSquareText },
  { id: 'monitoring' as const, label: 'Мониторинг', icon: Database },
  { id: 'architecture' as const, label: 'Архитектура', icon: LayoutDashboard },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('chat')
  const [context, setContext] = useState<MonitoringContext | null>(null)
  const [draft, setDraft] = useState<MonitoringContext>({ crop: 'Яблоня', stage: 'Плодоношение', area: '', flowers: '', fruits: '', temperature: '', humidity: '', notes: '' })
  const [connection, setConnection] = useState<Connection>({ loading: true, configured: false, model: 'kimi-k2.6' })

  useEffect(() => {
    fetch('/api/status')
      .then(response => response.json())
      .then(data => setConnection({ loading: false, configured: Boolean(data.configured), model: data.model || 'kimi-k2.6' }))
      .catch(() => setConnection(current => ({ ...current, loading: false })))
  }, [])

  return (
    <AccessGate>
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="https://alexeykutyrev.pro/" aria-label="Alexey Kutyrev — все проекты">
            <span className="brand-mark">AK</span>
            <span className="brand-name">Alexey Kutyrev</span>
          </a>
          <div className="project-name"><Sprout size={18} /><span>ИИ-агент поддержки принятия решений</span></div>
          <a className="all-projects" href="https://alexeykutyrev.pro/">Все проекты <ArrowUpRight size={16} /></a>
        </header>
        <div className="workspace">
          <aside className="sidebar">
            <nav aria-label="Разделы проекта">
              {navigation.map(item => (
                <button className={tab === item.id ? 'nav-item active' : 'nav-item'} type="button" key={item.id} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
                  <item.icon size={19} strokeWidth={1.8} /> {item.label}
                </button>
              ))}
            </nav>
            <div className="sidebar-status">
              <span className={`status-dot ${connection.configured ? 'online' : ''}`} />
              <div><strong>{connection.loading ? 'Проверка подключения' : connection.configured ? 'Модель подключена' : 'Требуется API-ключ'}</strong><span>{connection.model}</span></div>
            </div>
          </aside>
          <main className="content">
            <div className="full-panel" hidden={tab !== 'chat'}>
              <ChatPanel context={context} onOpenContext={() => setTab('monitoring')} configured={connection.configured} />
            </div>
            {tab === 'monitoring' && <MonitoringPanel value={draft} onChange={setDraft} onApply={() => { setContext({ ...draft }); setTab('chat') }} />}
            {tab === 'architecture' && <ArchitecturePanel />}
          </main>
        </div>
      </div>
    </AccessGate>
  )
}
