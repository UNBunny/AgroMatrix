import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, Minus, RotateCcw } from 'lucide-react'
import { FieldMap, calculateFieldArea } from '../components/FieldMap'
import { fieldService } from '../services/fieldService'
import { cropTypeService } from '../services/cropService'
import { Stepper } from '../components/ui/Stepper'
import { CropType } from '../types/CropTypes'

// ───────────────────────────────────────
// Шаги wizard
// ───────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Нарисуйте поле' },
  { num: 2, label: 'Данные о поле' },
  { num: 3, label: 'Подтверждение' },
]


// ───────────────────────────────────────
// Главный компонент
// ───────────────────────────────────────
export default function FieldWizardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locState = location.state as { lat?: number; lng?: number; zoom?: number } | null
  const initialCenter: [number, number] = locState?.lat && locState?.lng
    ? [locState.lat, locState.lng]
    : [54.9924, 73.3686]
  const initialZoom = locState?.zoom ?? 10
  const [step, setStep] = useState(1)

  // Рисование
  const [isDrawing, setIsDrawing] = useState(false)
  const [polygon, setPolygon] = useState<number[][]>([])
  const [holes, setHoles] = useState<number[][][]>([])
  const [isCreatingHole, setIsCreatingHole] = useState(false)
  const [currentHole, setCurrentHole] = useState<number[][]>([])
  const [area, setArea] = useState(0)

  // Данные поля
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [fieldName, setFieldName] = useState('')
  const [cropType, setCropType] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [regionName, setRegionName] = useState<string | undefined>(undefined)
  const [regionCode, setRegionCode] = useState<string | undefined>(undefined)
  const [regionLoading, setRegionLoading] = useState(false)
  const [existingFields, setExistingFields] = useState<import('../types/Field').Field[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cropTypeService.getAll().then(setCropTypes).catch(() => {})
    fieldService.getAllFields().then(setExistingFields).catch(() => {})
  }, [])

  // Авторасчёт площади при каждом изменении полигона/дырок
  useEffect(() => {
    if (polygon.length >= 3) {
      const allHoles = [...holes, ...(isCreatingHole && currentHole.length >= 3 ? [currentHole] : [])]
      setArea(calculateFieldArea(polygon, allHoles))
    } else {
      setArea(0)
    }
  }, [polygon, holes, currentHole, isCreatingHole])

  // ── Обработчики рисования ──
  const handleStartDrawing = () => {
    setIsDrawing(true)
    setPolygon([])
    setHoles([])
    setIsCreatingHole(false)
    setCurrentHole([])
    setError(null)
  }

  const handleCancelDrawing = () => {
    setIsDrawing(false)
    setPolygon([])
    setHoles([])
    setIsCreatingHole(false)
    setCurrentHole([])
    setArea(0)
  }

  const handleUndoLastPoint = () => {
    if (isCreatingHole) {
      setCurrentHole(prev => prev.slice(0, -1))
    } else {
      setPolygon(prev => prev.slice(0, -1))
    }
  }

  const handleStartHole = () => {
    if (polygon.length >= 3) {
      setIsCreatingHole(true)
      setCurrentHole([])
      setError(null)
    } else {
      setError('Сначала нарисуйте основное поле (минимум 3 точки)')
    }
  }

  const handleFinishHole = () => {
    if (currentHole.length >= 3) {
      setHoles(prev => [...prev, currentHole])
      setCurrentHole([])
      setIsCreatingHole(false)
    } else {
      setError('Для отверстия нужно минимум 3 точки')
    }
  }

  const handleCancelHole = () => {
    setIsCreatingHole(false)
    setCurrentHole([])
  }

  const handleRemoveHole = (idx: number) => {
    setHoles(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Автоопределение региона по центроиду полигона ──
  const resolveRegion = async (coords: number[][]) => {
    if (coords.length < 3) return
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
    setRegionLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`,
        { headers: { 'User-Agent': 'AgroMatrix/1.0' } }
      )
      const data = await res.json()
      const addr = data.address || {}
      const name = addr.state || addr.province || addr.region || addr.county || ''
      if (name) {
        setRegionName(name)
        // Простой маппинг для типичных регионов РФ
        const codeMap: Record<string, string> = {
          'Омская область': 'OMS', 'Алтайский край': 'ALT', 'Новосибирская область': 'NVS',
          'Томская область': 'TMS', 'Кемеровская область': 'KEM', 'Красноярский край': 'KRS',
          'Иркутская область': 'IRK', 'Тюменская область': 'TYM', 'Курганская область': 'KRG',
          'Челябинская область': 'CHE', 'Оренбургская область': 'ORE', 'Самарская область': 'SAM',
          'Саратовская область': 'SAR', 'Волгоградская область': 'VLG', 'Ростовская область': 'ROS',
          'Краснодарский край': 'KRD', 'Ставропольский край': 'STA', 'Воронежская область': 'VOR',
          'Белгородская область': 'BEL', 'Липецкая область': 'LIP', 'Тамбовская область': 'TAM',
          'Пензенская область': 'PNZ', 'Ульяновская область': 'ULY', 'Башкортостан': 'BAS',
          'Татарстан': 'TAT', 'Республика Татарстан': 'TAT', 'Республика Башкортостан': 'BAS',
        }
        setRegionCode(codeMap[name] || 'OMS')
      }
    } catch {
      // тихо игнорируем — будет дефолт на бэкенде
    } finally {
      setRegionLoading(false)
    }
  }

  // ── Создание поля ──
  const handleCreate = async () => {
    if (!fieldName.trim()) { setError('Введите название поля'); return }
    setLoading(true); setError(null)
    try {
      await fieldService.createField({
        fieldName: fieldName.trim(),
        crop_type: cropType || 'Не указана',
        status,
        areaHectares: Math.round(area * 100) / 100,
        coordinates: polygon,
        holes: holes.length > 0 ? holes : undefined,
        regionName: regionName,
        regionCode: regionCode,
      })
      navigate('/fields')
    } catch {
      setError('Ошибка при создании поля')
    } finally { setLoading(false) }
  }

  // ── Подсказка режима ──
  const drawHint = isCreatingHole
    ? currentHole.length >= 3
      ? `🕳️ Отверстие: ${currentHole.length} точек. Нажмите «Готово» или добавьте ещё.`
      : `🕳️ Обозначьте границы отверстия (озеро, постройка). Добавлено: ${currentHole.length} точек`
    : !isDrawing
      ? '👆 Нажмите «Начать рисование» и кликайте на карте'
      : polygon.length < 3
        ? `📍 Добавлено точек: ${polygon.length}. Нужно минимум 3`
        : `✅ Поле: ${polygon.length} точек · ${area.toFixed(2)} га${holes.length ? ` · ${holes.length} отв.` : ''}`

  return (
    <div>
      <div className="page-header-bar mb-20">
        <h1 className="page-title">Создание нового поля</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/fields')}>
          <ChevronLeft size={14} /> Отмена
        </button>
      </div>

      <Stepper steps={STEPS} current={step} />

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {/* ═══════════════════════════════════════════
          ШАГ 1 — РИСОВАНИЕ
      ═══════════════════════════════════════════ */}
      {step === 1 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Панель инструментов */}
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            {/* Режим рисования / действия */}
            {!isDrawing ? (
              <button className="btn btn-primary btn-sm" onClick={handleStartDrawing}>
                ✏️ Начать рисование
              </button>
            ) : !isCreatingHole ? (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleUndoLastPoint} disabled={polygon.length === 0}>
                  <RotateCcw size={13} /> Отменить точку
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleStartHole}
                  disabled={polygon.length < 3}
                  title="Добавить отверстие (озеро, постройка)"
                >
                  <Minus size={13} /> Добавить отверстие
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleCancelDrawing}>
                  🗑️ Очистить
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 500 }}>
                  🕳️ Режим отверстия
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleFinishHole}
                  disabled={currentHole.length < 3}
                >
                  <Check size={13} /> Готово
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleUndoLastPoint} disabled={currentHole.length === 0}>
                  <RotateCcw size={13} /> Отменить точку
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleCancelHole}>
                  Отмена
                </button>
              </>
            )}

            {/* Площадь */}
            {area > 0 && (
              <div style={{
                marginLeft: 'auto',
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                padding: '5px 12px', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
              }}>
                📐 {area.toFixed(2)} га
              </div>
            )}
          </div>

          {/* Подсказка */}
          <div style={{
            padding: '7px 16px',
            background: isCreatingHole ? 'rgba(231,76,60,0.07)' : isDrawing ? 'rgba(45,122,69,0.06)' : 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 12, color: 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{drawHint}</span>
            {/* Список отверстий */}
            {holes.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {holes.map((_, i) => (
                  <span key={i} style={{
                    background: 'rgba(231,76,60,0.12)', color: '#c0392b',
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    🕳️ Отв. {i + 1}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', padding: 0, lineHeight: 1, fontSize: 12 }}
                      onClick={() => handleRemoveHole(i)}
                      title="Удалить отверстие"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Карта */}
          <div style={{ height: 500 }}>
            <FieldMap
              fields={existingFields}
              isDrawing={isDrawing}
              currentPolygon={polygon}
              onPolygonUpdate={setPolygon}
              currentHoles={holes}
              onHolesUpdate={setHoles}
              isCreatingHole={isCreatingHole}
              currentHole={currentHole}
              onHoleUpdate={setCurrentHole}
              initialCenter={initialCenter}
              initialZoom={initialZoom}
            />
          </div>

          {/* Нижняя кнопка */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {polygon.length >= 3 ? `${polygon.length} точек · перетащите для редактирования` : 'Кликайте на карту для добавления точек'}
            </span>
            <button
              className="btn btn-primary"
              disabled={polygon.length < 3}
              onClick={() => { setError(null); resolveRegion(polygon); setStep(2) }}
            >
              Далее <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ШАГ 2 — ДАННЫЕ О ПОЛЕ
      ═══════════════════════════════════════════ */}
      {step === 2 && (
        <div className="card card-padding" style={{ maxWidth: 580 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Название поля *</label>
              <input
                className="form-control"
                placeholder="Например: Северное поле"
                value={fieldName}
                onChange={e => setFieldName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Культура</label>
                <select className="form-control" value={cropType} onChange={e => setCropType(e.target.value)}>
                  <option value="">— Выберите культуру —</option>
                  {cropTypes.map(ct => <option key={ct.id} value={ct.name}>{ct.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Статус</label>
                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="ACTIVE">Активное</option>
                  <option value="FALLOW">Под паром</option>
                  <option value="PENDING">Планируется</option>
                  <option value="INACTIVE">Архив</option>
                </select>
              </div>
            </div>

            {/* Итого */}
            <div style={{
              background: 'var(--color-primary-light)',
              borderRadius: 8, padding: '12px 16px',
              display: 'flex', gap: 24, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Площадь</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-primary)' }}>{area.toFixed(2)} га</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Точек контура</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-primary)' }}>{polygon.length}</div>
              </div>
              {holes.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Отверстий</div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-primary)' }}>{holes.length}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Регион</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary)' }}>
                  {regionLoading ? '⏳ Определяется...' : regionName ? `📍 ${regionName}` : '—'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={14} /> Назад
            </button>
            <button
              className="btn btn-primary"
              disabled={!fieldName.trim()}
              onClick={() => { setError(null); setStep(3) }}
            >
              Далее <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ШАГ 3 — ПОДТВЕРЖДЕНИЕ
      ═══════════════════════════════════════════ */}
      {step === 3 && (
        <div className="card" style={{ overflow: 'hidden', maxWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Превью карты */}
            <div style={{ height: 300 }}>
              <FieldMap
                fields={existingFields}
                isDrawing={false}
                currentPolygon={polygon}
                onPolygonUpdate={() => {}}
                currentHoles={holes}
                isCreatingHole={false}
                currentHole={[]}
                initialCenter={polygon.length > 0
                  ? [
                      polygon.reduce((s, c) => s + c[1], 0) / polygon.length,
                      polygon.reduce((s, c) => s + c[0], 0) / polygon.length,
                    ] as [number, number]
                  : initialCenter}
                initialZoom={15}
              />
            </div>

            {/* Итоговые данные */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-primary)', marginBottom: 4 }}>
                ✅ {fieldName}
              </div>
              {[
                ['🌱 Культура', cropType || 'Не указана'],
                ['📋 Статус', status],
                ['📐 Площадь', `${area.toFixed(2)} га`],
                ['📍 Точек контура', String(polygon.length)],
                ...(holes.length > 0 ? [['🕳️ Отверстий', String(holes.length)]] : []),
                ['🗺️ Регион', regionName || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '1px solid var(--color-border)',
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              <ChevronLeft size={14} /> Назад
            </button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Создание...</>
                : <><Check size={14} /> Создать поле</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

