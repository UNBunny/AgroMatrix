import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, FlaskConical, Search, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { catalogEntryService, CatalogEntry, CatalogEntryRequest } from '../../services/catalogEntryService'

const DISEASE_TYPES = ['FUNGAL', 'BACTERIAL', 'VIRAL', 'PHYTOPLASMA', 'NEMATODE', 'ABIOTIC', 'UNKNOWN']
const APPLICATION_TYPES = ['FOLIAR', 'SOIL', 'SEED_TREATMENT', 'DRIP', 'FUMIGATION']

const DISEASE_TYPE_LABELS: Record<string, string> = {
  FUNGAL: 'Грибковое', BACTERIAL: 'Бактериальное', VIRAL: 'Вирусное',
  PHYTOPLASMA: 'Фитоплазменное', NEMATODE: 'Нематодное', ABIOTIC: 'Абиотическое', UNKNOWN: 'Неизвестно',
}

const APP_TYPE_LABELS: Record<string, string> = {
  FOLIAR: 'Опрыскивание', SOIL: 'Почвенное', SEED_TREATMENT: 'Протравка семян',
  DRIP: 'Капельное', FUMIGATION: 'Фумигация',
}

const emptyForm = (): CatalogEntryRequest => ({
  cropCode: '', diseaseName: '', pathogenLatin: '', diseaseType: 'FUNGAL',
  productName: '', fracGroup: '', fracCode: '', activeIngredients: '',
  aiConcentration: '', applicationType: 'FOLIAR', bbchFrom: undefined, bbchTo: undefined,
  bbchNote: '', doseRate: '', doseValue: undefined, doseUnit: 'л/га',
  tempMinC: undefined, tempOptC: undefined, tempMaxC: undefined, phiDays: 0,
  notes: '', isActive: true,
})

export default function AdminProductsPage() {
  const [items, setItems] = useState<CatalogEntry[]>([])
  const [filtered, setFiltered] = useState<CatalogEntry[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<CatalogEntryRequest>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => {
    let result = items
    const q = search.toLowerCase()
    if (q) result = result.filter(i =>
      i.productName.toLowerCase().includes(q) ||
      i.diseaseName.toLowerCase().includes(q) ||
      i.cropCode.toLowerCase().includes(q) ||
      i.activeIngredients.toLowerCase().includes(q)
    )
    if (typeFilter) result = result.filter(i => i.diseaseType === typeFilter)
    setFiltered(result)
  }, [search, typeFilter, items])

  const load = async () => {
    try {
      setLoading(true)
      setItems(await catalogEntryService.getAll())
      setError(null)
    } catch {
      setError('Ошибка загрузки каталога. Убедитесь, что эндпоинт GET /api/protection/catalog реализован на бэкенде.')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => { setEditId(null); setForm(emptyForm()); setModal(true) }
  const openEdit = (item: CatalogEntry) => {
    setEditId(item.id)
    setForm({
      cropCode: item.cropCode, diseaseName: item.diseaseName,
      pathogenLatin: item.pathogenLatin ?? '', diseaseType: item.diseaseType,
      productName: item.productName, fracGroup: item.fracGroup ?? '',
      fracCode: item.fracCode ?? '', activeIngredients: item.activeIngredients,
      aiConcentration: item.aiConcentration ?? '', applicationType: item.applicationType,
      bbchFrom: item.bbchFrom ?? undefined, bbchTo: item.bbchTo ?? undefined,
      bbchNote: item.bbchNote ?? '', doseRate: item.doseRate,
      doseValue: item.doseValue ?? undefined, doseUnit: item.doseUnit ?? 'л/га',
      tempMinC: item.tempMinC ?? undefined, tempOptC: item.tempOptC ?? undefined,
      tempMaxC: item.tempMaxC ?? undefined, phiDays: item.phiDays,
      notes: item.notes ?? '', isActive: item.isActive,
    })
    setModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editId) await catalogEntryService.update(editId, form)
      else await catalogEntryService.create(form)
      setModal(false); await load()
    } catch { setError('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить препарат «${name}»?`)) return
    try { await catalogEntryService.delete(id); await load() }
    catch { setError('Ошибка удаления') }
  }

  const toggleActive = async (item: CatalogEntry) => {
    try {
      await catalogEntryService.update(item.id, { ...item, isActive: !item.isActive, pathogenLatin: item.pathogenLatin ?? undefined, fracGroup: item.fracGroup ?? undefined, fracCode: item.fracCode ?? undefined, aiConcentration: item.aiConcentration ?? undefined, bbchFrom: item.bbchFrom ?? undefined, bbchTo: item.bbchTo ?? undefined, bbchNote: item.bbchNote ?? undefined, doseValue: item.doseValue ?? undefined, doseUnit: item.doseUnit ?? undefined, tempMinC: item.tempMinC ?? undefined, tempOptC: item.tempOptC ?? undefined, tempMaxC: item.tempMaxC ?? undefined, notes: item.notes ?? undefined })
      await load()
    } catch { setError('Ошибка обновления статуса') }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <FlaskConical size={22} />
          <h1>Каталог препаратов защиты</h1>
        </div>
        <p className="admin-page-subtitle">Пестициды, фунгициды, инсектициды — записи каталога crop_protection_catalog</p>
      </div>

      <div className="admin-tab-content">
        <div className="admin-tab-toolbar">
          <div className="admin-search-wrap">
            <Search size={15} className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="Препарат, болезнь, культура, действующее вещество..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="admin-filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">Все типы болезней</option>
            {DISEASE_TYPES.map(t => <option key={t} value={t}>{DISEASE_TYPE_LABELS[t]}</option>)}
          </select>
          <button className="admin-btn-primary" onClick={openCreate}>
            <Plus size={16} /> Добавить препарат
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
                  <th>Препарат</th>
                  <th>Культура</th>
                  <th>Болезнь</th>
                  <th>Тип</th>
                  <th>Д.В.</th>
                  <th>Доза</th>
                  <th>PHI (дн.)</th>
                  <th>BBCH</th>
                  <th>Актив.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="admin-table-empty">Ничего не найдено</td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td className="admin-td-muted">{item.id}</td>
                    <td><strong>{item.productName}</strong>{item.fracCode && <span className="admin-td-muted"> [{item.fracCode}]</span>}</td>
                    <td><code className="admin-code">{item.cropCode}</code></td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.diseaseName}</td>
                    <td>{DISEASE_TYPE_LABELS[item.diseaseType] ?? item.diseaseType}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.activeIngredients}>{item.activeIngredients}</td>
                    <td>{item.doseRate}</td>
                    <td>{item.phiDays}</td>
                    <td>{item.bbchFrom != null && item.bbchTo != null ? `${item.bbchFrom}–${item.bbchTo}` : '—'}</td>
                    <td>
                      <button
                        className="admin-icon-btn"
                        onClick={() => toggleActive(item)}
                        title={item.isActive ? 'Деактивировать' : 'Активировать'}
                        style={{ color: item.isActive ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                      >
                        {item.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </td>
                    <td className="admin-td-actions">
                      <button className="admin-icon-btn edit" onClick={() => openEdit(item)} title="Редактировать">
                        <Edit2 size={14} />
                      </button>
                      <button className="admin-icon-btn delete" onClick={() => handleDelete(item.id, item.productName)} title="Удалить">
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
              <h3>{editId ? 'Редактировать препарат' : 'Новый препарат'}</h3>
              <button className="admin-modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form className="admin-modal-form" onSubmit={handleSave}>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Название препарата *</label>
                  <input required value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} placeholder="Фалькон КЭ" />
                </div>
                <div className="admin-form-row">
                  <label>Код культуры (ML) *</label>
                  <input required value={form.cropCode} onChange={e => setForm({ ...form, cropCode: e.target.value })} placeholder="wheat" />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Болезнь *</label>
                  <input required value={form.diseaseName} onChange={e => setForm({ ...form, diseaseName: e.target.value })} placeholder="Мучнистая роса" />
                </div>
                <div className="admin-form-row">
                  <label>Патоген (лат.)</label>
                  <input value={form.pathogenLatin ?? ''} onChange={e => setForm({ ...form, pathogenLatin: e.target.value })} placeholder="Erysiphe graminis" />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Тип болезни *</label>
                  <select value={form.diseaseType} onChange={e => setForm({ ...form, diseaseType: e.target.value })}>
                    {DISEASE_TYPES.map(t => <option key={t} value={t}>{DISEASE_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="admin-form-row">
                  <label>Способ применения *</label>
                  <select value={form.applicationType} onChange={e => setForm({ ...form, applicationType: e.target.value })}>
                    {APPLICATION_TYPES.map(t => <option key={t} value={t}>{APP_TYPE_LABELS[t] ?? t}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-form-row">
                <label>Действующие вещества *</label>
                <input required value={form.activeIngredients} onChange={e => setForm({ ...form, activeIngredients: e.target.value })} placeholder="Тебуконазол 167 г/л + Спироксамин 250 г/л" />
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Концентрация Д.В.</label>
                  <input value={form.aiConcentration ?? ''} onChange={e => setForm({ ...form, aiConcentration: e.target.value })} placeholder="167+250 г/л" />
                </div>
                <div className="admin-form-row">
                  <label>Группа FRAC</label>
                  <input value={form.fracGroup ?? ''} onChange={e => setForm({ ...form, fracGroup: e.target.value })} placeholder="DMI+SpiroK" />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Код FRAC</label>
                  <input value={form.fracCode ?? ''} onChange={e => setForm({ ...form, fracCode: e.target.value })} placeholder="G1+C5" />
                </div>
                <div className="admin-form-row">
                  <label>PHI (дней до уборки) *</label>
                  <input type="number" required value={form.phiDays} onChange={e => setForm({ ...form, phiDays: +e.target.value })} />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Норма расхода *</label>
                  <input required value={form.doseRate} onChange={e => setForm({ ...form, doseRate: e.target.value })} placeholder="0.6 л/га" />
                </div>
                <div className="admin-form-row">
                  <label>Единица дозы</label>
                  <input value={form.doseUnit ?? ''} onChange={e => setForm({ ...form, doseUnit: e.target.value })} placeholder="л/га" />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>BBCH от</label>
                  <input type="number" value={form.bbchFrom ?? ''} onChange={e => setForm({ ...form, bbchFrom: e.target.value ? +e.target.value : undefined })} />
                </div>
                <div className="admin-form-row">
                  <label>BBCH до</label>
                  <input type="number" value={form.bbchTo ?? ''} onChange={e => setForm({ ...form, bbchTo: e.target.value ? +e.target.value : undefined })} />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Темп. мин (°C)</label>
                  <input type="number" step="0.1" value={form.tempMinC ?? ''} onChange={e => setForm({ ...form, tempMinC: e.target.value ? +e.target.value : undefined })} />
                </div>
                <div className="admin-form-row">
                  <label>Темп. макс (°C)</label>
                  <input type="number" step="0.1" value={form.tempMaxC ?? ''} onChange={e => setForm({ ...form, tempMaxC: e.target.value ? +e.target.value : undefined })} />
                </div>
              </div>
              <div className="admin-form-row">
                <label>Примечание BBCH</label>
                <input value={form.bbchNote ?? ''} onChange={e => setForm({ ...form, bbchNote: e.target.value })} placeholder="Кущение — колошение" />
              </div>
              <div className="admin-form-row">
                <label>Примечания</label>
                <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  {' '}Активен (участвует в фильтрации каталога)
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
