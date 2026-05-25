import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GATEWAY_URL } from '../services/api'

type Step = 'farm' | 'director' | 'done'

export default function RegisterFarmPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('farm')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  const [farm, setFarm] = useState({ name: '', description: '', inn: '', kpp: '', ogrn: '', region: '', address: '' })
  const [director, setDirector] = useState({ username: '', email: '', password: '', confirmPassword: '', firstName: '', lastName: '', phone: '' })

  function handleFarmChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFarm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }
  function handleDirectorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDirector(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleFarmSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!farm.inn.match(/^\d{10}$|^\d{12}$/)) { setError('ИНН должен содержать 10 или 12 цифр'); return }
    if (farm.kpp && !farm.kpp.match(/^\d{9}$/)) { setError('КПП должен содержать 9 цифр'); return }
    if (farm.ogrn && !farm.ogrn.match(/^\d{13}$|^\d{15}$/)) { setError('ОГРН должен содержать 13 или 15 цифр'); return }
    setStep('director')
  }

  async function handleDirectorSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (director.password !== director.confirmPassword) { setError('Пароли не совпадают'); return }
    setLoading(true)
    try {
      await axios.post(`${GATEWAY_URL}/api/auth/register`, {
        username: director.username, email: director.email, password: director.password,
        firstName: director.firstName, lastName: director.lastName,
        phone: director.phone || undefined, role: 'DIRECTOR',
      }, { withCredentials: true })

      await login({ username: director.username, password: director.password })

      const created = await axios.post<{ inviteCode: string; id: number }>(
        `${GATEWAY_URL}/api/farms`,
        { name: farm.name, description: farm.description || undefined,
          inn: farm.inn, kpp: farm.kpp || undefined, ogrn: farm.ogrn || undefined,
          region: farm.region, address: farm.address || undefined },
        { withCredentials: true }
      )

      await axios.post(`${GATEWAY_URL}/api/auth/assign-farm`, { farmId: created.data.id }, { withCredentials: true })

      await login({ username: director.username, password: director.password })
      setInviteCode(created.data.inviteCode)
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--wide">
          <div className="auth-logo">
            <span className="auth-logo-icon">🌾</span>
            <span className="auth-logo-text">AgroMatrix</span>
          </div>
          <h2 className="auth-title" style={{ marginBottom: 4 }}>Хозяйство зарегистрировано!</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
            Передайте код приглашения агрономам — по нему они создадут аккаунт и сразу попадут в ваше хозяйство.
          </p>
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 12, padding: '20px 24px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Код приглашения</div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 8, color: 'var(--color-primary)', fontFamily: 'monospace' }}>{inviteCode}</div>
          </div>
          <button className="auth-submit" onClick={() => navigate('/', { replace: true })}>
            Войти в систему
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
        <h2 className="auth-title" style={{ marginBottom: 4 }}>
          {step === 'farm' ? 'Регистрация хозяйства' : 'Данные руководителя'}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 20 }}>
          {step === 'farm' ? 'Шаг 1 из 2 — реквизиты организации' : 'Шаг 2 из 2 — учётная запись руководителя'}
        </p>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        {step === 'farm' && (
          <form className="auth-form" onSubmit={handleFarmSubmit}>
            <div className="auth-field">
              <label className="auth-label">Наименование организации *</label>
              <input className="auth-input" name="name" value={farm.name} onChange={handleFarmChange} required placeholder='ООО "АгроПром"' />
            </div>
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label">ИНН *</label>
                <input className="auth-input" name="inn" value={farm.inn} onChange={handleFarmChange} required placeholder="1234567890" maxLength={12} />
              </div>
              <div className="auth-field">
                <label className="auth-label">КПП</label>
                <input className="auth-input" name="kpp" value={farm.kpp} onChange={handleFarmChange} placeholder="123456789" maxLength={9} />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">ОГРН / ОГРНИП</label>
              <input className="auth-input" name="ogrn" value={farm.ogrn} onChange={handleFarmChange} placeholder="1234567890123" maxLength={15} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Регион *</label>
              <input className="auth-input" name="region" value={farm.region} onChange={handleFarmChange} required placeholder="Омская область" />
            </div>
            <div className="auth-field">
              <label className="auth-label">Адрес</label>
              <input className="auth-input" name="address" value={farm.address} onChange={handleFarmChange} placeholder="г. Омск, ул. Ленина, д. 1" />
            </div>
            <button className="auth-submit" type="submit">Далее →</button>
          </form>
        )}

        {step === 'director' && (
          <form className="auth-form" onSubmit={handleDirectorSubmit}>
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label">Имя *</label>
                <input className="auth-input" name="firstName" value={director.firstName} onChange={handleDirectorChange} required placeholder="Иван" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Фамилия *</label>
                <input className="auth-input" name="lastName" value={director.lastName} onChange={handleDirectorChange} required placeholder="Иванов" />
              </div>
            </div>
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label">Логин *</label>
                <input className="auth-input" name="username" value={director.username} onChange={handleDirectorChange} required minLength={3} placeholder="ivanov" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Email *</label>
                <input className="auth-input" type="email" name="email" value={director.email} onChange={handleDirectorChange} required placeholder="ivanov@farm.ru" />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">Телефон</label>
              <input className="auth-input" type="tel" name="phone" value={director.phone} onChange={handleDirectorChange} placeholder="+7 (900) 000-00-00" />
            </div>
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label">Пароль *</label>
                <input className="auth-input" type="password" name="password" value={director.password} onChange={handleDirectorChange} required minLength={6} placeholder="Минимум 6 символов" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Повторите пароль *</label>
                <input className="auth-input" type="password" name="confirmPassword" value={director.confirmPassword} onChange={handleDirectorChange} required placeholder="Повторите пароль" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={{ flex: '0 0 auto', padding: '11px 20px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setStep('farm'); setError('') }}>← Назад</button>
              <button className="auth-submit" type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Регистрация...' : 'Зарегистрировать'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 16 }}>
          <Link to="/login" className="auth-link">← Назад к входу</Link>
        </p>
      </div>
    </div>
  )
}
