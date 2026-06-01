import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Polygon } from 'react-leaflet'
import L from 'leaflet'
import { Layers, BarChart2, AlertTriangle, ArrowRight, TrendingUp, ShieldAlert, Eye, Plus } from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { ndviService, getNdviColor } from '../services/ndviService'
import { yieldService, priceService, PriceResponse } from '../services/mlService'
import { Field } from '../types/Field'
import { StatCard } from '../components/ui/StatCard'
import { getNdviBadge } from '../components/ui/Badge'
import WeatherWidget from '../components/weather/WeatherWidget'
import 'leaflet/dist/leaflet.css'

// Карта с авто-зумом
function FieldsMap({ fields, ndviMap, lastFieldId, onFieldClick }: {
  fields: Field[]
  ndviMap: Record<number, number | null>
  lastFieldId?: number
  onFieldClick?: (f: Field) => void
}) {
  const [mapRef, setMapRef] = useState<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef || fields.length === 0) return
    const target = lastFieldId ? fields.find(f => f.id === lastFieldId) : null
    const pts = (target ? target.coordinates : fields.flatMap(f => f.coordinates)).map(c => L.latLng(c[1], c[0]))
    if (pts.length === 0) return
    try { mapRef.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 14 }) }
    catch { /* ignore */ }
  }, [mapRef, fields, lastFieldId])

  return (
    <MapContainer
      center={[54.9924, 73.3686]}
      zoom={9}
      style={{ height: '100%', width: '100%' }}
      ref={(m) => { if (m) setMapRef(m) }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={20} />
      {fields.map(f => {
        const color = getNdviColor(ndviMap[f.id])
        const main = f.coordinates.map(c => [c[1], c[0]] as [number, number])
        // Поддержка дыр: если есть holes, передаём массив массивов
        const positions: [number, number][] | [number, number][][] =
          f.holes && f.holes.length > 0
            ? [main, ...f.holes.map(h => h.map(c => [c[1], c[0]] as [number, number]))]
            : main

        const isLast = f.id === lastFieldId
        return (
          <Polygon
            key={f.id}
            positions={positions as any}
            pathOptions={{
              fillColor: color, fillOpacity: isLast ? 0.7 : 0.45,
              color: isLast ? '#ffffff' : color, weight: isLast ? 3 : 1.5,
            }}
            eventHandlers={onFieldClick ? { click: () => onFieldClick(f) } : undefined}
          />
        )
      })}
    </MapContainer>
  )
}

function getFieldCentroid(field: Field): [number, number] {
  const coords = field.coordinates
  if (!coords || coords.length === 0) return [54.9924, 73.3686]
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
  const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length
  return [lat, lon]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [fields, setFields] = useState<Field[]>([])
  const [ndviMap, setNdviMap] = useState<Record<number, number | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fieldService.getAllFields().then(async data => {
      setFields(data)
      const entries: Record<number, number | null> = {}
      await Promise.allSettled(data.map(async f => {
        try { const r = await ndviService.getCurrentNdvi(f.id); entries[f.id] = r.mean }
        catch { entries[f.id] = null }
      }))
      setNdviMap(entries)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalArea = fields.reduce((s, f) => s + (f.areaHectares || 0), 0)
  const ndviValues = Object.values(ndviMap).filter(v => v !== null) as number[]
  const avgNdvi = ndviValues.length ? ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length : null
  const cropTypes = new Set(fields.map(f => f.crop_type).filter(Boolean))
  const alerts = fields.filter(f => {
    const v = ndviMap[f.id]
    return v !== null && v !== undefined && v < 0.3
  })

  const lastField = fields.length > 0 ? fields.reduce((a, b) => b.id > a.id ? b : a) : null
  const [weatherLat, weatherLon] = lastField ? getFieldCentroid(lastField) : [54.9924, 73.3686]

  if (!loading && fields.length === 0) {
    return (
      <div>
        <div className="page-header-bar">
          <h1 className="page-title">Дашборд</h1>
        </div>
        <div className="card card-padding" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌾</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Добро пожаловать в AgroMatrix!</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto 24px' }}>
            Добавьте первое поле, чтобы начать мониторинг NDVI, получать прогнозы болезней и рекомендации по севообороту.
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/fields/new')} style={{ fontSize: 15, padding: '10px 28px' }}>
            <Plus size={16} /> Добавить первое поле
          </button>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            <span>📍 Нарисуйте контур на карте</span>
            <span>📊 Получайте NDVI</span>
            <span>🧐 ML-прогноз болезней</span>
            <span>🌾 Севооборот</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Заголовок */}
      <div className="page-header-bar">
        <h1 className="page-title">Дашборд</h1>
        {loading && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Загрузка...</span>}
      </div>

      {/* ── Стат-карточки ── */}
      <div className="grid-4 mb-20">
        <StatCard
          icon={<Layers size={18} />}
          value={fields.length}
          label="Всего полей"
          iconColor="green"
        />
        <StatCard
          icon="🗺️"
          value={`${totalArea.toFixed(1)} га`}
          label="Общая площадь"
          iconColor="blue"
        />
        <StatCard
          icon={<BarChart2 size={18} />}
          value={avgNdvi !== null ? avgNdvi.toFixed(2) : '—'}
          label="Средний NDVI"
          iconColor={avgNdvi !== null && avgNdvi < 0.3 ? 'red' : avgNdvi !== null && avgNdvi < 0.5 ? 'orange' : 'green'}
          subtitle={avgNdvi !== null
            ? avgNdvi >= 0.5 ? 'Хорошее состояние' : avgNdvi >= 0.3 ? 'Умеренное' : 'Требует внимания'
            : undefined}
        />
        <StatCard
          icon={<ShieldAlert size={18} />}
          value={alerts.length}
          label="Требуют внимания"
          iconColor={alerts.length > 0 ? 'red' : 'green'}
          subtitle={alerts.length > 0 ? 'NDVI < 0.3' : 'Все поля в норме'}
        />
      </div>

      {/* ── Карта + Тревоги ── */}
      <div className="grid-2 mb-20">
        {/* Мини-карта с поддержкой дыр */}
        <div className="card dashboard-map-wrap" style={{ overflow: 'hidden', minHeight: 280 }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>🗺️ Карта полей</span>
              {lastField && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  последнее: {lastField.fieldName}
                </span>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/map')}>
              Открыть <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ height: 280 }}>
            <FieldsMap
              fields={fields}
              ndviMap={ndviMap}
              lastFieldId={lastField?.id}
              onFieldClick={() => navigate('/map')}
            />
          </div>
        </div>

        {/* Тревоги NDVI */}
        <div className="card card-padding" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={16} color="var(--color-danger)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Требуют внимания</span>
            {alerts.length > 0 && (
              <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{alerts.length}</span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0', flex: 1 }}>
              <div className="empty-state-icon" style={{ fontSize: 28 }}>✅</div>
              <div className="empty-state-title">Всё в порядке</div>
              <div className="empty-state-text">Нет полей с критическим NDVI</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {alerts.map(f => (
                <div
                  key={f.id}
                  onClick={() => navigate(`/ndvi?fieldId=${f.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.fieldName}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {f.crop_type || 'Культура не указана'} · {f.areaHectares} га
                    </div>
                  </div>
                  {getNdviBadge(ndviMap[f.id])}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Прогноз погоды на 14 дней ── */}
      <div className="mb-20">
        <WeatherWidget
          lat={weatherLat}
          lon={weatherLon}
          title={lastField ? `🌤️ Погода — ${lastField.fieldName}` : '🌤️ Прогноз погоды на 14 дней'}
        />
      </div>

      {/* ── ML Аналитика ── */}
      <ForecastWidgets navigate={navigate} fields={fields} />

      {/* ── Тревожные поля (топ-5) ── */}
      <div className="card">
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>⚠️ Поля, требующие внимания</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/fields')}>
            Все поля <ArrowRight size={12} />
          </button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Культура</th>
                <th>Площадь</th>
                <th>NDVI</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                    ✅ Все поля в норме
                  </td>
                </tr>
              )}
              {alerts.slice(0, 5).map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => navigate(`/fields/${f.id}`)}>{f.fieldName}</td>
                  <td>{f.crop_type || '—'}</td>
                  <td>{f.areaHectares} га</td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── ML Forecast Widgets ──────────────────────────────────────────────────────

const CROP_NAME_TO_ML_CODE: Record<string, string> = {
  'Пшеница яровая': 'spring_wheat',
  'Пшеница озимая': 'winter_wheat',
  'Ячмень яровой': 'spring_barley',
  'Ячмень': 'spring_barley',
  'Кукуруза': 'corn',
  'Подсолнечник': 'sunflower',
  'Соя': 'soybean',
  'Рапс': 'rapeseed',
  'Горох': 'peas',
  'Гречиха': 'buckwheat',
  'Лён': 'flax',
  'Лён масличный': 'flax',
  'Рожь': 'rye',
  'Овёс': 'oat',
  'Просо': 'millet',
}

function ForecastWidgets({ navigate, fields }: { navigate: (path: string) => void; fields: Field[] }) {
  type RegionForecasts = { regionCode: string; regionName: string; items: Array<{ crop: string; displayName: string; yield: number }> }
  const [regionForecasts, setRegionForecasts] = useState<RegionForecasts[]>([])
  const [prices, setPrices] = useState<PriceResponse[]>([])
  const [mlLoading, setMlLoading] = useState(true)
  const [activeRegion, setActiveRegion] = useState(0)

  // Сбираем уникальные регионы из полей пользователя
  const regions: Array<{ code: string; name: string; crops: string[] }> = []
  const seenCodes = new Set<string>()
  for (const f of fields) {
    const code = f.regionCode || 'OMS'
    const name = f.regionName || 'Омская область'
    if (!seenCodes.has(code)) {
      seenCodes.add(code)
      regions.push({ code, name, crops: [] })
    }
    if (f.crop_type) {
      const r = regions.find(r => r.code === code)!
      if (!r.crops.includes(f.crop_type)) r.crops.push(f.crop_type)
    }
  }
  if (regions.length === 0) regions.push({ code: 'OMS', name: 'Омская область', crops: ['Пшеница яровая', 'Ячмень яровой', 'Подсолнечник'] })

  // Для виджета цен: первый регион
  const priceRegion = regions[0]
  const priceCropNames = priceRegion.crops.length > 0 ? priceRegion.crops.slice(0, 4) : ['Пшеница яровая', 'Ячмень яровой', 'Подсолнечник', 'Кукуруза']
  const priceCrops = priceCropNames.map(n => CROP_NAME_TO_ML_CODE[n] || n)

  useEffect(() => {
    if (fields.length === 0) return
    const load = async () => {
      try {
        const currentYear = new Date().getFullYear()

        // Прогноз урожайности по каждому региону и его культурам
        const regionResults = await Promise.all(
          regions.map(async region => {
            const cropNames = region.crops.length > 0 ? region.crops.slice(0, 4) : ['Пшеница яровая', 'Ячмень яровой', 'Подсолнечник']
            const results = await Promise.allSettled(
              cropNames.map(name => {
                const code = CROP_NAME_TO_ML_CODE[name] || name
                return yieldService.predict({ region_code: region.code, crop: code, year: currentYear })
                  .then(r => ({ crop: code, displayName: name, yield: r.predicted_yield_centners_per_ha }))
              })
            )
            return {
              regionCode: region.code,
              regionName: region.name,
              items: results
                .filter((r): r is PromiseFulfilledResult<{ crop: string; displayName: string; yield: number }> => r.status === 'fulfilled')
                .map(r => r.value),
            }
          })
        )
        setRegionForecasts(regionResults.filter(r => r.items.length > 0))

        // Цены только первый регион
        const priceResults = await Promise.allSettled(
          priceCrops.map((crop, idx) =>
            priceService.predict({ region: priceRegion.name, crop, year: currentYear, month: 8 })
              .then(r => ({ ...r, displayName: priceCropNames[idx] }))
          )
        )
        setPrices(
          priceResults
            .filter((r): r is PromiseFulfilledResult<PriceResponse & { displayName: string }> => r.status === 'fulfilled')
            .map(r => r.value)
        )
      } catch { /* ignore */ }
      setMlLoading(false)
    }
    load()
  }, [fields])

  if (mlLoading) return null

  const currentYear = new Date().getFullYear()
  const activeData = regionForecasts[activeRegion] ?? regionForecasts[0]

  return (
    <div className="grid-2 mb-20">
      {/* Прогноз урожайности */}
      <div className="card card-padding" style={{ minHeight: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingUp size={16} color="#27ae60" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Прогноз урожайности ({currentYear})</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/recommendations')}>
            Подробнее <ArrowRight size={12} />
          </button>
        </div>

        {/* Табы регионов */}
        {regionForecasts.length > 1 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {regionForecasts.map((r, idx) => (
              <button
                key={r.regionCode}
                onClick={() => setActiveRegion(idx)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 12, border: '1px solid var(--color-border)',
                  background: activeRegion === idx ? 'var(--color-primary)' : 'transparent',
                  color: activeRegion === idx ? '#fff' : 'var(--color-text-muted)',
                  cursor: 'pointer', fontWeight: activeRegion === idx ? 600 : 400,
                }}
              >
                {r.regionName.replace(' область', ' обл.')}
              </button>
            ))}
          </div>
        )}

        {activeData ? (
          <>
            {regionForecasts.length === 1 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                {activeData.regionName}
              </div>
            )}
            {activeData.items.map(item => {
              const maxVal = Math.max(...activeData.items.map(i => i.yield), 1)
              const pct = (item.yield / maxVal) * 100
              return (
                <div key={item.crop} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span>{item.displayName}</span>
                    <span style={{ fontWeight: 600 }}>{item.yield.toFixed(1)} ц/га</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: '#27ae60', transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
            ML-сервис недоступен
          </div>
        )}
      </div>

      {/* Прогноз цен */}
      <div className="card card-padding" style={{ minHeight: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <BarChart2 size={16} color="#3498db" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Прогноз цен (авг. {new Date().getFullYear()})</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/recommendations')}>
            Подробнее <ArrowRight size={12} />
          </button>
        </div>
        {prices.length > 0 ? (
          <>
            {prices.map(p => {
              const price = (p as any).predicted_price_rub_per_ton
              const validPrices = prices.map(pp => (pp as any).predicted_price_rub_per_ton).filter((v): v is number => v != null && v > 0)
              const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 1
              const pct = price != null && price > 0 ? (price / maxPrice) * 100 : 0
              const displayName = (p as any).displayName || p.crop
              return (
                <div key={p.crop} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span>{displayName}</span>
                    <span style={{ fontWeight: 600, color: price != null && price > 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                      {price != null && price > 0 ? `${Math.round(price).toLocaleString('ru-RU')} ₽/т` : 'нет данных'}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: price != null && price > 0 ? '#3498db' : 'var(--color-border)', transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
            ML-сервис недоступен
          </div>
        )}
      </div>
    </div>
  )
}
