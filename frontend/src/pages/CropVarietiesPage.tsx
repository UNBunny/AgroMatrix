import { useState, useEffect } from 'react'
import { cropVarietyService, cropTypeService } from '../services/cropService'
import { diseaseResistanceService } from '../services/diseaseService'
import { CropVariety, CropVarietyRequest, CropType, ToleranceLevel } from '../types/CropTypes'
import { DiseaseResistance } from '../types/DiseaseTypes'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'

export default function CropVarietiesPage() {
  const [varieties, setVarieties] = useState<CropVariety[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [diseaseResistances, setDiseaseResistances] = useState<DiseaseResistance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CropVarietyRequest>({
    name: '',
    cropTypeId: 0,
    seedProducer: '',
    maturationDays: undefined,
    diseaseResistanceId: [],
    droughtTolerance: undefined,
    frostTolerance: undefined,
    recommendedSeedingRateKgPerHa: undefined,
    seedCostPerKg: undefined,
    isHybrid: false,
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [varietiesData, cropTypesData, resistancesData] = await Promise.all([
        cropVarietyService.getAll(),
        cropTypeService.getAll(),
        diseaseResistanceService.getAll()
      ])
      setVarieties(varietiesData)
      setCropTypes(cropTypesData)
      setDiseaseResistances(resistancesData)
      setError(null)
    } catch {
      setError('Ошибка при загрузке данных')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingId) {
        await cropVarietyService.update(editingId, formData)
      } else {
        await cropVarietyService.create(formData)
      }
      await loadData()
      handleCloseModal()
    } catch {
      setError('Ошибка при сохранении сорта')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (variety: CropVariety) => {
    setEditingId(variety.id)
    setFormData({
      name: variety.name,
      cropTypeId: variety.cropType?.id ?? 0,
      seedProducer: variety.seedProducer || '',
      maturationDays: variety.maturationDays,
      diseaseResistanceId: (variety.diseaseResistance ?? []).map((dr: any) => dr.id),
      droughtTolerance: variety.droughtTolerance,
      frostTolerance: variety.frostTolerance,
      recommendedSeedingRateKgPerHa: variety.recommendedSeedingRateKgPerHa,
      seedCostPerKg: variety.seedCostPerKg,
      isHybrid: variety.isHybrid || false,
      notes: variety.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот сорт?')) return
    
    try {
      setLoading(true)
      await cropVarietyService.delete(id)
      await loadData()
    } catch {
      setError('Ошибка при удалении сорта')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({
      name: '',
      cropTypeId: 0,
      seedProducer: '',
      maturationDays: undefined,
      diseaseResistanceId: [],
      droughtTolerance: undefined,
      frostTolerance: undefined,
      recommendedSeedingRateKgPerHa: undefined,
      seedCostPerKg: undefined,
      isHybrid: false,
      notes: ''
    })
  }

  const toggleResistance = (id: number) => {
    setFormData(prev => ({
      ...prev,
      diseaseResistanceId: prev.diseaseResistanceId.includes(id)
        ? prev.diseaseResistanceId.filter(rid => rid !== id)
        : [...prev.diseaseResistanceId, id]
    }))
  }

  const toleranceLevelLabels = {
    [ToleranceLevel.LOW]: 'Низкая',
    [ToleranceLevel.MEDIUM]: 'Средняя',
    [ToleranceLevel.HIGH]: 'Высокая',
    [ToleranceLevel.VERY_HIGH]: 'Очень высокая'
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🌾 Сорта культур</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Добавить сорт
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading && <div className="loading">Загрузка...</div>}

      <div className="grid-container">
        {varieties.map((variety) => (
          <div key={variety.id} className="card">
            <div className="card-header">
              <h3>{variety.name}</h3>
              <div className="card-actions">
                <button className="btn-icon" onClick={() => handleEdit(variety)}>
                  <Edit2 size={18} />
                </button>
                <button className="btn-icon" onClick={() => handleDelete(variety.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="card-body">
              <p><strong>Культура:</strong> {variety.cropType?.name ?? '—'}</p>
              {variety.seedProducer && <p><strong>Производитель:</strong> {variety.seedProducer}</p>}
              {variety.maturationDays && <p><strong>Дней до созревания:</strong> {variety.maturationDays}</p>}
              {variety.droughtTolerance && (
                <p><strong>Засухоустойчивость:</strong> {toleranceLevelLabels[variety.droughtTolerance]}</p>
              )}
              {variety.frostTolerance && (
                <p><strong>Морозостойкость:</strong> {toleranceLevelLabels[variety.frostTolerance]}</p>
              )}
              {variety.isHybrid && <p className="badge">Гибрид</p>}
              {variety.notes && <p className="notes">{variety.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Редактировать сорт' : 'Добавить сорт'}</h2>
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
                />
              </div>
              <div className="form-group">
                <label>Культура *</label>
                <select
                  value={formData.cropTypeId}
                  onChange={(e) => setFormData({ ...formData, cropTypeId: Number(e.target.value) })}
                  required
                >
                  <option value={0}>Выберите культуру</option>
                  {cropTypes.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Производитель семян</label>
                  <input
                    type="text"
                    value={formData.seedProducer}
                    onChange={(e) => setFormData({ ...formData, seedProducer: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Дней до созревания</label>
                  <input
                    type="number"
                    value={formData.maturationDays || ''}
                    onChange={(e) => setFormData({ ...formData, maturationDays: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Засухоустойчивость</label>
                  <select
                    value={formData.droughtTolerance || ''}
                    onChange={(e) => setFormData({ ...formData, droughtTolerance: e.target.value as ToleranceLevel || undefined })}
                  >
                    <option value="">Не указано</option>
                    {Object.values(ToleranceLevel).map(level => (
                      <option key={level} value={level}>{toleranceLevelLabels[level]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Морозостойкость</label>
                  <select
                    value={formData.frostTolerance || ''}
                    onChange={(e) => setFormData({ ...formData, frostTolerance: e.target.value as ToleranceLevel || undefined })}
                  >
                    <option value="">Не указано</option>
                    {Object.values(ToleranceLevel).map(level => (
                      <option key={level} value={level}>{toleranceLevelLabels[level]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Норма высева (кг/га)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.recommendedSeedingRateKgPerHa || ''}
                    onChange={(e) => setFormData({ ...formData, recommendedSeedingRateKgPerHa: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="form-group">
                  <label>Стоимость семян (руб/кг)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.seedCostPerKg || ''}
                    onChange={(e) => setFormData({ ...formData, seedCostPerKg: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isHybrid}
                    onChange={(e) => setFormData({ ...formData, isHybrid: e.target.checked })}
                  />
                  {' '}Гибрид
                </label>
              </div>
              <div className="form-group">
                <label>Устойчивость к заболеваниям</label>
                <div className="checkbox-group">
                  {diseaseResistances.map(dr => (
                    <label key={dr.id}>
                      <input
                        type="checkbox"
                        checked={formData.diseaseResistanceId.includes(dr.id)}
                        onChange={() => toggleResistance(dr.id)}
                      />
                      {' '}{dr.diseaseName} ({dr.resistanceLevel})
                    </label>
                  ))}
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
