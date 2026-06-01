import { useState, useEffect } from 'react'
import {
  Building2, MapPin, Phone, Mail, User, Edit2, Save, X,
  Layers, Sprout, TrendingUp, Calendar, ChevronRight, FileSpreadsheet, Download
} from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { cropHistoryService } from '../services/cropService'
import { downloadApiXls } from '../services/exportService'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'farm_profile'

interface FarmProfile {
  name: string
  orgForm: string
  inn: string
  region: string
  district: string
  address: string
  headName: string
  headPhone: string
  headEmail: string
  mainCrops: string
  totalArea: string
  foundedYear: string
  notes: string
}

const defaultProfile = (): FarmProfile => ({
  name: '', orgForm: 'КФХ', inn: '', region: '', district: '',
  address: '', headName: '', headPhone: '', headEmail: '',
  mainCrops: '', totalArea: '', foundedYear: '', notes: '',
})

const ORG_FORMS = ['КФХ', 'ООО', 'АО', 'СПК', 'ИП', 'СХПК', 'ЗАО', 'ОАО', 'ГУП', 'МУП']

function loadProfile(): FarmProfile {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? { ...defaultProfile(), ...JSON.parse(s) } : defaultProfile()
  } catch { return defaultProfile() }
}

function saveProfile(p: FarmProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

interface StatBox {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}

function StatCard({ icon, label, value, sub }: StatBox) {
  return (
    <div className="fp-stat-card">
      <div className="fp-stat-icon">{icon}</div>
      <div className="fp-stat-body">
        <div className="fp-stat-value">{value}</div>
        <div className="fp-stat-label">{label}</div>
        {sub && <div className="fp-stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

export default function FarmProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<FarmProfile>(loadProfile)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<FarmProfile>(profile)
  const [stats, setStats] = useState({ fields: 0, totalHa: 0, activeSeedings: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  async function handleExportSowingHistory() {
    if (!user?.farmId) return
    setExporting(true)
    try {
      await downloadApiXls(`/farms/${user.farmId}/sowing-history/export`, `sowing-history-${user.farmId}.xlsx`)
    } catch (e) { console.error(e) } finally { setExporting(false) }
  }

  useEffect(() => {
    Promise.all([fieldService.getAllFields(), cropHistoryService.getAll()])
      .then(([fields, histories]) => {
        const totalHa = fields.reduce((sum, f) => sum + (f.areaHectares ?? 0), 0)
        const active = histories.filter(h => h.plantingStatus === 'PLANTED' || h.plantingStatus === 'GROWING')
        setStats({ fields: fields.length, totalHa: Math.round(totalHa), activeSeedings: active.length })
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const handleEdit = () => { setDraft({ ...profile }); setEditing(true) }
  const handleCancel = () => setEditing(false)
  const handleSave = () => { saveProfile(draft); setProfile(draft); setEditing(false) }

  const isEmpty = !profile.name

  return (
    <div className="fp-page">
      {/* ── Header ── */}
      <div className="fp-header">
        <div className="fp-header-left">
          <div className="fp-avatar">
            <Building2 size={32} />
          </div>
          <div className="fp-header-info">
            <h1 className="fp-farm-name">
              {profile.name || <span className="fp-placeholder">Название хозяйства не указано</span>}
            </h1>
            <div className="fp-farm-meta">
              {profile.orgForm && <span className="fp-tag">{profile.orgForm}</span>}
              {profile.region && (
                <span className="fp-meta-item">
                  <MapPin size={13} /> {profile.region}{profile.district ? `, ${profile.district}` : ''}
                </span>
              )}
              {profile.foundedYear && (
                <span className="fp-meta-item">
                  <Calendar size={13} /> Основано в {profile.foundedYear}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="fp-edit-btn" onClick={handleEdit}>
          <Edit2 size={15} /> Редактировать
        </button>
      </div>

      {isEmpty && !editing && (
        <div className="fp-empty-banner">
          <Building2 size={24} />
          <div>
            <strong>Профиль хозяйства не заполнен</strong>
            <p>Добавьте информацию о вашем хозяйстве — название, регион, контакты руководителя.</p>
          </div>
          <button className="admin-btn-primary" onClick={handleEdit}>
            Заполнить профиль
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="fp-stats-grid">
        <StatCard
          icon={<Layers size={22} />}
          label="Поля в системе"
          value={statsLoading ? '—' : stats.fields}
          sub="учтённых участков"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Общая площадь"
          value={statsLoading ? '—' : `${stats.totalHa.toLocaleString()} га`}
          sub="в базе данных"
        />
        <StatCard
          icon={<Sprout size={22} />}
          label="Активные посевы"
          value={statsLoading ? '—' : stats.activeSeedings}
          sub="посеяно / растёт"
        />
        {profile.totalArea && (
          <StatCard
            icon={<Building2 size={22} />}
            label="Общая площадь хозяйства"
            value={`${profile.totalArea} га`}
            sub="по документам"
          />
        )}
      </div>

      {/* ── Export ── */}
      {user?.farmId && (
        <div className="card" style={{ marginBottom: 20, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}>
            <Download size={16} /> Экспорт данных
          </div>
          <button
            className="btn-secondary"
            onClick={handleExportSowingHistory}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileSpreadsheet size={15} />
            {exporting ? 'Загрузка...' : 'История посевов (Excel)'}
          </button>
        </div>
      )}

      {/* ── Info Blocks ── */}
      {!editing ? (
        <div className="fp-info-grid">
          {/* Основные сведения */}
          <div className="fp-info-card">
            <div className="fp-info-card-title"><Building2 size={16} /> Основные сведения</div>
            <InfoRow label="Организационная форма" value={profile.orgForm} />
            <InfoRow label="ИНН" value={profile.inn} />
            <InfoRow label="Регион" value={profile.region} />
            <InfoRow label="Район" value={profile.district} />
            <InfoRow label="Юридический адрес" value={profile.address} />
            <InfoRow label="Год основания" value={profile.foundedYear} />
          </div>

          {/* Руководитель */}
          <div className="fp-info-card">
            <div className="fp-info-card-title"><User size={16} /> Руководитель</div>
            <InfoRow label="ФИО" value={profile.headName} />
            <InfoRow label="Телефон" value={profile.headPhone} icon={<Phone size={12} />} />
            <InfoRow label="Email" value={profile.headEmail} icon={<Mail size={12} />} />
          </div>

          {/* Производство */}
          <div className="fp-info-card">
            <div className="fp-info-card-title"><Sprout size={16} /> Производство</div>
            <InfoRow label="Основные культуры" value={profile.mainCrops} />
            <InfoRow label="Площадь в обработке" value={profile.totalArea ? `${profile.totalArea} га` : ''} />
            {profile.notes && (
              <div className="fp-info-notes">
                <span className="fp-info-label">Дополнительно</span>
                <p>{profile.notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Edit Form ── */
        <div className="fp-edit-form">
          <div className="fp-edit-section">
            <div className="fp-edit-section-title">Основные сведения</div>
            <div className="fp-form-grid">
              <FormField label="Название хозяйства *" required>
                <input required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Фермерское хозяйство Иванова" />
              </FormField>
              <FormField label="Организационная форма">
                <select value={draft.orgForm} onChange={e => setDraft({ ...draft, orgForm: e.target.value })}>
                  {ORG_FORMS.map(f => <option key={f}>{f}</option>)}
                </select>
              </FormField>
              <FormField label="ИНН">
                <input value={draft.inn} onChange={e => setDraft({ ...draft, inn: e.target.value })} placeholder="123456789012" maxLength={12} />
              </FormField>
              <FormField label="Год основания">
                <input type="number" value={draft.foundedYear} onChange={e => setDraft({ ...draft, foundedYear: e.target.value })} placeholder="2005" min={1900} max={2099} />
              </FormField>
            </div>
            <FormField label="Регион">
              <input value={draft.region} onChange={e => setDraft({ ...draft, region: e.target.value })} placeholder="Омская область" />
            </FormField>
            <FormField label="Район">
              <input value={draft.district} onChange={e => setDraft({ ...draft, district: e.target.value })} placeholder="Тарский район" />
            </FormField>
            <FormField label="Юридический адрес">
              <input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} placeholder="644099, Омская обл., г. Омск, ул. Примерная, 1" />
            </FormField>
          </div>

          <div className="fp-edit-section">
            <div className="fp-edit-section-title">Руководитель</div>
            <div className="fp-form-grid">
              <FormField label="ФИО руководителя">
                <input value={draft.headName} onChange={e => setDraft({ ...draft, headName: e.target.value })} placeholder="Иванов Иван Иванович" />
              </FormField>
              <FormField label="Телефон">
                <input value={draft.headPhone} onChange={e => setDraft({ ...draft, headPhone: e.target.value })} placeholder="+7 (900) 000-00-00" />
              </FormField>
              <FormField label="Email">
                <input type="email" value={draft.headEmail} onChange={e => setDraft({ ...draft, headEmail: e.target.value })} placeholder="director@farm.ru" />
              </FormField>
            </div>
          </div>

          <div className="fp-edit-section">
            <div className="fp-edit-section-title">Производство</div>
            <div className="fp-form-grid">
              <FormField label="Основные культуры">
                <input value={draft.mainCrops} onChange={e => setDraft({ ...draft, mainCrops: e.target.value })} placeholder="Пшеница, ячмень, рапс" />
              </FormField>
              <FormField label="Площадь в обработке (га)">
                <input type="number" value={draft.totalArea} onChange={e => setDraft({ ...draft, totalArea: e.target.value })} placeholder="3500" />
              </FormField>
            </div>
            <FormField label="Дополнительно">
              <textarea rows={3} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Дополнительные сведения о хозяйстве..." />
            </FormField>
          </div>

          <div className="fp-edit-actions">
            <button className="admin-btn-secondary" onClick={handleCancel}><X size={15} /> Отмена</button>
            <button className="admin-btn-primary" onClick={handleSave}><Save size={15} /> Сохранить профиль</button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="fp-info-row">
      <span className="fp-info-label">{label}</span>
      <span className="fp-info-value">{icon && <span style={{ marginRight: 4 }}>{icon}</span>}{value}</span>
    </div>
  )
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="admin-form-row">
      <label>{label}{required && ' *'}</label>
      {children}
    </div>
  )
}
