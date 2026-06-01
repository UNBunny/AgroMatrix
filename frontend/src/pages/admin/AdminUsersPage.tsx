import { useState, useEffect, useMemo } from 'react'
import {
  Users, Plus, Edit2, UserX, UserCheck, X, Save, Search,
  AlertCircle, Building2, ShieldCheck,
} from 'lucide-react'
import {
  adminService,
  AdminUser,
  AdminFarm,
  CreateUserRequest,
  UpdateUserRequest,
} from '../../services/adminService'

type Role = 'AGRONOMIST' | 'DIRECTOR' | 'ADMIN'

const ROLE_LABELS: Record<Role, string> = {
  AGRONOMIST: 'Агроном',
  DIRECTOR: 'Директор',
  ADMIN: 'Администратор',
}

const ROLE_BADGE: Record<Role, string> = {
  AGRONOMIST: 'green',
  DIRECTOR: 'yellow',
  ADMIN: 'red',
}

const emptyCreate = (): CreateUserRequest => ({
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  role: 'AGRONOMIST',
  farmIds: [],
})

const emptyEdit = (): UpdateUserRequest => ({
  firstName: '',
  lastName: '',
  role: 'AGRONOMIST',
  farmIds: [],
})

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [farms, setFarms] = useState<AdminFarm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [farmFilter, setFarmFilter] = useState<number | ''>('')

  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserRequest>(emptyCreate())

  const [editModal, setEditModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<UpdateUserRequest>(emptyEdit())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [u, f] = await Promise.all([adminService.getUsers(), adminService.getFarms()])
      setUsers(u)
      setFarms(f)
    } catch {
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      if (roleFilter && u.role !== roleFilter) return false
      if (farmFilter !== '' && !u.farmIds.includes(Number(farmFilter))) return false
      if (q && !`${u.firstName} ${u.lastName} ${u.email} ${u.username}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [users, search, roleFilter, farmFilter])

  function openCreate() {
    setCreateForm(emptyCreate())
    setCreateModal(true)
  }

  function openEdit(user: AdminUser) {
    setEditId(user.id)
    setEditForm({ firstName: user.firstName, lastName: user.lastName, role: user.role, farmIds: [...user.farmIds] })
    setEditModal(true)
  }

  async function handleCreate() {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim() ||
        !createForm.username.trim() || !createForm.password.trim()) {
      setError('Заполните все обязательные поля')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await adminService.createUser(createForm)
      setUsers(prev => [...prev, created])
      setCreateModal(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Ошибка создания пользователя')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (editId === null) return
    setSaving(true)
    setError(null)
    try {
      const updated = await adminService.updateUser(editId, editForm)
      setUsers(prev => prev.map(u => u.id === editId ? updated : u))
      setEditModal(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Ошибка обновления пользователя')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: AdminUser) {
    if (user.role === 'ADMIN') return
    try {
      const updated = await adminService.toggleActive(user.id)
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
    } catch {
      setError('Ошибка изменения статуса')
    }
  }

  function toggleFarmInCreate(farmId: number) {
    setCreateForm(f => ({
      ...f,
      farmIds: f.farmIds.includes(farmId) ? f.farmIds.filter(id => id !== farmId) : [...f.farmIds, farmId],
    }))
  }

  function toggleFarmInEdit(farmId: number) {
    setEditForm(f => ({
      ...f,
      farmIds: (f.farmIds ?? []).includes(farmId)
        ? (f.farmIds ?? []).filter(id => id !== farmId)
        : [...(f.farmIds ?? []), farmId],
    }))
  }

  function farmName(id: number) {
    return farms.find(f => f.id === id)?.name ?? `#${id}`
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-title">
          <Users size={22} />
          <h1>Управление пользователями</h1>
        </div>
        <p className="admin-page-subtitle">
          Создание, редактирование, назначение хозяйств и деактивация пользователей
        </p>
      </div>

      {error && (
        <div className="admin-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="admin-tab-toolbar">
        <div className="admin-search-wrap">
          <Search size={14} className="admin-search-icon" />
          <input
            className="admin-search-input"
            placeholder="Поиск по ФИО, email, логину..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as Role | '')}
        >
          <option value="">Все роли</option>
          <option value="AGRONOMIST">Агроном</option>
          <option value="DIRECTOR">Директор</option>
          <option value="ADMIN">Администратор</option>
        </select>
        <select
          className="admin-filter-select"
          value={farmFilter}
          onChange={e => setFarmFilter(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">Все хозяйства</option>
          {farms.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <button className="admin-btn-primary" onClick={openCreate}>
          <Plus size={15} />
          Создать пользователя
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">Загрузка...</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email / Логин</th>
                <th>Роль</th>
                <th>Хозяйства</th>
                <th>Статус</th>
                <th>Зарегистрирован</th>
                <th className="admin-td-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="admin-td-muted">ID: {user.id}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{user.email}</div>
                    <div className="admin-td-muted">{user.username}</div>
                  </td>
                  <td>
                    <span className={`admin-badge ${ROLE_BADGE[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td>
                    {user.farmIds.length === 0 ? (
                      <span className="admin-td-muted">—</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {user.farmIds.map(fid => (
                          <span key={fid} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <Building2 size={11} style={{ color: 'var(--color-text-muted)' }} />
                            {farmName(fid)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`admin-badge ${user.isActive ? 'green' : 'gray'}`}>
                      {user.isActive ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="admin-td-muted">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="admin-td-actions">
                    <button
                      className="admin-icon-btn edit"
                      title="Редактировать"
                      onClick={() => openEdit(user)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="admin-icon-btn"
                      title={user.isActive ? 'Деактивировать' : 'Активировать'}
                      disabled={user.role === 'ADMIN'}
                      onClick={() => handleToggleActive(user)}
                      style={user.isActive
                        ? { color: 'var(--color-warning, #e67e22)' }
                        : { color: 'var(--color-primary, #2d7a45)' }
                      }
                    >
                      {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-table-empty">Пользователи не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== CREATE MODAL ===== */}
      {createModal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setCreateModal(false)}>
          <div className="admin-modal admin-modal-wide">
            <div className="admin-modal-header">
              <h3>Создать пользователя</h3>
              <button className="admin-modal-close" onClick={() => setCreateModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-form">
              {/* ФИО */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Личные данные
                </span>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Имя *</label>
                  <input
                    value={createForm.firstName}
                    onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Иван"
                  />
                </div>
                <div className="admin-form-row">
                  <label>Фамилия *</label>
                  <input
                    value={createForm.lastName}
                    onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Иванов"
                  />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="admin-form-row">
                  <label>Логин *</label>
                  <input
                    value={createForm.username}
                    onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="ivanov"
                  />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Пароль *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Не менее 8 символов"
                  />
                </div>
                <div className="admin-form-row">
                  <label>Роль *</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as Role }))}
                  >
                    <option value="AGRONOMIST">Агроном</option>
                    <option value="DIRECTOR">Директор</option>
                    <option value="ADMIN">Администратор</option>
                  </select>
                </div>
              </div>

              {/* Farm assignment */}
              <div className="admin-form-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} /> Назначить хозяйства
                </label>
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 160,
                  overflowY: 'auto',
                  background: 'var(--color-bg)',
                }}>
                  {farms.length === 0 && <span className="admin-td-muted">Хозяйства не найдены</span>}
                  {farms.map(farm => (
                    <label key={farm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={createForm.farmIds.includes(farm.id)}
                        onChange={() => toggleFarmInCreate(farm.id)}
                      />
                      <span>{farm.name}</span>
                      {farm.region && <span className="admin-td-muted">({farm.region})</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button className="admin-btn-secondary" onClick={() => setCreateModal(false)}>Отмена</button>
                <button className="admin-btn-primary" onClick={handleCreate} disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editModal && editId !== null && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(false)}>
          <div className="admin-modal admin-modal-wide">
            <div className="admin-modal-header">
              <h3>
                <ShieldCheck size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Редактировать пользователя
              </h3>
              <button className="admin-modal-close" onClick={() => setEditModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-form">
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Имя</label>
                  <input
                    value={editForm.firstName ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="admin-form-row">
                  <label>Фамилия</label>
                  <input
                    value={editForm.lastName ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <label>Роль</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                  disabled={users.find(u => u.id === editId)?.role === 'ADMIN'}
                >
                  <option value="AGRONOMIST">Агроном</option>
                  <option value="DIRECTOR">Директор</option>
                  <option value="ADMIN">Администратор</option>
                </select>
                {users.find(u => u.id === editId)?.role === 'ADMIN' && (
                  <span className="admin-td-muted" style={{ fontSize: 11, marginTop: 2 }}>
                    Роль ADMIN нельзя изменить
                  </span>
                )}
              </div>

              <div className="admin-form-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} /> Хозяйства
                </label>
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 160,
                  overflowY: 'auto',
                  background: 'var(--color-bg)',
                }}>
                  {farms.length === 0 && <span className="admin-td-muted">Хозяйства не найдены</span>}
                  {farms.map(farm => (
                    <label key={farm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={(editForm.farmIds ?? []).includes(farm.id)}
                        onChange={() => toggleFarmInEdit(farm.id)}
                      />
                      <span>{farm.name}</span>
                      {farm.region && <span className="admin-td-muted">({farm.region})</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button className="admin-btn-secondary" onClick={() => setEditModal(false)}>Отмена</button>
                <button className="admin-btn-primary" onClick={handleEdit} disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
