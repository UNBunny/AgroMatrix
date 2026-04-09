import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot
} from 'recharts'
import { MapContainer, TileLayer, Polygon as LeafletPolygon, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { RefreshCw, Satellite, Maximize2, Minimize2 } from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { ndviService, getNdviColor } from '../services/ndviService'
import { Field, NdviRecord, NdviImageResponse } from '../types/Field'
import { getNdviBadge } from '../components/ui/Badge'
import { NdviStatCards } from '../components/ndvi/NdviStatCards'
import { LoadingOverlay } from '../components/ui/LoadingOverlay'
import WeatherWidget from '../components/weather/WeatherWidget'
import 'leaflet/dist/leaflet.css'
import '../styles/ndvi.css'

function todayStr() { return new Date().toISOString().split('T')[0] }
function monthsAgoStr(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().split('T')[0]
}
function fmtShort(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
function fmtLong(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

// NDVI карта через imageOverlay
function NdviImageLayer({ imageUrl, bbox }: { imageUrl: string; bbox: number[] }) {
  const map = useMap()
  useEffect(() => {
    const [west, south, east, north] = bbox
    const bounds = L.latLngBounds(L.latLng(south, west), L.latLng(north, east))
    const overlay = L.imageOverlay(imageUrl, bounds, { opacity: 0.88, zIndex: 400 })
    overlay.addTo(map)
    map.fitBounds(bounds, { padding: [30, 30] })
    return () => { map.removeLayer(overlay) }
  }, [imageUrl, bbox, map])
  return null
}

function FitBounds({ field }: { field: Field }) {
  const map = useMap()
  useMapEvents({})
  useEffect(() => {
    const lls = field.coordinates.map(c => L.latLng(c[1], c[0]))
    map.fitBounds(L.latLngBounds(lls), { padding: [30, 30] })
  }, [field, map])
  return null
}

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as NdviRecord
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow)'
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{fmtLong(d.date)}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: getNdviColor(d.mean) }}>
        NDVI: {d.mean.toFixed(3)}
      </div>
      {d.min != null && d.max != null && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          {Number(d.min).toFixed(3)} – {Number(d.max).toFixed(3)}
        </div>
      )}
      <div style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text-muted)' }}>
        {d.source === 'GEE_SENTINEL2' ? '🛰️ Sentinel-2' : '📡 AgroMonitoring'}
      </div>
    </div>
  )
}

export default function NdviMonitoringPage() {
  const [searchParams] = useSearchParams()
  const preselectedFieldId = searchParams.get('fieldId') ? Number(searchParams.get('fieldId')) : null

  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(preselectedFieldId)
  const [selectedField, setSelectedField] = useState<Field | null>(null)
  const [history, setHistory] = useState<NdviRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<NdviRecord | null>(null)
  const [ndviImage, setNdviImage] = useState<NdviImageResponse | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [dateFrom, setDateFrom] = useState(monthsAgoStr(12))
  const [dateTo, setDateTo] = useState(todayStr())
  const [loading, setLoading] = useState(false)
  const [loadingImage, setLoadingImage] = useState(false)
  const [loadingSatellite, setLoadingSatellite] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapExpanded, setMapExpanded] = useState(false)

  useEffect(() => {
    fieldService.getAllFields().then(data => {
      setFields(data)
      if (preselectedFieldId) {
        const f = data.find(x => x.id === preselectedFieldId)
        if (f) setSelectedField(f)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedFieldId) return
    const f = fields.find(x => x.id === selectedFieldId)
    if (f) setSelectedField(f)
  }, [selectedFieldId, fields])

  const loadHistory = useCallback(async () => {
    if (!selectedFieldId) return
    setLoading(true); setError(null)
    try {
      const res = await ndviService.getNdviHistory(selectedFieldId, dateFrom, dateTo)
      setHistory(res.history)
      if (res.current) setSelectedRecord(res.current)
      else if (res.history.length > 0) setSelectedRecord(res.history[res.history.length - 1])

      // Загрузка доступных дат
      const datesRes = await ndviService.fetchAvailableDates(selectedFieldId, monthsAgoStr(6), todayStr(), selectedField?.coordinates)
      let autoDate: string | null = null
      if (datesRes.dates?.length) {
        setAvailableDates(datesRes.dates)
        autoDate = datesRes.dates[datesRes.dates.length - 1]
        setSelectedDate(autoDate)
      } else if (res.history.length > 0) {
        autoDate = res.history[res.history.length - 1].date
        setSelectedDate(autoDate)
      }

      // Автозагрузка NDVI-карты на последнюю дату
      if (autoDate) {
        setLoadingImage(true)
        setNdviImage(null)
        try {
          const imgRes = await ndviService.fetchNdviImage(selectedFieldId, autoDate, selectedField?.coordinates)
          if (imgRes.imageUrl) setNdviImage(imgRes)
        } catch { /* тихо игнорируем */ }
        finally { setLoadingImage(false) }
      }
    } catch {
      setError('Ошибка загрузки данных NDVI')
    } finally { setLoading(false) }
  }, [selectedFieldId, dateFrom, dateTo, selectedField])

  useEffect(() => { loadHistory() }, [loadHistory])

  const loadImageForDate = async (date: string) => {
    if (!selectedFieldId) return
    setLoadingImage(true); setError(null); setNdviImage(null)
    try {
      const res = await ndviService.fetchNdviImage(selectedFieldId, date, selectedField?.coordinates)
      if (res.error) setError(`GEE: ${res.error}`)
      else if (!res.imageUrl) setError('Нет чистых снимков за эту дату')
      else setNdviImage(res)
    } catch { setError('Ошибка загрузки карты NDVI') }
    finally { setLoadingImage(false) }
  }

  const handleLoadImage = async () => {
    if (!selectedDate) return
    await loadImageForDate(selectedDate)
  }

  /** Загрузить реальные спутниковые данные NDVI за выбранный период (сохраняются в БД) */
  const handleLoadSatelliteHistory = async () => {
    if (!selectedFieldId) return
    setLoadingSatellite(true); setError(null)
    try {
      const res = await ndviService.fetchSatelliteHistory(selectedFieldId, dateFrom, dateTo, selectedField?.coordinates, selectedField?.fieldName)
      setHistory(res.history)
      if (res.current) setSelectedRecord(res.current)
      else if (res.history.length > 0) setSelectedRecord(res.history[res.history.length - 1])
    } catch {
      setError('Ошибка загрузки спутниковых данных. Убедитесь, что ml-service запущен.')
    } finally { setLoadingSatellite(false) }
  }

  const currentNdvi = ndviImage?.ndviMean ?? selectedRecord?.mean ?? null
  const maxNdvi = history.length ? Math.max(...history.map(r => r.mean)) : null
  const minNdvi = history.length ? Math.min(...history.map(r => r.mean)) : null
  const maxRecord = history.find(r => r.mean === maxNdvi)
  const minRecord = history.find(r => r.mean === minNdvi)

  return (
    <div>
      {/* ── Шапка с выбором поля и периода ── */}
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 180px', minWidth: 160 }}>
            <label className="form-label">Поле</label>
            <select
              className="form-control"
              value={selectedFieldId ?? ''}
              onChange={e => { setSelectedFieldId(Number(e.target.value)); setNdviImage(null) }}
            >
              <option value="">— Выберите поле —</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.fieldName} ({f.areaHectares} га)</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 120 }}>
            <label className="form-label">С</label>
            <input type="date" className="form-control" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} max={dateTo} />
          </div>
          <div className="form-group" style={{ minWidth: 120 }}>
            <label className="form-label">По</label>
            <input type="date" className="form-control" value={dateTo}
              onChange={e => setDateTo(e.target.value)} max={todayStr()} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={loadHistory} disabled={!selectedFieldId || loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Загрузка...' : 'Из БД'}
            </button>
            <button className="btn btn-primary" onClick={handleLoadSatelliteHistory}
              disabled={!selectedFieldId || loadingSatellite}
              style={{ background: '#1565C0' }}
            >
              <Satellite size={14} className={loadingSatellite ? 'spin' : ''} />
              {loadingSatellite ? 'Загрузка с GEE...' : '🛰 Спутник'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!selectedFieldId ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🛰️</div>
            <div className="empty-state-title">Выберите поле</div>
            <div className="empty-state-text">Для просмотра данных NDVI выберите поле в выпадающем списке выше</div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Карточки статистики ── */}
          <NdviStatCards
            currentNdvi={currentNdvi}
            maxNdvi={maxNdvi}
            minNdvi={minNdvi}
            maxRecord={maxRecord}
            minRecord={minRecord}
          />

          {/* ── NDVI Карта (доминирующий элемент, особенно на мобильном) ── */}
          <div
            className="card mb-20"
            style={{
              overflow: 'hidden',
              height: mapExpanded ? 'calc(100vh - 120px)' : 480,
              display: 'flex',
              flexDirection: 'column',
              transition: 'height 0.3s ease',
            }}
          >
            {/* Заголовок карты */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>🗺️ NDVI карта поля</span>
              {selectedField && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {selectedField.fieldName} · {selectedField.areaHectares} га
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
                {availableDates.length > 0 ? (
                  <select className="form-control" style={{ width: 'auto', fontSize: 12, padding: '5px 8px' }}
                    value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setNdviImage(null) }}>
                    {availableDates.slice().reverse().map(d => (
                      <option key={d} value={d}>{fmtShort(d)}</option>
                    ))}
                  </select>
                ) : (
                  <input type="date" className="form-control" style={{ width: 130, fontSize: 12, padding: '5px 8px' }}
                    value={selectedDate} max={todayStr()}
                    onChange={e => { setSelectedDate(e.target.value); setNdviImage(null) }} />
                )}
                <button className="btn btn-primary btn-sm" onClick={handleLoadImage} disabled={loadingImage}>
                  <Satellite size={12} /> {loadingImage ? '...' : 'Загрузить'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMapExpanded(e => !e)}
                  title={mapExpanded ? 'Свернуть карту' : 'Развернуть карту'}
                >
                  {mapExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
            </div>

            {/* Карта */}
            <div className="ndvi-mobile-map-section" style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              {selectedField && (
                <MapContainer
                  center={[selectedField.coordinates[0][1], selectedField.coordinates[0][0]]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  attributionControl={false}
                >
                  <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={20} />
                  <FitBounds field={selectedField} />
                  <LeafletPolygon
                    positions={
                      selectedField.holes && selectedField.holes.length > 0
                        ? [
                            selectedField.coordinates.map(c => [c[1], c[0]] as [number, number]),
                            ...selectedField.holes.map(h => h.map(c => [c[1], c[0]] as [number, number])),
                          ]
                        : selectedField.coordinates.map(c => [c[1], c[0]] as [number, number])
                    }
                    pathOptions={{ color: '#ffffff', weight: 2.5, fill: false, dashArray: '5 5' }}
                  />
                  {ndviImage?.imageUrl && ndviImage.bbox && (
                    <NdviImageLayer imageUrl={ndviImage.imageUrl} bbox={ndviImage.bbox} />
                  )}
                </MapContainer>
              )}
              <LoadingOverlay visible={loadingImage} message="Загрузка спутниковых данных..." />

              {/* NDVI value overlay on map */}
              {currentNdvi !== null && (
                <div style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 600,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  borderRadius: 8, padding: '8px 14px',
                  backdropFilter: 'blur(4px)',
                }}>
                  <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2 }}>NDVI</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: getNdviColor(currentNdvi), lineHeight: 1 }}>
                    {currentNdvi.toFixed(3)}
                  </div>
                  {selectedRecord && (
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{fmtShort(selectedRecord.date)}</div>
                  )}
                </div>
              )}

              {!ndviImage?.imageUrl && !loadingImage && (
                <div style={{
                  position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '7px 14px',
                  fontSize: 11, color: 'var(--color-text-muted)', zIndex: 500, whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  Нажмите «Загрузить» или кликните по графику
                </div>
              )}
            </div>
          </div>

          {/* ── График + Таблица ── */}
          <div className="ndvi-two-col mb-20" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* График */}
            <div className="card card-padding">
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>� История NDVI</div>
              {loading ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  <div className="spinner" style={{ marginRight: 8 }} /> Загрузка данных...
                </div>
              ) : history.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <div className="empty-state-icon">📊</div>
                  <div className="empty-state-title">Нет данных за выбранный период</div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    {/* @ts-ignore */}
                    <AreaChart
                      data={history}
                      margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                      onClick={(d: any) => {
                        if (d?.activePayload?.[0]) {
                          const rec = d.activePayload[0].payload as NdviRecord
                          setSelectedRecord(rec)
                          setSelectedDate(rec.date)
                          loadImageForDate(rec.date)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <defs>
                        <linearGradient id="ndvi-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2d7a45" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2d7a45" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={fmtShort}
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false}
                        interval={Math.max(0, Math.floor(history.length / 6) - 1)} />
                      <YAxis domain={[0, 0.9]}
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                        tickFormatter={(v: number) => v.toFixed(1)} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={0.3} stroke="var(--color-danger)" strokeDasharray="4 4"
                        label={{ value: 'Критич.', position: 'insideTopRight', fontSize: 9, fill: 'var(--color-danger)' }} />
                      <ReferenceLine y={0.5} stroke="var(--color-warning)" strokeDasharray="4 4"
                        label={{ value: 'Умерен.', position: 'insideTopRight', fontSize: 9, fill: 'var(--color-warning)' }} />
                      <Area type="monotone" dataKey="mean" stroke="#2d7a45" strokeWidth={2.5}
                        fill="url(#ndvi-grad)" dot={false} activeDot={{ r: 5, fill: '#2d7a45' }} />
                      {selectedRecord && (
                        <ReferenceDot x={selectedRecord.date} y={selectedRecord.mean} r={6}
                          fill={getNdviColor(selectedRecord.mean)} stroke="white" strokeWidth={2} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 6 }}>
                    Нажмите на точку — карта обновится
                  </div>
                </>
              )}
            </div>

            {/* Таблица данных */}
            <div className="card ndvi-table-section" style={{ height: 300, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                📋 Данные по датам
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>NDVI</th>
                      <th>Источник</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>Нет данных</td></tr>
                    )}
                    {[...history].reverse().map((r, i) => (
                      <tr key={i}
                        style={{ cursor: 'pointer', background: selectedRecord?.date === r.date ? 'var(--color-primary-light)' : undefined }}
                        onClick={() => { setSelectedRecord(r); setSelectedDate(r.date); loadImageForDate(r.date) }}
                      >
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: getNdviColor(r.mean) }}>{r.mean.toFixed(3)}</span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {r.source === 'GEE_SENTINEL2' ? '🛰️' : '📡'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Погода ── */}
          {selectedField && (
            <div className="mb-20">
              <WeatherWidget
                lat={selectedField.coordinates.reduce((s, c) => s + c[1], 0) / selectedField.coordinates.length}
                lon={selectedField.coordinates.reduce((s, c) => s + c[0], 0) / selectedField.coordinates.length}
                title={`🌤️ Погода — ${selectedField.fieldName}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

