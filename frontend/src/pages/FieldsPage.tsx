import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FieldMap, calculateFieldArea } from '../components/FieldMap'
import FieldForm from '../components/FieldForm'
import FieldList from '../components/FieldList'
import NdviPanel from '../components/NdviPanel'
import WeatherWidget from '../components/weather/WeatherWidget'
import { Field } from '../types/Field'
import { fieldService } from '../services/fieldService'
import { ndviService } from '../services/ndviService'

const FieldsPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [fields, setFields] = useState<Field[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState<number[][]>([])
  const [currentArea, setCurrentArea] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<Field | null>(null)
  const [ndviColors, setNdviColors] = useState<Record<number, number | null>>({})
  const [currentHoles, setCurrentHoles] = useState<number[][][]>([])
  const [isCreatingHole, setIsCreatingHole] = useState(false)
  const [currentHole, setCurrentHole] = useState<number[][]>([])

  useEffect(() => { loadFields() }, [])

  useEffect(() => {
    if (currentPolygon.length >= 3) {
      const allHoles = [...currentHoles]
      if (currentHole.length >= 3) allHoles.push(currentHole)
      setCurrentArea(calculateFieldArea(currentPolygon, allHoles))
    } else {
      setCurrentArea(0)
    }
  }, [currentPolygon, currentHoles, currentHole])

  useEffect(() => {
    if (fields.length === 0) return
    const loadNdvi = async () => {
      const entries: Record<number, number | null> = {}
      await Promise.allSettled(fields.map(async (f) => {
        try { const r = await ndviService.getCurrentNdvi(f.id); entries[f.id] = r.mean }
        catch { entries[f.id] = null }
      }))
      setNdviColors(entries)
    }
    loadNdvi()
  }, [fields])

  const loadFields = async () => {
    try {
      setLoading(true)
      setFields(await fieldService.getAllFields())
      setError(null)
    } catch { setError('Ошибка при загрузке полей') }
    finally { setLoading(false) }
  }

  const handleCreateField = async (fieldName: string, cropType: string, status: string) => {
    if (currentPolygon.length < 3) { setError('Выделите область на карте (минимум 3 точки)'); return }
    try {
      setLoading(true)
      const calculatedArea = calculateFieldArea(currentPolygon, currentHoles)
      const newField = await fieldService.createField({
        fieldName, crop_type: cropType, status,
        areaHectares: Math.round(calculatedArea * 100) / 100,
        coordinates: currentPolygon,
        holes: currentHoles.length > 0 ? currentHoles : undefined,
      })
      setFields(prev => [newField, ...prev])
      setCurrentPolygon([]); setCurrentHoles([])
      setIsDrawing(false); setIsCreatingHole(false); setCurrentHole([])
      setError(null); setActiveTab('list')
    } catch { setError('Ошибка при создании поля') }
    finally { setLoading(false) }
  }

  const handleStartDrawing = () => {
    setIsDrawing(true); setCurrentPolygon([]); setCurrentArea(0)
    setCurrentHoles([]); setIsCreatingHole(false); setCurrentHole([]); setError(null)
  }
  const handleCancelDrawing = () => {
    setIsDrawing(false); setIsCreatingHole(false)
    setCurrentPolygon([]); setCurrentArea(0); setCurrentHoles([]); setCurrentHole([])
  }
  const handleStartCreatingHole = () => {
    if (currentPolygon.length >= 3) { setIsCreatingHole(true); setCurrentHole([]); setError(null) }
    else setError('Сначала создайте основное поле')
  }
  const handleFinishCreatingHole = () => {
    if (currentHole.length >= 3) { setCurrentHoles(prev => [...prev, currentHole]); setCurrentHole([]); setIsCreatingHole(false) }
  }
  const handleCancelCreatingHole = () => { setIsCreatingHole(false); setCurrentHole([]) }

  const handleCreateClick = () => { setActiveTab('create'); handleStartDrawing(); setSelectedField(null) }
  const handleFieldClick = (field: Field) => setSelectedField(prev => prev?.id === field.id ? null : field)

  return (
    <div>
      {/* ── Заголовок ── */}
      <div className="page-header-bar mb-20">
        <h1 className="page-title">
          {activeTab === 'list' ? 'Поля' : '✏️ Создание поля'}
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'list' ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/fields/new')}>
                🧭 Полный Wizard
              </button>
              <button className="btn btn-primary" onClick={handleCreateClick}>
                + Создать поле
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={() => { setActiveTab('list'); handleCancelDrawing() }}>
              ← К списку полей
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ═══════════ ВИД СПИСКА ═══════════ */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Карта + NDVI-панель */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', height: 480 }}>
              {/* Карта */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <FieldMap
                  fields={fields}
                  isDrawing={false}
                  currentPolygon={[]}
                  onPolygonUpdate={() => {}}
                  ndviColors={ndviColors}
                  onFieldClick={handleFieldClick}
                  selectedField={selectedField}
                />
              </div>

              {/* NDVI-панель справа при выбранном поле */}
              {selectedField && (
                <div style={{
                  width: 380, flexShrink: 0,
                  borderLeft: '1px solid var(--color-border)',
                  overflowY: 'auto',
                }}>
                  <NdviPanel field={selectedField} />
                </div>
              )}
            </div>

            {/* Подсказка */}
            {!selectedField && fields.length > 0 && (
              <div style={{
                padding: '8px 16px',
                background: 'var(--color-primary-light)',
                borderTop: '1px solid var(--color-primary-medium)',
                fontSize: 12, color: 'var(--color-primary)',
                textAlign: 'center',
              }}>
                🌿 Кликните на поле на карте, чтобы увидеть данные NDVI и погоду
              </div>
            )}
          </div>

          {/* Погода для выбранного поля */}
          {selectedField && (() => {
            const coords = selectedField.coordinates
            const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
            const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length
            return (
              <WeatherWidget
                lat={lat}
                lon={lon}
                title={`🌤️ Погода — ${selectedField.fieldName}`}
              />
            )
          })()}

          {/* Список полей */}
          <div className="card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 14 }}>
              📋 Все поля ({fields.length})
            </div>
            <FieldList fields={fields} loading={loading} />
          </div>
        </div>
      )}

      {/* ═══════════ ВИД СОЗДАНИЯ ═══════════ */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: 'calc(100vh - 180px)', minHeight: 500 }}>
          {/* Форма слева */}
          <div className="card card-padding" style={{ overflow: 'auto' }}>
            {/* Площадь — авторасчёт */}
            {currentArea > 0 && (
              <div style={{
                background: 'var(--color-primary-light)',
                borderRadius: 8, padding: '10px 14px',
                marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>📐 Площадь</span>
                <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-primary)' }}>
                  {currentArea.toFixed(2)} га
                </span>
              </div>
            )}
            {currentHoles.length > 0 && (
              <div style={{
                background: 'rgba(231,76,60,0.08)', borderRadius: 8, padding: '8px 14px',
                marginBottom: 16, fontSize: 12, color: '#c0392b',
              }}>
                🕳️ Отверстий: {currentHoles.length} (площадь уже вычтена)
              </div>
            )}
            <FieldForm
              onCreateField={handleCreateField}
              onStartDrawing={handleStartDrawing}
              onCancelDrawing={handleCancelDrawing}
              isDrawing={isDrawing}
              hasPolygon={currentPolygon.length >= 3}
              currentArea={currentArea}
              loading={loading}
              onStartCreatingHole={handleStartCreatingHole}
              onFinishCreatingHole={handleFinishCreatingHole}
              onCancelCreatingHole={handleCancelCreatingHole}
              isCreatingHole={isCreatingHole}
              hasHole={currentHole.length >= 3}
              holesCount={currentHoles.length}
            />
          </div>

          {/* Карта справа */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Статус бар над картой */}
            <div style={{
              padding: '8px 14px',
              borderBottom: '1px solid var(--color-border)',
              background: isCreatingHole ? 'rgba(231,76,60,0.07)' : isDrawing ? 'rgba(45,122,69,0.07)' : 'var(--color-bg)',
              fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                {isCreatingHole
                  ? `🕳️ Рисуйте отверстие · ${currentHole.length} точек`
                  : isDrawing
                    ? currentPolygon.length < 3
                      ? `📍 Кликайте на карту · ${currentPolygon.length} точек`
                      : `✅ ${currentPolygon.length} точек · перетащите для редактирования`
                    : '👁 Просмотр полей'}
              </span>
              {currentArea > 0 && (
                <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 13 }}>
                  {currentArea.toFixed(2)} га
                </span>
              )}
            </div>
            <div style={{ height: 'calc(100% - 37px)' }}>
              <FieldMap
                fields={fields}
                isDrawing={isDrawing}
                currentPolygon={currentPolygon}
                onPolygonUpdate={setCurrentPolygon}
                currentHoles={currentHoles}
                onHolesUpdate={setCurrentHoles}
                isCreatingHole={isCreatingHole}
                currentHole={currentHole}
                onHoleUpdate={setCurrentHole}
                ndviColors={ndviColors}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FieldsPage
