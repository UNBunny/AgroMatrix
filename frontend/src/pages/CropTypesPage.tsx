import { useState, useEffect } from 'react'
import { cropTypeService } from '../services/cropService'
import { CropType, CropTypeRequest } from '../types/CropTypes'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'

export default function CropTypesPage() {
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CropTypeRequest>({
    name: '',
    category: '',
    growingSeasonDays: undefined,
    optimalTemperatureMin: undefined,
    optimalTemperatureMax: undefined,
    waterRequirementsMm: undefined,
    notes: '',
    mlCropCode: ''
  })

  useEffect(() => {
    loadCropTypes()
  }, [])

  const loadCropTypes = async () => {
    try {
      setLoading(true)
      const data = await cropTypeService.getAll()
      setCropTypes(data)
      setError(null)
    } catch {
      setError('Ошибка при загрузке типов культур')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingId) {
        await cropTypeService.update(editingId, formData)
      } else {
        await cropTypeService.create(formData)
      }
      await loadCropTypes()
      handleCloseModal()
    } catch {
      setError('Ошибка при сохранении типа культуры')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (cropType: CropType) => {
    setEditingId(cropType.id)
    setFormData({
      name: cropType.name,
      category: cropType.category,
      growingSeasonDays: cropType.growingSeasonDays,
      optimalTemperatureMin: cropType.optimalTemperatureMin,
      optimalTemperatureMax: cropType.optimalTemperatureMax,
      waterRequirementsMm: cropType.waterRequirementsMm,
      notes: cropType.notes,
      mlCropCode: cropType.mlCropCode || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот тип культуры?')) return
    
    try {
      setLoading(true)
      await cropTypeService.delete(id)
      await loadCropTypes()
    } catch {
      setError('Ошибка при удалении типа культуры')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({
      name: '',
      category: '',
      growingSeasonDays: undefined,
      optimalTemperatureMin: undefined,
      optimalTemperatureMax: undefined,
      waterRequirementsMm: undefined,
      notes: '',
      mlCropCode: ''
    })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🌱 Типы культур</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Добавить тип культуры
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading && <div className="loading">Загрузка...</div>}

      <div className="grid-container">
        {cropTypes.map((cropType) => (
          <div key={cropType.id} className="card">
            <div className="card-header">
              <h3>{cropType.name}</h3>
              <div className="card-actions">
                <button className="btn-icon" onClick={() => handleEdit(cropType)}>
                  <Edit2 size={18} />
                </button>
                <button className="btn-icon" onClick={() => handleDelete(cropType.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="card-body">
              <p><strong>Категория:</strong> {cropType.category}</p>
              {cropType.growingSeasonDays && (
                <p><strong>Вегетационный период:</strong> {cropType.growingSeasonDays} дней</p>
              )}
              {cropType.optimalTemperatureMin && cropType.optimalTemperatureMax && (
                <p><strong>Температура:</strong> {cropType.optimalTemperatureMin}°C - {cropType.optimalTemperatureMax}°C</p>
              )}
              {cropType.waterRequirementsMm && (
                <p><strong>Требования к поливу:</strong> {cropType.waterRequirementsMm} мм</p>
              )}
              {cropType.mlCropCode && (
                <p><strong>ML-код:</strong> <code>{cropType.mlCropCode}</code></p>
              )}
              {cropType.notes && <p className="notes">{cropType.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Редактировать тип культуры' : 'Добавить тип культуры'}</h2>
              <button className="btn-icon" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label>Категория *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Выберите категорию</option>
                  <option value="Зерновые">Зерновые</option>
                  <option value="Бобовые">Бобовые</option>
                  <option value="Масличные">Масличные</option>
                  <option value="Овощные">Овощные</option>
                  <option value="Технические">Технические</option>
                </select>
              </div>
              <div className="form-group">
                <label>Вегетационный период (дни)</label>
                <input
                  type="number"
                  value={formData.growingSeasonDays || ''}
                  onChange={(e) => setFormData({ ...formData, growingSeasonDays: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Мин. температура (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.optimalTemperatureMin || ''}
                    onChange={(e) => setFormData({ ...formData, optimalTemperatureMin: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="form-group">
                  <label>Макс. температура (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.optimalTemperatureMax || ''}
                    onChange={(e) => setFormData({ ...formData, optimalTemperatureMax: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Требования к поливу (мм/сезон)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.waterRequirementsMm || ''}
                  onChange={(e) => setFormData({ ...formData, waterRequirementsMm: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ML-код культуры</label>
                  <input
                    type="text"
                    value={formData.mlCropCode || ''}
                    onChange={(e) => setFormData({ ...formData, mlCropCode: e.target.value })}
                    placeholder="spring_wheat, sunflower..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Заметки</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Save size={20} />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
