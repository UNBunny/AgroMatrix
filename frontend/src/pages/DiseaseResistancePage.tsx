import { useState, useEffect, useMemo } from 'react'
import { diseaseService, diseaseResistanceService } from '../services/diseaseService'
import { cropVarietyService } from '../services/cropService'
import { Disease, DiseaseResistance, DiseaseResistanceRequest, ResistanceLevel } from '../types/DiseaseTypes'
import { CropVariety } from '../types/CropTypes'
import { Plus, Edit2, Trash2, X, Save, Shield, Search } from 'lucide-react'

const LEVEL_CONFIG: Record<ResistanceLevel, { label: string; short: string; color: string; bg: string; bar: number }> = {
  [ResistanceLevel.SUSCEPTIBLE]: { label: 'Восприимчивый', short: '0–20%', color: '#e74c3c', bg: '#fdeaea', bar: 10 },
  [ResistanceLevel.LOW]:         { label: 'Низкая',        short: '21–40%', color: '#e67e22', bg: '#fff3e0', bar: 30 },
  [ResistanceLevel.MEDIUM]:      { label: 'Средняя',       short: '41–60%', color: '#f1c40f', bg: '#fef9e7', bar: 50 },
  [ResistanceLevel.HIGH]:        { label: 'Высокая',       short: '61–80%', color: '#27ae60', bg: '#e8f8f0', bar: 70 },
  [ResistanceLevel.IMMUNE]:      { label: 'Иммунный',      short: '81–100%', color: '#1a7a3c', bg: '#d4edda', bar: 95 },
}

function ResistanceBadge({ level }: { level: ResistanceLevel }) {
  const cfg = LEVEL_CONFIG[level]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      <Shield size={10} /> {cfg.label}
      <span style={{ opacity: 0.7, fontWeight: 400 }}>{cfg.short}</span>
    </span>
  )
}

function ResistanceBar({ level }: { level: ResistanceLevel }) {
  const cfg = LEVEL_CONFIG[level]
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${cfg.bar}%`, background: cfg.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}

export default function DiseaseResistancePage() {
  const [resistances, setResistances] = useState<DiseaseResistance[]>([])
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [varieties, setVarieties] = useState<CropVariety[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<DiseaseResistanceRequest>({
    diseaseId: 0, cropVarietyId: 0, resistanceLevel: ResistanceLevel.MEDIUM
  })
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<ResistanceLevel | ''>('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [r, d, v] = await Promise.all([
        diseaseResistanceService.getAll(),
        diseaseService.getAll(),
        cropVarietyService.getAll(),
      ])
      setResistances(r); setDiseases(d); setVarieties(v)
      setError(null)
    } catch { setError('Ошибка при загрузке данных') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingId) await diseaseResistanceService.update(editingId, formData)
      else await diseaseResistanceService.create(formData)
      await loadData(); closeModal()
    } catch { setError('Ошибка при сохранении') }
    finally { setLoading(false) }
  }

  const handleEdit = (r: DiseaseResistance) => {
    setEditingId(r.id)
    setFormData({ diseaseId: r.diseaseId, cropVarietyId: r.cropVarietyId, resistanceLevel: r.resistanceLevel })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись об устойчивости?')) return
    try {
      setLoading(true)
      await diseaseResistanceService.delete(id)
      await loadData()
    } catch { setError('Ошибка при удалении') }
    finally { setLoading(false) }
  }

  const closeModal = () => {
    setIsModalOpen(false); setEditingId(null)
    setFormData({ diseaseId: 0, cropVarietyId: 0, resistanceLevel: ResistanceLevel.MEDIUM })
  }

  const filtered = useMemo(() => resistances.filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q || r.diseaseName?.toLowerCase().includes(q) || r.cropVarietyName?.toLowerCase().includes(q)
    const matchL = !filterLevel || r.resistanceLevel === filterLevel
    return matchQ && matchL
  }), [resistances, search, filterLevel])

  // Group by variety for cards view
  const byVariety = useMemo(() => {
    const map: Record<string, DiseaseResistance[]> = {}
    filtered.forEach(r => {
      const k = r.cropVarietyName || 'Неизвестный сорт'
      if (!map[k]) map[k] = []
      map[k].push(r)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    resistances.forEach(r => { counts[r.resistanceLevel] = (counts[r.resistanceLevel] ?? 0) + 1 })
    return counts
  }, [resistances])

  return (
    <div>
      {/* Header */}
      <div className="page-header-bar mb-20">
        <h1 className="page-title">🛡️ Устойчивость сортов к болезням</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={15} /> Добавить запись
        </button>
      </div>

      {error && <div className="alert alert-error mb-20">{error}</div>}

      {/* Stats summary */}
      {resistances.length > 0 && (
        <div className="mb-20" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.values(ResistanceLevel).map(lvl => {
            const cfg = LEVEL_CONFIG[lvl]
            const count = levelCounts[lvl] ?? 0
            if (!count) return null
            return (
              <div key={lvl} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`,
                cursor: 'pointer',
                boxShadow: filterLevel === lvl ? `0 0 0 2px ${cfg.color}` : undefined,
              }} onClick={() => setFilterLevel(filterLevel === lvl ? '' : lvl)}>
                {cfg.label}: {count}
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32 }}
              placeholder="Поиск по болезни или сорту..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-control" style={{ width: 'auto' }}
            value={filterLevel} onChange={e => setFilterLevel(e.target.value as ResistanceLevel | '')}>
            <option value="">Все уровни</option>
            {Object.values(ResistanceLevel).map(lvl => (
              <option key={lvl} value={lvl}>{LEVEL_CONFIG[lvl].label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('table')}>Таблица</button>
            <button className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('cards')}>По сортам</button>
          </div>
        </div>
      </div>

      {loading && <div className="card"><div className="empty-state"><div className="spinner" /><div className="empty-state-text">Загрузка...</div></div></div>}

      {!loading && filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">Записей не найдено</div>
            <div className="empty-state-text">Добавьте первую запись об устойчивости сорта к болезни</div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={14} /> Добавить</button>
          </div>
        </div>
      )}

      {/* TABLE VIEW */}
      {!loading && filtered.length > 0 && viewMode === 'table' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Болезнь</th>
                  <th>Сорт культуры</th>
                  <th>Уровень устойчивости</th>
                  <th style={{ width: 80 }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.diseaseName}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{r.cropVarietyName}</td>
                    <td>
                      <ResistanceBadge level={r.resistanceLevel} />
                      <ResistanceBar level={r.resistanceLevel} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" onClick={() => handleEdit(r)} title="Редактировать"><Edit2 size={14} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(r.id)} title="Удалить"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARDS VIEW — grouped by variety */}
      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {byVariety.map(([varietyName, items]) => (
            <div key={varietyName} className="card card-padding">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                🌾 {varietyName}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                  {items.length} болезн{items.length === 1 ? 'ь' : items.length < 5 ? 'и' : 'ей'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 6, background: LEVEL_CONFIG[r.resistanceLevel].bg,
                    border: `1px solid ${LEVEL_CONFIG[r.resistanceLevel].color}25`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{r.diseaseName}</div>
                      <ResistanceBadge level={r.resistanceLevel} />
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button className="btn-icon" onClick={() => handleEdit(r)}><Edit2 size={12} /></button>
                      <button className="btn-icon danger" onClick={() => handleDelete(r.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? 'Редактировать устойчивость' : 'Добавить устойчивость'}</span>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Болезнь *</label>
                <select className="form-control"
                  value={formData.diseaseId}
                  onChange={e => setFormData({ ...formData, diseaseId: Number(e.target.value) })} required>
                  <option value={0}>— Выберите болезнь —</option>
                  {diseases.map(d => <option key={d.id} value={d.id}>{d.commonName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Сорт культуры *</label>
                <select className="form-control"
                  value={formData.cropVarietyId}
                  onChange={e => setFormData({ ...formData, cropVarietyId: Number(e.target.value) })} required>
                  <option value={0}>— Выберите сорт —</option>
                  {varieties.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.cropType?.name ?? '—'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Уровень устойчивости *</label>
                <select className="form-control"
                  value={formData.resistanceLevel}
                  onChange={e => setFormData({ ...formData, resistanceLevel: e.target.value as ResistanceLevel })} required>
                  {Object.values(ResistanceLevel).map(lvl => (
                    <option key={lvl} value={lvl}>{LEVEL_CONFIG[lvl].label} ({LEVEL_CONFIG[lvl].short})</option>
                  ))}
                </select>
                {formData.resistanceLevel && (
                  <div style={{ marginTop: 8 }}>
                    <ResistanceBadge level={formData.resistanceLevel} />
                    <ResistanceBar level={formData.resistanceLevel} />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Отмена</button>
              <button className="btn btn-primary" disabled={loading || !formData.diseaseId || !formData.cropVarietyId}
                onClick={handleSubmit as any}>
                <Save size={14} /> Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
