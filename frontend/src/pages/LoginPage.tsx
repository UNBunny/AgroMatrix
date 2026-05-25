import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ username, password })
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Ошибка входа. Проверьте логин и пароль.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🌾</span>
          <span className="auth-logo-text">AgroMatrix</span>
        </div>
        <h2 className="auth-title">Вход в систему</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              className="auth-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Введите логин"
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Пароль</label>
            <input
              id="password"
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Введите пароль"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/join" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: 14, padding: '11px 0', borderRadius: 8 }}>
            Войти по коду приглашения
          </Link>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
            <Link to="/register-farm" className="auth-link">Зарегистрировать хозяйство</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
