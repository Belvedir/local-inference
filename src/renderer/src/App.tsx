import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ModelInfo,
  PullProgress,
  UiMessage,
  deleteModel,
  formatBytes,
  listModels,
  pullModel,
  streamChat
} from './ollama'
import { listModels as oaiListModels, streamChat as oaiStreamChat } from './openai'
import { ENGINES, ENGINE_IDS, EngineId } from './engines'
import {
  Conversation,
  loadConversations,
  loadEngine,
  loadEngineModels,
  saveConversations,
  saveEngine,
  saveEngineModels
} from './storage'
import { DeviceInfo } from './models'
import ModelPicker from './components/ModelPicker'
import MessageView from './components/MessageView'
import belvedirMark from './assets/belvedir-mark.svg'

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <div
      className={`brand${onClick ? ' clickable' : ''}`}
      onClick={onClick}
      title={onClick ? 'Back to models' : undefined}
    >
      <img src={belvedirMark} alt="" />
      <span>Belvedir</span>
    </div>
  )
}

const FOOTER_LINKS = [
  { label: 'Docs', url: 'https://docs.belvedir.ai' },
  { label: 'Platform', url: 'https://platform.belvedir.ai/platform' },
  { label: 'Contact support', url: 'mailto:founders@fractalresearch.ai' }
]

function FooterLinks() {
  return (
    <nav className="footer-links">
      {FOOTER_LINKS.map((l) => (
        <a key={l.label} onClick={() => window.api.openExternal(l.url)}>
          {l.label}
        </a>
      ))}
    </nav>
  )
}

type AppStatus = 'checking' | 'ready' | 'not-installed' | 'failed-to-start' | 'needs-model'

const STARTERS = [
  'Explain how running an AI model locally works',
  'Write a haiku about being offline',
  'Help me plan a weekend coding project'
]

function EngineSelect({
  engine,
  onChange,
  disabled
}: {
  engine: EngineId
  onChange: (e: EngineId) => void
  disabled?: boolean
}) {
  return (
    <select value={engine} onChange={(e) => onChange(e.target.value as EngineId)} disabled={disabled}>
      {ENGINE_IDS.map((id) => (
        <option key={id} value={id}>
          {ENGINES[id].label}
        </option>
      ))}
    </select>
  )
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>('checking')
  const [engine, setEngine] = useState<EngineId>(() => loadEngine())
  const [engineModels, setEngineModels] = useState(() => loadEngineModels())
  const [baseUrl, setBaseUrl] = useState('')
  const [device, setDevice] = useState<DeviceInfo>({
    totalMemGB: 16,
    arch: '',
    platform: '',
    cpuModel: ''
  })
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [convs, setConvs] = useState<Conversation[]>(() => loadConversations())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [pulling, setPulling] = useState<{ tag: string; progress: PullProgress } | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  // The app always opens on the model picker; chat is only reachable after a pick.
  const [picked, setPicked] = useState(false)
  const [pullName, setPullName] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const engineDef = ENGINES[engine]
  const active = convs.find((c) => c.id === activeId) ?? null
  const messages = active?.messages ?? []

  useEffect(() => saveConversations(convs), [convs])

  const refreshModels = useCallback(async (eng: EngineId, base: string) => {
    const list = eng === 'ollama' ? await listModels() : await oaiListModels(base)
    setModels(list)
    setSelectedModel((cur) => (cur && list.some((m) => m.name === cur) ? cur : (list[0]?.name ?? '')))
    return list
  }, [])

  const connect = useCallback(async () => {
    setStatus('checking')
    setError('')
    setModels([])
    try {
      const info = await window.api.systemInfo()
      setDevice(info)
      const result = await window.api.ensureEngine(engine, engineModels[engine])
      setBaseUrl(result.baseUrl)
      if (result.status === 'running' || result.status === 'started') {
        await refreshModels(engine, result.baseUrl)
        setStatus('ready')
      } else {
        setStatus(result.status)
        if (result.error) setError(result.error)
      }
    } catch (e) {
      setStatus('failed-to-start')
      setError(String(e))
    }
  }, [engine, engineModels, refreshModels])

  useEffect(() => {
    connect()
  }, [connect])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [convs, streaming])

  function switchEngine(id: EngineId) {
    if (id === engine) return
    abortRef.current?.abort()
    saveEngine(id)
    setEngine(id)
    setShowPicker(false)
    setPullName('')
  }

  // For llama.cpp / vLLM: remember which model to serve, which restarts the
  // server with it (via connect re-running).
  function loadEngineModel(model: string) {
    if (!model) return
    const next = { ...engineModels, [engine]: model }
    saveEngineModels(next)
    setEngineModels(next)
    setShowPicker(false)
    setPullName('')
  }

  function updateConv(id: string, update: (c: Conversation) => Conversation) {
    setConvs((cur) => cur.map((c) => (c.id === id ? update(c) : c)))
  }

  async function generate(convId: string, history: UiMessage[], model: string) {
    updateConv(convId, (c) => ({
      ...c,
      messages: [...history, { role: 'assistant', content: '' }],
      updatedAt: Date.now()
    }))
    setStreaming(true)
    setError('')
    const controller = new AbortController()
    abortRef.current = controller
    const onStats = (stats: { tokensPerSec: number; tokens: number }) => {
      updateConv(convId, (c) => {
        const msgs = [...c.messages]
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], stats }
        return { ...c, messages: msgs }
      })
    }
    const stream =
      engine === 'ollama'
        ? streamChat(model, history, controller.signal, onStats)
        : oaiStreamChat(baseUrl, model, history, controller.signal, onStats)
    try {
      for await (const token of stream) {
        updateConv(convId, (c) => {
          const msgs = [...c.messages]
          const last = msgs[msgs.length - 1]
          msgs[msgs.length - 1] = { ...last, content: last.content + token }
          return { ...c, messages: msgs, updatedAt: Date.now() }
        })
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(String(e))
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (!text || !selectedModel || streaming) return
    setInput('')
    let convId = activeId
    let history: UiMessage[]
    if (!convId || !convs.some((c) => c.id === convId)) {
      convId = crypto.randomUUID()
      history = [{ role: 'user', content: text }]
      const conv: Conversation = {
        id: convId,
        title: text.length > 44 ? text.slice(0, 44) + '…' : text,
        model: selectedModel,
        messages: history,
        updatedAt: Date.now()
      }
      setConvs((cur) => [conv, ...cur])
      setActiveId(convId)
    } else {
      history = [...messages, { role: 'user', content: text }]
    }
    await generate(convId, history, selectedModel)
  }

  async function regenerate() {
    if (!active || streaming) return
    const history = [...active.messages]
    while (history.length && history[history.length - 1].role === 'assistant') history.pop()
    if (!history.length) return
    await generate(active.id, history, selectedModel)
  }

  async function doPull(tag: string) {
    if (!tag || pulling) return
    setError('')
    setPulling({ tag, progress: { status: 'starting' } })
    const controller = new AbortController()
    try {
      for await (const progress of pullModel(tag, controller.signal)) {
        setPulling({ tag, progress })
      }
      const list = await refreshModels(engine, baseUrl)
      const pulled = list.find((m) => m.name.startsWith(tag))
      if (pulled) {
        setSelectedModel(pulled.name)
        setPicked(true)
      }
      setPullName('')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(String(e))
    } finally {
      setPulling(null)
    }
  }

  async function removeModel(name: string) {
    if (!confirm(`Delete ${name} from disk?`)) return
    try {
      await deleteModel(name)
      await refreshModels(engine, baseUrl)
    } catch (e) {
      setError(String(e))
    }
  }

  if (status === 'checking') {
    return (
      <div className="center-screen">
        <div className="checking-note">
          <div>Starting {engineDef.label}…</div>
          {engine !== 'ollama' && engineModels[engine] && (
            <div className="muted">
              Loading {engineModels[engine]}. The first run downloads the model and can take a
              while.
            </div>
          )}
        </div>
      </div>
    )
  }

  if (status === 'not-installed' || status === 'failed-to-start') {
    return (
      <div className="center-screen">
        <div className="setup-card">
          <h2>Couldn&apos;t start {engineDef.label}</h2>
          <p>{engineDef.installHint}</p>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button onClick={() => window.api.openExternal(engineDef.installUrl)}>
              Get {engineDef.label}
            </button>
            <button onClick={connect}>Retry</button>
          </div>
          <label className="section-label">Or use a different engine</label>
          <EngineSelect engine={engine} onChange={switchEngine} />
        </div>
      </div>
    )
  }

  // llama.cpp / vLLM serve one model chosen at launch, so ask for it once.
  if (status === 'needs-model') {
    return (
      <div className="center-screen">
        <div className="setup-card">
          <h2>Choose a model for {engineDef.label}</h2>
          <p>{engineDef.modelHint}</p>
          <div className="row">
            <input
              placeholder={engineDef.modelPlaceholder}
              value={pullName}
              onChange={(e) => setPullName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEngineModel(pullName.trim())}
              autoFocus
            />
            <button onClick={() => loadEngineModel(pullName.trim())} disabled={!pullName.trim()}>
              Load
            </button>
          </div>
          <div className="suggestions">
            {engineDef.suggestions?.map((s) => (
              <button key={s} className="ghost" onClick={() => loadEngineModel(s)}>
                {s}
              </button>
            ))}
          </div>
          <label className="section-label">Or use a different engine</label>
          <EngineSelect engine={engine} onChange={switchEngine} />
        </div>
      </div>
    )
  }

  // Launch page: pick a model before entering chat. Installed models open
  // with one click; new ones download first.
  if (engine === 'ollama' && (!picked || models.length === 0)) {
    return (
      <div className="onboarding">
        <Brand />
        <h1>{models.length === 0 ? 'Pick a model to get started' : 'Pick a model'}</h1>
        <p className="muted onboarding-intro">
          A local inference provider by Belvedir: open models download once, then run entirely on
          your own hardware. No API keys, no per-token costs, and your prompts and conversations
          never leave this machine. Pick a model that fits your device to get started. You can
          switch or add more anytime.
        </p>
        <ModelPicker
          device={device}
          installed={models.map((m) => m.name)}
          pulling={pulling}
          onPull={doPull}
          onSelect={(name) => {
            setSelectedModel(name)
            setPicked(true)
          }}
        />
        {error && <div className="error banner">{error}</div>}
        <FooterLinks />
      </div>
    )
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <Brand
          onClick={() => {
            setActiveId(null)
            setPicked(false)
          }}
        />

        <button className="new-chat" onClick={() => setActiveId(null)}>
          <span className="new-chat-plus">+</span> New chat
        </button>

        <label className="section-label">Recent</label>
        {convs.length === 0 ? (
          <p className="muted recent-empty">No saved chats yet. They save automatically as you talk.</p>
        ) : (
          <ul className="conv-list">
            {convs.map((c) => (
              <li
                key={c.id}
                className={c.id === activeId ? 'active' : ''}
                onClick={() => setActiveId(c.id)}
              >
                <span className="conv-title">{c.title}</span>
                <button
                  className="ghost tiny"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConvs((cur) => cur.filter((x) => x.id !== c.id))
                    if (activeId === c.id) setActiveId(null)
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="section-label">Engine</label>
        <EngineSelect engine={engine} onChange={switchEngine} disabled={streaming || !!pulling} />

        <label className="section-label">Model</label>
        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.size > 0 ? `${m.name} (${formatBytes(m.size)})` : m.name}
            </option>
          ))}
        </select>

        <button className="ghost" onClick={() => setShowPicker(!showPicker)}>
          {showPicker ? 'Hide models' : engineDef.managedModels ? 'Get more models' : 'Change model'}
        </button>

        {showPicker && engineDef.managedModels && (
          <div className="sidebar-picker">
            <ModelPicker
              device={device}
              installed={models.map((m) => m.name)}
              pulling={pulling}
              onPull={doPull}
              compact
            />
            <div className="pull-row">
              <input
                placeholder="Any Ollama model tag…"
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doPull(pullName.trim())}
                disabled={!!pulling}
              />
              <button onClick={() => doPull(pullName.trim())} disabled={!!pulling || !pullName.trim()}>
                Pull
              </button>
            </div>
            <ul className="model-list">
              {models.map((m) => (
                <li key={m.name}>
                  <span>{m.name}</span>
                  <button className="ghost tiny" onClick={() => removeModel(m.name)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showPicker && !engineDef.managedModels && (
          <div className="sidebar-picker">
            <p className="muted">
              {engineDef.label} serves one model at a time. Loading a new one restarts the
              server.
            </p>
            <div className="pull-row">
              <input
                placeholder={engineDef.modelPlaceholder}
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadEngineModel(pullName.trim())}
                disabled={streaming}
              />
              <button
                onClick={() => loadEngineModel(pullName.trim())}
                disabled={streaming || !pullName.trim()}
              >
                Load
              </button>
            </div>
            <div className="suggestions">
              {engineDef.suggestions?.map((s) => (
                <button key={s} className="ghost tiny" onClick={() => loadEngineModel(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <FooterLinks />
      </aside>

      <main className="chat">
        <header className="chat-head">
          <div className="chat-head-title">{active?.title ?? 'New chat'}</div>
          <div className="chat-head-meta">
            <span className="model-pill">{selectedModel}</span>
            <span className="local-pill">
              <span className="local-dot" />
              Local · {engineDef.label}
            </span>
          </div>
        </header>

        <div className="messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="empty-hint">
              <div className="empty-brand">
                <img src={belvedirMark} alt="" />
                <span>Belvedir</span>
              </div>
              <p className="muted">
                What to do first? Ask anything. {selectedModel} runs on this machine, and nothing
                leaves your device.
              </p>
              <div className="starters">
                {STARTERS.map((s) => (
                  <button key={s} className="starter" onClick={() => send(s)}>
                    {s}
                    <span className="starter-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <MessageView
              key={i}
              message={m}
              modelName={active?.model ?? selectedModel}
              isLast={i === messages.length - 1}
              streaming={streaming}
              onRegenerate={regenerate}
            />
          ))}
        </div>

        {error && <div className="error banner">{error}</div>}

        <div className="composer">
          <div className="composer-box">
            <textarea
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={2}
              autoFocus
            />
            <div className="composer-bar">
              {streaming ? (
                <button
                  className="send-btn"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="Stop"
                >
                  ◼
                </button>
              ) : (
                <button
                  className="send-btn"
                  onClick={() => send()}
                  disabled={!input.trim() || !selectedModel}
                  aria-label="Send"
                >
                  ↑
                </button>
              )}
            </div>
          </div>
          <p className="composer-note">Local models can make mistakes. Verify important outputs.</p>
        </div>
      </main>
    </div>
  )
}
