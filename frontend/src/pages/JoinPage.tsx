import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { farmService, FarmResponse } from '../services/farmService'
import axios from 'axios'
import { GATEWAY_URL } from '../services/api'

type Step = 'code' | 'profile'

export default function JoinPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('code')
  const [farm, setFarm] = useState<FarmResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', firstName: '', lastName: '', phone: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleCheckCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const f = await farmService.joinFarm(inviteCode.trim().toUpperCase())
      setFarm(f)
      setStep('profile')
    } catch (err: any) {
      setError('Хозяйство с таким кодом не найдено')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Пароли не совпадают'); return }
    setLoading(true)
    try {
      await axios.post(
        `${GATEWAY_URL}/api/auth/join?farmId=${farm!.id}`,
        { inviteCode: inviteCode.trim().toUpperCase(), username: form.username, email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined },
        { withCredentials: true }
      )
      await login({ username: form.username, password: form.password })
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-logo">
          <span className="auth-logo-icon">🌾</span>
          <span className="auth-logo-text">AgroMatrix</span>
        </div>

        {step === 'code' && (
          <>
            <h2 className="auth-title" style={{ marginBottom: 4 }}>Войти по коду</h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Введите код приглашения, который выдал руководитель хозяйства
            </p>
            <form className="auth-form" onSubmit={handleCheckCode}>
              <div className="auth-field">
                <label className="auth-label">Код приглашения</label>
                <input
                  className="auth-input"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  required maxLength={8} placeholder="AB12CD34"
                  style={{ textTransform: 'uppercase', letterSpacing: 6, fontSize: 22, textAlign: 'center' }}
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Проверка...' : 'Продолжить'}
              </button>
            </form>
          </>
        )}

        {step === 'profile' && farm && (
          <>
            <h2 className="auth-title" style={{ marginBottom: 4 }}>Ваши данные</h2>
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 14, textAlign: 'center' }}>
              Хозяйство: <strong>{farm.name}</strong>
              {farm.region && <span style={{ color: 'var(--color-text-secondary)' }}> · {farm.region}</span>}
            </div>
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">Имя *</label>
                  <input className="auth-input" name="firstName" value={form.firstName} onChange={handleChange} required placeholder="Иван" />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Фамилия *</label>
                  <input className="auth-input" name="lastName" value={form.lastName} onChange={handleChange} required placeholder="Иванов" />
                </div>
              </div>
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">Логин *</label>
                  <input className="auth-input" name="username" value={form.username} onChange={handleChange} required minLength={3} placeholder="ivanov" />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Email *</label>
                  <input className="auth-input" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="ivanov@mail.ru" />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label">Телефон</label>
                <input className="auth-input" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+7 (900) 000-00-00" />
              </div>
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">Пароль *</label>
                  <input className="auth-input" type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="Минимум 6 символов" />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Повторите пароль *</label>
                  <input className="auth-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="Повторите пароль" />
                </div>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Регистрация...' : 'Создать аккаунт и войти'}
              </button>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, marginTop: 4, width: '100%' }} onClick={() => { setStep('code'); setError('') }}>
                ← Изменить код
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 16 }}>
          <Link to="/login" className="auth-link">← Назад к входу</Link>
        </p>
      </div>
    </div>
  )
}
