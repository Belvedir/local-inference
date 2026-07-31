import { useMemo, useState } from 'react'
import {
  CATEGORY_LABEL,
  CURATED,
  Category,
  CuratedModel,
  DeviceInfo,
  Fit,
  deviceLabel,
  fitFor,
  recommendedTag
} from '../models'
import type { PullProgress } from '../ollama'

const SECTIONS: { fit: Fit; label: string }[] = [
  { fit: 'great', label: 'Runs well on this device' },
  { fit: 'slow', label: 'Tight fit — will be slow' },
  { fit: 'no', label: 'Needs more memory than this device has' }
]

const FILTERS: (Category | 'all')[] = ['all', 'general', 'coding', 'reasoning', 'vision']

interface Props {
  device: DeviceInfo
  installed: string[]
  pulling: { tag: string; progress: PullProgress } | null
  onPull: (tag: string) => void
  compact?: boolean
}

export default function ModelPicker({ device, installed, pulling, onPull, compact }: Props) {
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const recommended = recommendedTag(device.totalMemGB)

  const sections = useMemo(() => {
    const visible = CURATED.filter((m) => filter === 'all' || m.category === filter)
    return SECTIONS.map((s) => ({
      ...s,
      models: visible.filter((m) => fitFor(m, device.totalMemGB) === s.fit)
    })).filter((s) => s.models.length > 0)
  }, [filter, device.totalMemGB])

  function renderCard(m: CuratedModel, fit: Fit) {
    const isInstalled = installed.some((name) => name.startsWith(m.tag))
    const isPulling = pulling?.tag === m.tag
    const pct =
      isPulling && pulling.progress.total && pulling.progress.completed
        ? Math.round((pulling.progress.completed / pulling.progress.total) * 100)
        : null
    return (
      <div key={m.tag} className={`card fit-${fit}${compact ? ' compact' : ''}`}>
        <div className="card-head">
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
            {m.downloadGB} GB download · needs ~{m.ramGB} GB memory
          </span>
          {isInstalled ? (
            <span className="installed-badge">Installed</span>
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
    <div className="picker">
      <div className="device-note">
        <span className="device-chip">{deviceLabel(device)}</span>
        <span className="muted">
          {device.totalMemGB} GB memory — models needing up to ~
          {Math.floor(device.totalMemGB * 0.75)} GB run well
        </span>
      </div>

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

      {sections.map((s) => (
        <section key={s.fit} className="picker-section">
          <h3 className={`section-head fit-${s.fit}`}>{s.label}</h3>
          <div className="cards">{s.models.map((m) => renderCard(m, s.fit))}</div>
        </section>
      ))}
    </div>
  )
}
