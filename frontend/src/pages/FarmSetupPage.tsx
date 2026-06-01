import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { farmService } from '../services/farmService'

type Tab = 'create' | 'join'

export default function FarmSetupPage() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('create')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [farmName, setFarmName] = useState('')
  const [farmDesc, setFarmDesc] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const farm = await farmService.createFarm(farmName, farmDesc)
      await farmService.assignFarmToUser(farm.id)
      await refreshUser()
      setCreatedInviteCode(farm.inviteCode)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Ошибка при создании хозяйства')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const farm = await farmService.joinFarm(inviteCode.trim().toUpperCase())
      await farmService.assignFarmToUser(farm.id)
      await refreshUser()
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Хозяйство с таким кодом не найдено')
    } finally {
      setLoading(false)
    }
  }

  if (createdInviteCode) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--wide">
          <div className="auth-logo">
            <span className="auth-logo-icon">🌾</span>
            <span className="auth-logo-text">AgroMatrix</span>
          </div>
          <h1 className="auth-title" style={{ marginBottom: 4 }}>Хозяйство создано!</h1>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Поделитесь кодом приглашения с агрономами,<br />чтобы они могли войти в ваше хозяйство.
          </p>
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 12, padding: '20px 24px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Код приглашения</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 8, color: 'var(--color-primary)', fontFamily: 'monospace' }}>{createdInviteCode}</div>
          </div>
          <button className="auth-submit" onClick={() => navigate('/', { replace: true })}>
            Перейти в систему
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-logo">
          <span className="auth-logo-icon">🌾</span>
          <span className="auth-logo-text">AgroMatrix</span>
        </div>

        <h1 className="auth-title" style={{ marginBottom: 4 }}>Добро пожаловать!</h1>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
          Все данные в системе привязаны к хозяйству.<br />
          Создайте своё или вступите в существующее по коду приглашения.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--color-bg-secondary)', borderRadius: 10, padding: 4 }}>
          <button
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === 'create' ? '#fff' : 'transparent', color: tab === 'create' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, boxShadow: tab === 'create' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all .15s' }}
            onClick={() => setTab('create')}
            type="button"
          >
            Создать хозяйство
          </button>
          <button
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === 'join' ? '#fff' : 'transparent', color: tab === 'join' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, boxShadow: tab === 'join' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all .15s' }}
            onClick={() => setTab('join')}
            type="button"
          >
            Вступить по коду
          </button>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        {tab === 'create' && (
          <form className="auth-form" onSubmit={handleCreate}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Вы станете руководителем хозяйства. После создания получите код приглашения для добавления агрономов.
            </p>
            <div className="auth-field">
              <label className="auth-label">Название хозяйства</label>
              <input
                className="auth-input"
                value={farmName}
                onChange={e => setFarmName(e.target.value)}
                required
                placeholder="ООО «АгроПром»"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Описание (необязательно)</label>
              <input
                className="auth-input"
                value={farmDesc}
                onChange={e => setFarmDesc(e.target.value)}
                placeholder="Зерновое хозяйство, Омская область"
              />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать хозяйство'}
            </button>
          </form>
        )}

        {tab === 'join' && (
          <form className="auth-form" onSubmit={handleJoin}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Введите 8-значный код, который выдал вам руководитель хозяйства.
            </p>
            <div className="auth-field">
              <label className="auth-label">Код приглашения</label>
              <input
                className="auth-input"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                required
                placeholder="AB12CD34"
                maxLength={8}
                style={{ textTransform: 'uppercase', letterSpacing: 4, fontSize: 20, textAlign: 'center' }}
              />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Вступление...' : 'Вступить в хозяйство'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
