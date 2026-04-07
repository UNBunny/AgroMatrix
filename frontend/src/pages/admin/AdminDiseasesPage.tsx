import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, Bug, Search, AlertCircle } from 'lucide-react'
import { diseaseService } from '../../services/diseaseService'
import {
  Disease, DiseaseRequest, DiseaseType, RiskLevel
} from '../../types/DiseaseTypes'

const DISEASE_TYPE_LABELS: Record<DiseaseType, string> = {
  [DiseaseType.FUNGAL]: 'Грибковое',
  [DiseaseType.BACTERIAL]: 'Бактериальное',
  [DiseaseType.VIRAL]: 'Вирусное',
  [DiseaseType.PHYTOPLASMA]: 'Фитоплазменное',
  [DiseaseType.NEMATODE]: 'Нематодное',
  [DiseaseType.ABIOTIC]: 'Абиотическое',
  [DiseaseType.UNKNOWN]: 'Неизвестно',
}

const RISK_LABELS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'Низкий',
  [RiskLevel.MEDIUM]: 'Средний',
  [RiskLevel.HIGH]: 'Высокий',
  [RiskLevel.CRITICAL]: 'Критический',
}

const RISK_CLASS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'green',
  [RiskLevel.MEDIUM]: 'yellow',
  [RiskLevel.HIGH]: 'orange',
  [RiskLevel.CRITICAL]: 'red',
}

const emptyForm = (): DiseaseRequest => ({
  scientificName: '', commonName: '',
  diseaseType: DiseaseType.FUNGAL, riskLevel: RiskLevel.LOW,
  affectedCropIds: [], symptoms: '', preventionMeasures: '',
  treatmentMethods: '', activeSeason: '', favorableConditions: '', imageUrl: '', isActive: true,
})

export default function AdminDiseasesPage() {
  const [items, setItems] = useState<Disease[]>([])
  const [filtered, setFiltered] = useState<Disease[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DiseaseType | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<DiseaseRequest>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => {
    let result = items
    const q = search.toLowerCase()
    if (q) result = result.filter(i =>
      i.commonName.toLowerCase().includes(q) || i.scientificName.toLowerCase().includes(q)
    )
    if (typeFilter) result = result.filter(i => i.diseaseType === typeFilter)
    setFiltered(result)
  }, [search, typeFilter, items])

  const load = async () => {
    try { setLoading(true); setItems(await diseaseService.getAll()); setError(null) }
    catch { setError('Ошибка загрузки болезней') }
    finally { setLoading(false) }
  }

  const openCreate = () => { setEditId(null); setForm(emptyForm()); setModal(true) }
  const openEdit = (item: Disease) => {
    setEditId(item.id)
    setForm({
      scientificName: item.scientificName, commonName: item.commonName,
      diseaseType: item.diseaseType, riskLevel: item.riskLevel,
      affectedCropIds: item.affectedCropIds ?? [],
      symptoms: item.symptoms ?? '', preventionMeasures: item.preventionMeasures ?? '',
      treatmentMethods: item.treatmentMethods ?? '', activeSeason: item.activeSeason ?? '',
      favorableConditions: item.favorableConditions ?? '', imageUrl: item.imageUrl ?? '',
      isActive: item.isActive ?? true,
    })
    setModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editId) await diseaseService.update(editId, form)
      else await diseaseService.create(form)
      setModal(false); await load()
    } catch { setError('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить болезнь «${name}»?`)) return
    try { await diseaseService.delete(id); await load() }
    catch { setError('Ошибка удаления') }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <Bug size={22} />
          <h1>Болезни растений</h1>
        </div>
      </div>

      <div className="admin-tab-content">
        <div className="admin-tab-toolbar">
          <div className="admin-search-wrap">
            <Search size={15} className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="Поиск по названию..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="admin-filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as DiseaseType | '')}
          >
            <option value="">Все типы</option>
            {Object.values(DiseaseType).map(v => (
              <option key={v} value={v}>{DISEASE_TYPE_LABELS[v]}</option>
            ))}
          </select>
          <button className="admin-btn-primary" onClick={openCreate}>
            <Plus size={16} /> Добавить болезнь
          </button>
        </div>

        {error && (
          <div className="admin-alert error">
            <AlertCircle size={15} /> {error}
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">Загрузка...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Русское название</th>
                  <th>Научное название</th>
                  <th>Тип</th>
                  <th>Риск</th>
                  <th>Активен</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="admin-table-empty">Ничего не найдено</td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td className="admin-td-muted">{item.id}</td>
                    <td><strong>{item.commonName}</strong></td>
                    <td><em className="admin-td-muted">{item.scientificName}</em></td>
                    <td>{DISEASE_TYPE_LABELS[item.diseaseType]}</td>
                    <td>
                      <span className={`admin-badge ${RISK_CLASS[item.riskLevel]}`}>
                        {RISK_LABELS[item.riskLevel]}
                      </span>
                    </td>
                    <td>
                      {item.isActive
                        ? <span className="admin-badge green">Да</span>
                        : <span className="admin-badge gray">Нет</span>}
                    </td>
                    <td className="admin-td-actions">
                      <button className="admin-icon-btn edit" onClick={() => openEdit(item)} title="Редактировать">
                        <Edit2 size={14} />
                      </button>
                      <button className="admin-icon-btn delete" onClick={() => handleDelete(item.id, item.commonName)} title="Удалить">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(false)}>
          <div className="admin-modal admin-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editId ? 'Редактировать болезнь' : 'Новая болезнь'}</h3>
              <button className="admin-modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form className="admin-modal-form" onSubmit={handleSave}>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Русское название *</label>
                  <input required value={form.commonName} onChange={e => setForm({ ...form, commonName: e.target.value })} placeholder="Мучнистая роса" />
                </div>
                <div className="admin-form-row">
                  <label>Научное название *</label>
                  <input required value={form.scientificName} onChange={e => setForm({ ...form, scientificName: e.target.value })} placeholder="Erysiphe graminis" />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Тип болезни *</label>
                  <select value={form.diseaseType} onChange={e => setForm({ ...form, diseaseType: e.target.value as DiseaseType })}>
                    {Object.values(DiseaseType).map(v => <option key={v} value={v}>{DISEASE_TYPE_LABELS[v]}</option>)}
                  </select>
                </div>
                <div className="admin-form-row">
                  <label>Уровень риска *</label>
                  <select value={form.riskLevel} onChange={e => setForm({ ...form, riskLevel: e.target.value as RiskLevel })}>
                    {Object.values(RiskLevel).map(v => <option key={v} value={v}>{RISK_LABELS[v]}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Активный сезон</label>
                  <input value={form.activeSeason ?? ''} onChange={e => setForm({ ...form, activeSeason: e.target.value })} placeholder="Весна, лето" />
                </div>
                <div className="admin-form-row">
                  <label>URL изображения</label>
                  <input value={form.imageUrl ?? ''} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="admin-form-row">
                <label>Симптомы</label>
                <textarea rows={2} value={form.symptoms ?? ''} onChange={e => setForm({ ...form, symptoms: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>Благоприятные условия</label>
                <textarea rows={2} value={form.favorableConditions ?? ''} onChange={e => setForm({ ...form, favorableConditions: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>Меры профилактики</label>
                <textarea rows={2} value={form.preventionMeasures ?? ''} onChange={e => setForm({ ...form, preventionMeasures: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>Методы лечения</label>
                <textarea rows={2} value={form.treatmentMethods ?? ''} onChange={e => setForm({ ...form, treatmentMethods: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>
                  <input type="checkbox" checked={form.isActive ?? true} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  {' '}Активна
                </label>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setModal(false)}>Отмена</button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                  <Save size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
