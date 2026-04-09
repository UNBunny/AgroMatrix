import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Edit2, Trash2, X, Save, ChevronRight, Shield, Search, Bug } from 'lucide-react'
import { diseaseService, diseaseResistanceService } from '../services/diseaseService'
import { cropTypeService, cropVarietyService } from '../services/cropService'
import { Disease, DiseaseRequest, DiseaseType, RiskLevel, DiseaseResistance, DiseaseResistanceRequest, ResistanceLevel } from '../types/DiseaseTypes'
import { CropType, CropVariety } from '../types/CropTypes'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Badge } from '../components/ui/Badge'

type PageTab = 'catalog' | 'resistance'

const DISEASE_TYPE_LABELS: Record<DiseaseType, string> = {
  [DiseaseType.FUNGAL]: 'Грибковое',
  [DiseaseType.BACTERIAL]: 'Бактериальное',
  [DiseaseType.VIRAL]: 'Вирусное',
  [DiseaseType.PHYTOPLASMA]: 'Фитоплазменное',
  [DiseaseType.NEMATODE]: 'Нематодное',
  [DiseaseType.ABIOTIC]: 'Абиотическое',
  [DiseaseType.UNKNOWN]: 'Неизвестно',
}

const RISK_CONFIG: Record<RiskLevel, { label: string; variant: 'green' | 'yellow' | 'orange' | 'red' }> = {
  [RiskLevel.LOW]: { label: 'Низкий', variant: 'green' },
  [RiskLevel.MEDIUM]: { label: 'Средний', variant: 'yellow' },
  [RiskLevel.HIGH]: { label: 'Высокий', variant: 'orange' },
  [RiskLevel.CRITICAL]: { label: 'Критический', variant: 'red' },
}

const DISEASE_ICONS: Record<DiseaseType, string> = {
  [DiseaseType.FUNGAL]: '🍄',
  [DiseaseType.BACTERIAL]: '🦠',
  [DiseaseType.VIRAL]: '🔬',
  [DiseaseType.PHYTOPLASMA]: '🌿',
  [DiseaseType.NEMATODE]: '🪱',
  [DiseaseType.ABIOTIC]: '🌡️',
  [DiseaseType.UNKNOWN]: '❓',
}

// ── Resistance helpers ────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<ResistanceLevel, { label: string; short: string; color: string; bg: string; bar: number }> = {
  [ResistanceLevel.SUSCEPTIBLE]: { label: 'Восприимчивый', short: '0–20%',  color: 'var(--color-danger)',  bg: 'var(--color-danger-light)',  bar: 10 },
  [ResistanceLevel.LOW]:         { label: 'Низкая',        short: '21–40%', color: '#e67e22', bg: '#fff3e0', bar: 30 },
  [ResistanceLevel.MEDIUM]:      { label: 'Средняя',       short: '41–60%', color: '#f1c40f', bg: '#fef9e7', bar: 50 },
  [ResistanceLevel.HIGH]:        { label: 'Высокая',       short: '61–80%', color: 'var(--color-success)', bg: 'var(--color-success-light)', bar: 70 },
  [ResistanceLevel.IMMUNE]:      { label: 'Иммунный',      short: '81–100%',color: '#1a7a3c', bg: '#d4edda', bar: 95 },
}

function ResistanceBadge({ level }: { level: ResistanceLevel }) {
  const cfg = LEVEL_CONFIG[level]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>
      <Shield size={10} /> {cfg.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>{cfg.short}</span>
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

// ── Resistance Tab ────────────────────────────────────────────────────────────

function ResistanceTab() {
  const [resistances, setResistances] = useState<DiseaseResistance[]>([])
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [varieties, setVarieties] = useState<CropVariety[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<DiseaseResistanceRequest>({ diseaseId: 0, cropVarietyId: 0, resistanceLevel: ResistanceLevel.MEDIUM })
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<ResistanceLevel | ''>('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [r, d, v] = await Promise.all([diseaseResistanceService.getAll(), diseaseService.getAll(), cropVarietyService.getAll()])
      setResistances(r); setDiseases(d); setVarieties(v); setError(null)
    } catch { setError('Ошибка загрузки') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      editingId ? await diseaseResistanceService.update(editingId, formData) : await diseaseResistanceService.create(formData)
      await loadData(); closeModal()
    } catch { setError('Ошибка сохранения') }
    finally { setLoading(false) }
  }

  const handleEdit = (r: DiseaseResistance) => {
    setEditingId(r.id)
    setFormData({ diseaseId: r.diseaseId, cropVarietyId: r.cropVarietyId, resistanceLevel: r.resistanceLevel })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try { setLoading(true); await diseaseResistanceService.delete(id); await loadData() }
    catch { setError('Ошибка удаления') }
    finally { setLoading(false) }
  }

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({ diseaseId: 0, cropVarietyId: 0, resistanceLevel: ResistanceLevel.MEDIUM }) }

  const filtered = useMemo(() => resistances.filter(r => {
    const q = search.toLowerCase()
    return (!q || r.diseaseName?.toLowerCase().includes(q) || r.cropVarietyName?.toLowerCase().includes(q))
      && (!filterLevel || r.resistanceLevel === filterLevel)
  }), [resistances, search, filterLevel])

  const byVariety = useMemo(() => {
    const map: Record<string, DiseaseResistance[]> = {}
    filtered.forEach(r => { const k = r.cropVarietyName || 'Неизвестный сорт'; if (!map[k]) map[k] = []; map[k].push(r) })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    resistances.forEach(r => { counts[r.resistanceLevel] = (counts[r.resistanceLevel] ?? 0) + 1 })
    return counts
  }, [resistances])

  return (
    <div>
      {error && <div className="alert alert-danger mb-12">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={15} /> Добавить запись</button>
      </div>

      {resistances.length > 0 && (
        <div className="mb-20" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.values(ResistanceLevel).map(lvl => {
            const cfg = LEVEL_CONFIG[lvl]; const count = levelCounts[lvl] ?? 0
            if (!count) return null
            return (
              <div key={lvl} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, cursor: 'pointer', boxShadow: filterLevel === lvl ? `0 0 0 2px ${cfg.color}` : undefined }}
                onClick={() => setFilterLevel(filterLevel === lvl ? '' : lvl)}>
                {cfg.label}: {count}
              </div>
            )
          })}
        </div>
      )}

      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Поиск по болезни или сорту..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={filterLevel} onChange={e => setFilterLevel(e.target.value as ResistanceLevel | '')}>
            <option value="">Все уровни</option>
            {Object.values(ResistanceLevel).map(lvl => <option key={lvl} value={lvl}>{LEVEL_CONFIG[lvl].label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('table')}>Таблица</button>
            <button className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('cards')}>По сортам</button>
          </div>
        </div>
      </div>

      {loading && <div className="card"><div className="empty-state"><div className="spinner" /><div className="empty-state-text">Загрузка...</div></div></div>}

      {!loading && filtered.length === 0 && (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <div className="empty-state-title">Записей не найдено</div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={14} /> Добавить</button>
        </div></div>
      )}

      {!loading && filtered.length > 0 && viewMode === 'table' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr><th>Болезнь</th><th>Сорт культуры</th><th>Уровень устойчивости</th><th style={{ width: 80 }}>Действия</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.diseaseName}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{r.cropVarietyName}</td>
                    <td><ResistanceBadge level={r.resistanceLevel} /><ResistanceBar level={r.resistanceLevel} /></td>
                    <td><div className="table-actions">
                      <button className="btn-icon" onClick={() => handleEdit(r)}><Edit2 size={14} /></button>
                      <button className="btn-icon danger" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {byVariety.map(([varietyName, items]) => (
            <div key={varietyName} className="card card-padding">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>🌾 {varietyName}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>{items.length} болезн{items.length === 1 ? 'ь' : items.length < 5 ? 'и' : 'ей'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', padding: '8px 10px', borderRadius: 6, background: LEVEL_CONFIG[r.resistanceLevel].bg, border: `1px solid ${LEVEL_CONFIG[r.resistanceLevel].color}25` }}>
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? 'Редактировать устойчивость' : 'Добавить устойчивость'}</span>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group"><label className="form-label">Болезнь *</label>
                <select className="form-control" value={formData.diseaseId} onChange={e => setFormData({ ...formData, diseaseId: Number(e.target.value) })} required>
                  <option value={0}>— Выберите болезнь —</option>
                  {diseases.map(d => <option key={d.id} value={d.id}>{d.commonName}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Сорт культуры *</label>
                <select className="form-control" value={formData.cropVarietyId} onChange={e => setFormData({ ...formData, cropVarietyId: Number(e.target.value) })} required>
                  <option value={0}>— Выберите сорт —</option>
                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name} ({v.cropType?.name ?? '—'})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Уровень устойчивости *</label>
                <select className="form-control" value={formData.resistanceLevel} onChange={e => setFormData({ ...formData, resistanceLevel: e.target.value as ResistanceLevel })} required>
                  {Object.values(ResistanceLevel).map(lvl => <option key={lvl} value={lvl}>{LEVEL_CONFIG[lvl].label} ({LEVEL_CONFIG[lvl].short})</option>)}
                </select>
                {formData.resistanceLevel && (<div style={{ marginTop: 8 }}><ResistanceBadge level={formData.resistanceLevel} /><ResistanceBar level={formData.resistanceLevel} /></div>)}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Отмена</button>
              <button className="btn btn-primary" disabled={loading || !formData.diseaseId || !formData.cropVarietyId} onClick={handleSubmit as any}><Save size={14} /> Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Catalog Tab (existing content renamed) ────────────────────────────────────

const emptyForm: DiseaseRequest = {
  scientificName: '', commonName: '', diseaseType: DiseaseType.FUNGAL,
  affectedCropIds: [], symptoms: '', preventionMeasures: '', treatmentMethods: '',
  riskLevel: RiskLevel.MEDIUM, activeSeason: '', favorableConditions: '', imageUrl: '', isActive: true
}

function CatalogTab() {
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<DiseaseRequest>(emptyForm)
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterRisk, setFilterRisk] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [d, c] = await Promise.all([diseaseService.getAll(), cropTypeService.getAll()])
      setDiseases(d); setCropTypes(c)
    } catch { setError('Ошибка загрузки данных') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingId) await diseaseService.update(editingId, formData)
      else await diseaseService.create(formData)
      await loadData(); closeModal()
    } catch { setError('Ошибка сохранения') }
    finally { setLoading(false) }
  }

  const handleEdit = (d: Disease) => {
    setEditingId(d.id)
    setFormData({
      scientificName: d.scientificName, commonName: d.commonName, diseaseType: d.diseaseType,
      affectedCropIds: d.affectedCropIds || [], symptoms: d.symptoms || '',
      preventionMeasures: d.preventionMeasures || '', treatmentMethods: d.treatmentMethods || '',
      riskLevel: d.riskLevel, activeSeason: d.activeSeason || '',
      favorableConditions: d.favorableConditions || '', imageUrl: d.imageUrl || '',
      isActive: d.isActive ?? true
    })
    setIsModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try { await diseaseService.delete(deleteId); await loadData() }
    catch { setError('Ошибка удаления') }
    setDeleteId(null)
    if (selectedDisease?.id === deleteId) setSelectedDisease(null)
  }

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setFormData(emptyForm) }

  const toggleCrop = (id: number) => {
    setFormData(prev => ({
      ...prev,
      affectedCropIds: prev.affectedCropIds?.includes(id)
        ? prev.affectedCropIds.filter(c => c !== id)
        : [...(prev.affectedCropIds || []), id]
    }))
  }

  const set = (key: keyof DiseaseRequest, val: any) => setFormData(d => ({ ...d, [key]: val }))

  const filtered = diseases.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.commonName.toLowerCase().includes(q) || d.scientificName.toLowerCase().includes(q)
    const matchType = !filterType || d.diseaseType === filterType
    const matchRisk = !filterRisk || d.riskLevel === filterRisk
    return matchSearch && matchType && matchRisk
  })

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Левая часть */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header-bar mb-20">
          <h1 className="page-title">Болезни растений</h1>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Добавить болезнь
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Фильтры */}
        <div className="card card-padding mb-20">
          <div className="filter-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Поиск болезни..." />
            <select className="form-control" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Все типы</option>
              {Object.entries(DISEASE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
              <option value="">Все риски</option>
              {Object.entries(RISK_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="card"><div className="empty-state"><div className="spinner" style={{ marginBottom: 12 }} /><div className="empty-state-text">Загрузка...</div></div></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon="🦠" title="Болезней не найдено"
              text="Добавьте первую болезнь в справочник"
              action={<button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={14} /> Добавить</button>} />
          </div>
        ) : (
          <div className="disease-cards-grid">
            {filtered.map(d => {
              const risk = RISK_CONFIG[d.riskLevel]
              const isSelected = selectedDisease?.id === d.id
              return (
                <div
                  key={d.id}
                  className="disease-card"
                  style={isSelected ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 2px var(--color-primary-light)' } : undefined}
                  onClick={() => setSelectedDisease(isSelected ? null : d)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="disease-card-icon">{DISEASE_ICONS[d.diseaseType]}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); handleEdit(d) }}><Edit2 size={13} /></button>
                      <button className="btn-icon danger" onClick={e => { e.stopPropagation(); setDeleteId(d.id) }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="disease-card-name">{d.commonName}</div>
                  <div className="disease-card-scientific">{d.scientificName}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <Badge variant="gray">{DISEASE_TYPE_LABELS[d.diseaseType]}</Badge>
                    <Badge variant={risk.variant}>{risk.label} риск</Badge>
                    {!d.isActive && <Badge variant="gray">Неактивна</Badge>}
                  </div>
                  {d.activeSeason && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>🗓️ {d.activeSeason}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                      Подробнее <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Правая панель деталей */}
      {selectedDisease && (
        <div className="card" style={{ width: 340, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{DISEASE_ICONS[selectedDisease.diseaseType]}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedDisease.commonName}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{selectedDisease.scientificName}</div>
            </div>
            <button className="btn-icon" onClick={() => setSelectedDisease(null)}><X size={16} /></button>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 500, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge variant="gray">{DISEASE_TYPE_LABELS[selectedDisease.diseaseType]}</Badge>
              <Badge variant={RISK_CONFIG[selectedDisease.riskLevel].variant}>{RISK_CONFIG[selectedDisease.riskLevel].label} риск</Badge>
            </div>
            {selectedDisease.activeSeason && (
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>🗓️ АКТИВНЫЙ СЕЗОН</div>
                <div style={{ fontSize: 13 }}>{selectedDisease.activeSeason}</div></div>
            )}
            {selectedDisease.symptoms && (
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>📋 СИМПТОМЫ</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedDisease.symptoms}</div></div>
            )}
            {selectedDisease.favorableConditions && (
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>🌡️ БЛАГОПРИЯТНЫЕ УСЛОВИЯ</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedDisease.favorableConditions}</div></div>
            )}
            {selectedDisease.preventionMeasures && (
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>🛡️ ПРОФИЛАКТИКА</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedDisease.preventionMeasures}</div></div>
            )}
            {selectedDisease.treatmentMethods && (
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>💊 ЛЕЧЕНИЕ</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedDisease.treatmentMethods}</div></div>
            )}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleEdit(selectedDisease)}>
              <Edit2 size={12} /> Редактировать
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(selectedDisease.id)}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Модалка */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? 'Редактировать болезнь' : 'Добавить болезнь'}</span>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Научное название *</label>
                    <input className="form-control" value={formData.scientificName} onChange={e => set('scientificName', e.target.value)} required maxLength={200} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Общее название *</label>
                    <input className="form-control" value={formData.commonName} onChange={e => set('commonName', e.target.value)} required maxLength={200} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Тип болезни *</label>
                    <select className="form-control" value={formData.diseaseType} onChange={e => set('diseaseType', e.target.value as DiseaseType)} required>
                      {Object.entries(DISEASE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Уровень риска *</label>
                    <select className="form-control" value={formData.riskLevel} onChange={e => set('riskLevel', e.target.value as RiskLevel)} required>
                      {Object.entries(RISK_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Активный сезон</label>
                  <input className="form-control" value={formData.activeSeason} onChange={e => set('activeSeason', e.target.value)} placeholder="Например: весна-лето" />
                </div>
                <div className="form-group">
                  <label className="form-label">Симптомы</label>
                  <textarea className="form-control" rows={3} value={formData.symptoms} onChange={e => set('symptoms', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Благоприятные условия</label>
                  <textarea className="form-control" rows={2} value={formData.favorableConditions} onChange={e => set('favorableConditions', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Меры профилактики</label>
                  <textarea className="form-control" rows={3} value={formData.preventionMeasures} onChange={e => set('preventionMeasures', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Методы лечения</label>
                  <textarea className="form-control" rows={3} value={formData.treatmentMethods} onChange={e => set('treatmentMethods', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Поражаемые культуры</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cropTypes.map(ct => (
                      <label key={ct.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: formData.affectedCropIds?.includes(ct.id) ? 'var(--color-primary-light)' : 'var(--color-bg)', border: '1px solid', borderColor: formData.affectedCropIds?.includes(ct.id) ? 'var(--color-primary-medium)' : 'var(--color-border)' }}>
                        <input type="checkbox" checked={formData.affectedCropIds?.includes(ct.id) ?? false} onChange={() => toggleCrop(ct.id)} style={{ display: 'none' }} />
                        {ct.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={loading}><Save size={14} /> Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} title="Удалить болезнь?" message="Запись о болезни будет удалена безвозвратно."
        confirmLabel="Удалить" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiseasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: PageTab = tabParam === 'resistance' ? 'resistance' : 'catalog'
  const setTab = (t: PageTab) => setSearchParams(t === 'catalog' ? {} : { tab: t })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Болезни</h1>
          <p className="page-subtitle">Каталог болезней растений и устойчивость сортов</p>
        </div>
      </div>
      <div className="tabs-bar">
        <button className={`tab-btn${tab === 'catalog' ? ' active' : ''}`} onClick={() => setTab('catalog')}>
          <Bug size={16} /> Каталог болезней
        </button>
        <button className={`tab-btn${tab === 'resistance' ? ' active' : ''}`} onClick={() => setTab('resistance')}>
          <Shield size={16} /> Устойчивость сортов
        </button>
      </div>
      <div style={{ marginTop: 20 }}>
        {tab === 'catalog'    && <CatalogTab />}
        {tab === 'resistance' && <ResistanceTab />}
      </div>
    </div>
  )
}

