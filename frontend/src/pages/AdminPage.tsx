import { useEffect, useState } from 'react'
import { adminService, AdminUser, AdminFarm } from '../services/adminService'

type Tab = 'users' | 'farms'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [farms, setFarms] = useState<AdminFarm[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [tab])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      if (tab === 'users') {
        setUsers(await adminService.getUsers())
      } else {
        setFarms(await adminService.getFarms())
      }
    } catch {
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(id: number) {
    if (!confirm('Удалить пользователя?')) return
    await adminService.deleteUser(id)
    setUsers(u => u.filter(x => x.id !== id))
  }

  async function handleToggleActive(id: number) {
    const updated = await adminService.toggleActive(id)
    setUsers(u => u.map(x => x.id === id ? updated : x))
  }

  async function handleChangeRole(id: number, role: string) {
    const updated = await adminService.changeRole(id, role)
    setUsers(u => u.map(x => x.id === id ? updated : x))
  }

  async function handleDeleteFarm(id: number) {
    if (!confirm('Удалить хозяйство?')) return
    await adminService.deleteFarm(id)
    setFarms(f => f.filter(x => x.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Панель администратора</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'users' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            Пользователи
          </button>
          <button
            onClick={() => setTab('farms')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'farms' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            Хозяйства
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
        {loading && <div className="text-gray-500">Загрузка...</div>}

        {!loading && tab === 'users' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-gray-600">ID</th>
                  <th className="text-left p-3 text-gray-600">Пользователь</th>
                  <th className="text-left p-3 text-gray-600">Email</th>
                  <th className="text-left p-3 text-gray-600">Роль</th>
                  <th className="text-left p-3 text-gray-600">Статус</th>
                  <th className="text-left p-3 text-gray-600">Хозяйство</th>
                  <th className="text-left p-3 text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3 text-gray-400">{user.id}</td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{user.username}</div>
                      <div className="text-gray-400">{user.firstName} {user.lastName}</div>
                    </td>
                    <td className="p-3 text-gray-600">{user.email}</td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        onChange={e => handleChangeRole(user.id, e.target.value)}
                        disabled={user.role === 'ADMIN'}
                        className="text-xs border rounded px-2 py-1 bg-white"
                      >
                        <option value="AGRONOMIST">Агроном</option>
                        <option value="DIRECTOR">Директор</option>
                        <option value="ADMIN">Админ</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {user.isActive ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">{user.activeFarmId ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          disabled={user.role === 'ADMIN'}
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                        >
                          {user.isActive ? 'Блок.' : 'Разблок.'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.role === 'ADMIN'}
                          className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-40"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="p-6 text-center text-gray-400">Пользователей нет</div>}
          </div>
        )}

        {!loading && tab === 'farms' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-gray-600">ID</th>
                  <th className="text-left p-3 text-gray-600">Название</th>
                  <th className="text-left p-3 text-gray-600">ИНН</th>
                  <th className="text-left p-3 text-gray-600">Регион</th>
                  <th className="text-left p-3 text-gray-600">Владелец ID</th>
                  <th className="text-left p-3 text-gray-600">Invite-код</th>
                  <th className="text-left p-3 text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody>
                {farms.map(farm => (
                  <tr key={farm.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3 text-gray-400">{farm.id}</td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{farm.name}</div>
                      {farm.description && <div className="text-gray-400 text-xs">{farm.description}</div>}
                    </td>
                    <td className="p-3 text-gray-600">{farm.inn ?? '—'}</td>
                    <td className="p-3 text-gray-600">{farm.region ?? '—'}</td>
                    <td className="p-3 text-gray-400">{farm.ownerId}</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{farm.inviteCode}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteFarm(farm.id)}
                        className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {farms.length === 0 && <div className="p-6 text-center text-gray-400">Хозяйств нет</div>}
          </div>
        )}
      </div>
    </div>
  )
}
