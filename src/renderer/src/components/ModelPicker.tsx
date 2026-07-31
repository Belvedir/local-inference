import { useMemo, useState } from 'react'
import {
  CATEGORY_LABEL,
  CURATED,
  Category,
  CuratedModel,
  DeviceInfo,
  Fit,
  VENDORS,
  deviceLabel,
  fitFor,
  recommendedTag
} from '../models'
import type { PullProgress } from '../ollama'

const SECTIONS: { fit: Fit; label: string }[] = [
  { fit: 'great', label: 'Runs well on this device' },
  { fit: 'slow', label: 'Tight fit, will be slow' },
  { fit: 'no', label: 'Needs more memory than this device has' }
]

const FILTERS: (Category | 'all')[] = ['all', 'general', 'coding', 'reasoning', 'vision']

interface Props {
  device: DeviceInfo
  installed: string[]
  pulling: { tag: string; progress: PullProgress } | null
  onPull: (tag: string) => void
  onSelect?: (name: string) => void
  compact?: boolean
  /** llama.cpp mode: every card is directly runnable (the engine downloads
   * the GGUF on first launch), so there's no installed/pull state here. */
  selectAll?: boolean
}

export default function ModelPicker({
  device,
  installed,
  pulling,
  onPull,
  onSelect,
  compact,
  selectAll
}: Props) {
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [query, setQuery] = useState('')
  const recommended = recommendedTag(device.totalMemGB)

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (m: CuratedModel) =>
      !q ||
      [m.title, m.tag, m.params, VENDORS[m.vendor].label, CATEGORY_LABEL[m.category], m.blurb]
        .join(' ')
        .toLowerCase()
        .includes(q)
    const visible = CURATED.filter((m) => (filter === 'all' || m.category === filter) && matches(m))
    return SECTIONS.map((s) => ({
      ...s,
      models: visible.filter((m) => fitFor(m, device.totalMemGB) === s.fit)
    })).filter((s) => s.models.length > 0)
  }, [filter, query, device.totalMemGB])

  const providerCount = new Set(CURATED.map((m) => m.vendor)).size
  const runnableCount = CURATED.filter((m) => fitFor(m, device.totalMemGB) !== 'no').length

  function renderCard(m: CuratedModel, fit: Fit) {
    const installedName = installed.find((name) => name.startsWith(m.tag))
    const isInstalled = installedName !== undefined
    const isPulling = pulling?.tag === m.tag
    const pct =
      isPulling && pulling.progress.total && pulling.progress.completed
        ? Math.round((pulling.progress.completed / pulling.progress.total) * 100)
        : null
    return (
      <div key={m.tag} className={`card fit-${fit}${compact ? ' compact' : ''}`}>
        <div className="card-head">
          <span className="card-logo">
            <img src={VENDORS[m.vendor].logo} alt={VENDORS[m.vendor].label} />
          </span>
          <span className="card-title">
            {m.title} <span className="card-params">{m.params}</span>
          </span>
          {m.tag === recommended ? (
            <span className="rec-badge">Recommended</span>
          ) : (
            <span className="cat-badge">{CATEGORY_LABEL[m.category]}</span>
          )}
        </div>
        {!compact && <div className="card-blurb">{m.blurb}</div>}
        <div className="card-foot">
          <span className="muted">
            {m.downloadGB} GB download · ~{m.ramGB} GB memory
          </span>
          {selectAll ? (
            fit === 'no' ? (
              <span className="toobig-badge">Too big</span>
            ) : (
              <button onClick={() => onSelect?.(m.tag)}>Run</button>
            )
          ) : isInstalled ? (
            onSelect ? (
              <span className="foot-actions">
                <span className="installed-badge">Installed</span>
                <button onClick={() => onSelect(installedName)}>Use</button>
              </span>
            ) : (
              <span className="installed-badge">Installed</span>
            )
          ) : isPulling ? (
            <span className="muted">{pct !== null ? `${pct}%` : pulling.progress.status}</span>
          ) : fit === 'no' ? (
            <span className="toobig-badge">Too big</span>
          ) : (
            <button onClick={() => onPull(m.tag)} disabled={pulling !== null}>
              Download
            </button>
          )}
        </div>
        {isPulling && pct !== null && (
          <div className="bar">
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`picker${compact ? ' compact' : ''}`}>
      {compact ? (
        <div className="device-note">
          <span className="device-chip">{deviceLabel(device)}</span>
          <span className="muted">{device.totalMemGB} GB memory</span>
        </div>
      ) : (
        <div className="stats-row">
          <span className="stat">
            <b>{CURATED.length}</b> models
          </span>
          <span className="stat">
            <b>{providerCount}</b> providers
          </span>
          <span className="stat">
            <b>{runnableCount}</b> run on this device
          </span>
          <span className="stats-spacer" />
          <span className="device-chip">
            {deviceLabel(device)} · {device.totalMemGB} GB
          </span>
        </div>
      )}

      <div className="picker-controls">
        <input
          type="search"
          className="picker-search"
          placeholder="Search models…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : CATEGORY_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {sections.length === 0 && (
        <p className="muted">No models match “{query.trim()}”.</p>
      )}

      {sections.map((s) => (
        <section key={s.fit} className="picker-section">
          <h3 className={`section-head fit-${s.fit}`}>{s.label}</h3>
          <div className="cards">{s.models.map((m) => renderCard(m, s.fit))}</div>
        </section>
      ))}
    </div>
  )
}
