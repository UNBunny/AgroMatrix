import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../services/authService'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organization: '',
    phone: '',
    role: 'AGRONOMIST' as UserRole,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    if (form.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    setLoading(true)
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        organization: form.organization || undefined,
        phone: form.phone || undefined,
        role: form.role,
      })
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Ошибка регистрации. Попробуйте ещё раз.'
      setError(msg)
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
        <h2 className="auth-title">Регистрация</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="username">Логин *</label>
              <input
                id="username" name="username" className="auth-input" type="text"
                value={form.username} onChange={handleChange}
                placeholder="Имя пользователя" autoComplete="username" required minLength={3}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email *</label>
              <input
                id="email" name="email" className="auth-input" type="email"
                value={form.email} onChange={handleChange}
                placeholder="example@mail.ru" autoComplete="email" required
              />
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Пароль *</label>
              <input
                id="password" name="password" className="auth-input" type="password"
                value={form.password} onChange={handleChange}
                placeholder="Минимум 6 символов" autoComplete="new-password" required minLength={6}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="confirmPassword">Подтверждение пароля *</label>
              <input
                id="confirmPassword" name="confirmPassword" className="auth-input" type="password"
                value={form.confirmPassword} onChange={handleChange}
                placeholder="Повторите пароль" autoComplete="new-password" required
              />
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="firstName">Имя</label>
              <input
                id="firstName" name="firstName" className="auth-input" type="text"
                value={form.firstName} onChange={handleChange} placeholder="Иван"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="lastName">Фамилия</label>
              <input
                id="lastName" name="lastName" className="auth-input" type="text"
                value={form.lastName} onChange={handleChange} placeholder="Иванов"
              />
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="organization">Организация</label>
              <input
                id="organization" name="organization" className="auth-input" type="text"
                value={form.organization} onChange={handleChange} placeholder="Название хозяйства"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="phone">Телефон</label>
              <input
                id="phone" name="phone" className="auth-input" type="tel"
                value={form.phone} onChange={handleChange} placeholder="+7 (900) 000-00-00"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="role">Роль</label>
            <select id="role" name="role" className="auth-input auth-select"
              value={form.role} onChange={handleChange}>
              <option value="AGRONOMIST">Агроном</option>
              <option value="DIRECTOR">Руководитель</option>
            </select>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-switch">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="auth-link">Войти</Link>
        </p>
      </div>
    </div>
  )
}
