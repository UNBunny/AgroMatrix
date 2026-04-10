import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Trash2, TrendingUp } from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { useFields } from '../hooks/useFields'
import { SearchInput } from '../components/ui/SearchInput'
import { getNdviBadge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { getFieldStatusLabel } from '../utils/fieldUtils'

const PAGE_SIZE = 10

export default function FieldsManagementPage() {
  const navigate = useNavigate()
  const { fields, ndviMap, loading, refetch } = useFields({ withNdvi: true })
  const [search, setSearch] = useState('')
  const [filterCrop, setFilterCrop] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(0)
  const [deleteId, setDeleteId] = useState<number | null>(null)


  const cropTypes = [...new Set(fields.map(f => f.crop_type).filter(Boolean))]
  const statuses = [...new Set(fields.map(f => f.status).filter(Boolean))]

  const filtered = fields.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.fieldName.toLowerCase().includes(q) || (f.crop_type || '').toLowerCase().includes(q)
    const matchCrop = !filterCrop || f.crop_type === filterCrop
    const matchStatus = !filterStatus || f.status === filterStatus
    return matchSearch && matchCrop && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleDelete = async () => {
    if (!deleteId) return
    await fieldService.deleteField(deleteId)
    await refetch()
    setDeleteId(null)
  }

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">Поля</h1>
        <button className="btn btn-primary" onClick={() => navigate('/fields/new')}>
          <Plus size={16} /> Добавить поле
        </button>
      </div>

      {/* Фильтры */}
      <div className="card card-padding mb-20">
        <div className="filter-row">
          <SearchInput
            value={search}
            onChange={v => { setSearch(v); setPage(0) }}
            placeholder="Поиск по названию или культуре..."
            className="form-control"
          />
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: 150 }}
            value={filterCrop}
            onChange={e => { setFilterCrop(e.target.value); setPage(0) }}
          >
            <option value="">Все культуры</option>
            {cropTypes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: 130 }}
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
          >
            <option value="">Все статусы</option>
            {statuses.map(s => <option key={s} value={s}>{getFieldStatusLabel(s)}</option>)}
          </select>
          {(search || filterCrop || filterStatus) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterCrop(''); setFilterStatus('') }}>
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 12 }} />
            <div className="empty-state-text">Загрузка полей...</div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🌾"
            title="Поля не найдены"
            text={search || filterCrop || filterStatus ? 'Измените условия поиска' : 'Создайте первое поле'}
            action={
              <button className="btn btn-primary" onClick={() => navigate('/fields/new')}>
                <Plus size={14} /> Добавить поле
              </button>
            }
          />
        ) : (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Культура</th>
                    <th>Статус</th>
                    <th>Площадь</th>
                    <th>Точек</th>
                    <th>NDVI</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.fieldName}</td>
                      <td>{f.crop_type || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                      <td>{getFieldStatusLabel(f.status)}</td>
                      <td>{f.areaHectares} га</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{f.coordinates.length}</td>
                      <td>{getNdviBadge(ndviMap[f.id])}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn-icon"
                            data-tooltip="Детали поля"
                            onClick={() => navigate(`/fields/${f.id}`)}
                          ><Eye size={14} /></button>
                          <button
                            className="btn-icon"
                            data-tooltip="Рекомендации"
                            onClick={() => navigate(`/recommendations?fieldId=${f.id}`)}
                          ><TrendingUp size={14} /></button>
                          <button
                            className="btn-icon danger"
                            data-tooltip="Удалить"
                            onClick={() => setDeleteId(f.id)}
                          ><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="pagination">
                <span>Показано {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} из {filtered.length}</span>
                <div className="pagination-controls">
                  <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`pagination-btn${page === i ? ' active' : ''}`}
                      onClick={() => setPage(i)}
                    >{i + 1}</button>
                  ))}
                  <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Удалить поле?"
        message="Это действие необратимо. Все данные о поле будут удалены."
        confirmLabel="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  )
}

