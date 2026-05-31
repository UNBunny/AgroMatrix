import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, Polygon as LeafletPolygon } from 'react-leaflet'
import L from 'leaflet'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot
} from 'recharts'
import { NdviRecord, NdviImageResponse } from '../types/Field'
import { Field } from '../types/Field'
import { ndviService, getNdviColor, getNdviLabel } from '../services/ndviService'
import '../styles/ndvi.css'

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function monthsAgoStr(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split('T')[0]
}

interface NdviRealImageLayerProps {
  imageUrl: string
  bbox: number[] // [west, south, east, north]
}

function NdviRealImageLayer({ imageUrl, bbox }: NdviRealImageLayerProps) {
  const map = useMap()

  useEffect(() => {
    if (!imageUrl || !bbox || bbox.length < 4) return

    const [west, south, east, north] = bbox
    const bounds = L.latLngBounds(
      L.latLng(south, west),
      L.latLng(north, east)
    )

    const overlay = L.imageOverlay(imageUrl, bounds, {
      opacity: 0.88,
      zIndex: 400,
    })
    overlay.addTo(map)
    map.fitBounds(bounds, { padding: [30, 30] })

    return () => {
      map.removeLayer(overlay)
    }
  }, [imageUrl, bbox, map])

  return null
}

function FieldOutline({ field }: { field: Field }) {
  const positions = field.coordinates.map(c => [c[1], c[0]] as [number, number])
  return (
    <LeafletPolygon
      positions={positions}
      pathOptions={{ color: '#fff', weight: 2, fill: false, dashArray: '6 3' }}
    />
  )
}

function FitBounds({ field }: { field: Field }) {
  const map = useMap()
  useEffect(() => {
    const latLngs = field.coordinates.map(c => L.latLng(c[1], c[0]))
    map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] })
  }, [field, map])
  return null
}

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as NdviRecord
  const color = getNdviColor(d.mean)
  return (
    <div className="ndvi-chart-tooltip">
      <div className="ndvi-chart-tooltip-date">{formatLongDate(d.date)}</div>
      <div className="ndvi-chart-tooltip-value" style={{ color }}>
        NDVI: <strong>{d.mean.toFixed(3)}</strong>
      </div>
      {d.min !== null && d.max !== null && (
        <div className="ndvi-chart-tooltip-range">
          {Number(d.min).toFixed(3)} – {Number(d.max).toFixed(3)}
        </div>
      )}
    </div>
  )
}

interface NdviPanelProps {
  field: Field
}

const NdviPanel = ({ field }: NdviPanelProps) => {
  const [allHistory, setAllHistory] = useState<NdviRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<NdviRecord | null>(null)
  const [ndviImage, setNdviImage] = useState<NdviImageResponse | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())
  const [loading, setLoading] = useState(true)
  const [loadingImage, setLoadingImage] = useState(false)
  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingSatellite, setLoadingSatellite] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = monthsAgoStr(12)
      const to = todayStr()
      const result = await ndviService.getNdviHistoryAuto(field.id, field.coordinates, from, to)
      setAllHistory(result.history)
      if (result.current) setSelectedRecord(result.current)
      else if (result.history.length > 0) setSelectedRecord(result.history[result.history.length - 1])
    } catch {
      setError('Не удалось загрузить данные NDVI')
    } finally {
      setLoading(false)
    }
  }, [field.id])

  const loadAvailableDates = useCallback(async () => {
    setLoadingDates(true)
    try {
      const from = monthsAgoStr(6)
      const to = todayStr()
      const result = await ndviService.fetchAvailableDates(field.id, from, to, field.coordinates)
      if (result.dates && result.dates.length > 0) {
        setAvailableDates(result.dates)
        setSelectedDate(result.dates[result.dates.length - 1])
      }
    } catch {
    } finally {
      setLoadingDates(false)
    }
  }, [field.id])

  useEffect(() => {
    loadHistory()
    loadAvailableDates()
  }, [loadHistory, loadAvailableDates])

  const loadImageForDate = async (date: string) => {
    setLoadingImage(true)
    setError(null)
    setNdviImage(null)
    setShowMap(true)
    try {
      const result = await ndviService.fetchNdviImage(field.id, date)
      if (result.error) {
        setError(`GEE: ${result.error}`)
      } else if (!result.imageUrl) {
        setError('Нет чистых снимков за эту дату. Попробуйте соседнюю.')
      } else {
        setNdviImage(result)
      }
    } catch {
      setError('Не удалось загрузить NDVI карту. Проверьте, что ml-service запущен.')
    } finally {
      setLoadingImage(false)
    }
  }

  const handleLoadImage = async () => {
    if (!selectedDate) return
    await loadImageForDate(selectedDate)
  }

  const handleQuickDate = (date: string) => {
    setSelectedDate(date)
  }

  const handleChartClick = (data: any) => {
    if (data?.activePayload?.[0]) {
      const rec = data.activePayload[0].payload as NdviRecord
      setSelectedRecord(rec)
      setSelectedDate(rec.date)
      loadImageForDate(rec.date)
    }
  }

  const handleLoadSatelliteHistory = async () => {
    setLoadingSatellite(true)
    setError(null)
    try {
      const from = monthsAgoStr(12)
      const to = todayStr()
      const result = await ndviService.fetchSatelliteHistory(field.id, from, to)
      setAllHistory(result.history)
      if (result.current) setSelectedRecord(result.current)
      else if (result.history.length > 0) setSelectedRecord(result.history[result.history.length - 1])
    } catch {
      setError('Ошибка загрузки спутниковых данных. Убедитесь, что ml-service запущен.')
    } finally {
      setLoadingSatellite(false)
    }
  }

  const currentNdvi = ndviImage?.ndviMean ?? selectedRecord?.mean ?? null
  const ndviColor = getNdviColor(currentNdvi)
  const gradientId = `ndvi-gradient-${field.id}`

  return (
    <div className="ndvi-panel-onesoil">
      <div className="ndvi-os-header">
        <div>
          <div className="ndvi-os-title">🛰 NDVI — {field.fieldName}</div>
          <div className="ndvi-os-subtitle">{field.areaHectares} га · {field.crop_type}</div>
        </div>
      </div>

      {!loading && allHistory.length === 0 && !loadingSatellite && (
        <div style={{ padding: '12px 16px', background: 'rgba(21,101,192,0.06)', borderRadius: 8, margin: '0 12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
            Нет данных NDVI. Загрузите реальные спутниковые данные с GEE.
          </div>
          <button
            className="ndvi-load-btn"
            onClick={handleLoadSatelliteHistory}
            style={{ background: '#1565C0', color: '#fff', width: '100%' }}
          >
            🛰 Загрузить спутниковые данные
          </button>
        </div>
      )}
      {loadingSatellite && (
        <div style={{ padding: '16px', textAlign: 'center', color: '#1565C0' }}>
          <div>⏳ Загрузка спутниковых данных с GEE...</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Это может занять 30-60 секунд</div>
        </div>
      )}

      {error && <div className="ndvi-os-error">⚠️ {error}</div>}

      <div className="ndvi-date-picker-section">
        <div className="ndvi-date-picker-row">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ndvi-date-input"
            max={todayStr()}
          />
          <button
            className="ndvi-load-btn"
            onClick={handleLoadImage}
            disabled={loadingImage || !selectedDate}
          >
            {loadingImage ? '⏳ Загрузка...' : '🛰 Показать NDVI'}
          </button>
        </div>

        {availableDates.length > 0 && (
          <div className="ndvi-available-dates">
            <div className="ndvi-available-dates-label">
              {loadingDates ? '⏳ Поиск снимков...' : `📅 Доступные снимки (${availableDates.length}):`}
            </div>
            <div className="ndvi-dates-chips">
              {availableDates.slice(-12).map(date => (
                <button
                  key={date}
                  className={`ndvi-date-chip ${date === selectedDate ? 'active' : ''}`}
                  onClick={() => handleQuickDate(date)}
                >
                  {formatShortDate(date)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {(ndviImage?.ndviMean != null || selectedRecord) && (
        <div className="ndvi-os-current">
          <div className="ndvi-os-big-value" style={{ color: ndviColor }}>
            {currentNdvi?.toFixed(2) ?? '—'}
          </div>
          <div className="ndvi-os-value-label">
            {getNdviLabel(currentNdvi)}
            {ndviImage?.actualDate && (
              <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none' }}>
                • {formatLongDate(ndviImage.actualDate)}
              </span>
            )}
          </div>
          {ndviImage && (
            <div className="ndvi-os-date">
              <span className="ndvi-os-source ndvi-source-gee_sentinel2">🛰 GEE Sentinel-2</span>
              <span style={{ color: '#999', fontSize: '0.72rem' }}>
                {ndviImage.imagesFound} снимков
              </span>
              {ndviImage.ndviMin != null && ndviImage.ndviMax != null && (
                <span style={{ color: '#999', fontSize: '0.72rem' }}>
                  min {ndviImage.ndviMin.toFixed(2)} → max {ndviImage.ndviMax.toFixed(2)}
                </span>
              )}
            </div>
          )}
          <div className="ndvi-os-scale-bar">
            <div className="ndvi-os-scale-gradient" />
            {currentNdvi != null && (
              <div className="ndvi-os-scale-marker" style={{ left: `${Math.max(0, Math.min(100, (currentNdvi / 0.8) * 100))}%` }} />
            )}
            <div className="ndvi-os-scale-labels">
              <span>0.0</span><span>0.2</span><span>0.4</span><span>0.6</span><span>0.8</span>
            </div>
          </div>
        </div>
      )}

      <div className="ndvi-os-tabs">
        <button className={`ndvi-os-tab ${showMap ? 'active' : ''}`} onClick={() => setShowMap(true)}>
          🗺 Карта NDVI
        </button>
        <button className={`ndvi-os-tab ${!showMap ? 'active' : ''}`} onClick={() => setShowMap(false)}>
          📈 История
        </button>
      </div>

      {showMap && (
        <div className="ndvi-os-map-container" style={{ height: 300 }}>
          {loadingImage ? (
            <div className="ndvi-os-map-loading">
              <div>⏳ Загрузка спутниковых данных...</div>
              <div style={{ fontSize: '0.72rem', color: '#bbb', marginTop: 4 }}>Это может занять 5-15 секунд</div>
            </div>
          ) : (
            <>
              <MapContainer
                center={[field.coordinates[0][1], field.coordinates[0][0]]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
                <FitBounds field={field} />
                <FieldOutline field={field} />

                {ndviImage?.imageUrl && ndviImage?.bbox && (
                  <NdviRealImageLayer
                    imageUrl={ndviImage.imageUrl}
                    bbox={ndviImage.bbox}
                  />
                )}
              </MapContainer>

              <div className="ndvi-os-map-legend">
                <div className="ndvi-os-map-legend-title">NDVI</div>
                <div className="ndvi-os-map-legend-bar" />
                <div className="ndvi-os-map-legend-labels">
                  <span style={{ color: '#d73027' }}>0.0</span>
                  <span style={{ color: '#fee08b' }}>0.4</span>
                  <span style={{ color: '#1a9850' }}>0.8</span>
                </div>
              </div>

              {ndviImage?.actualDate && (
                <div className="ndvi-os-map-date">
                  🛰 {formatShortDate(ndviImage.actualDate)}
                </div>
              )}

              {!ndviImage?.imageUrl && (
                <div className="ndvi-os-map-hint">
                  Выберите дату на графике или нажмите «Показать NDVI»
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!showMap && (
        <div className="ndvi-os-chart-container">
          {loading || loadingSatellite ? (
            <div className="ndvi-os-map-loading">⏳ {loadingSatellite ? 'Загрузка с GEE...' : 'Загрузка...'}</div>
          ) : allHistory.length === 0 ? (
            <div className="ndvi-os-map-loading" style={{ flexDirection: 'column', gap: 8 }}>
              <div>Нет данных NDVI</div>
              <button
                className="ndvi-load-btn"
                onClick={handleLoadSatelliteHistory}
                style={{ background: '#1565C0', color: '#fff', fontSize: 12, padding: '6px 14px' }}
              >
                🛰 Загрузить спутниковые данные
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={allHistory}
                margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                onClick={handleChartClick}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 9, fill: '#888' }}
                  tickLine={false}
                  interval={Math.floor(allHistory.length / 6)}
                />
                <YAxis
                  domain={[0, 0.8]}
                  tick={{ fontSize: 9, fill: '#888' }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="mean"
                  stroke="#2E7D32"
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 5, fill: '#2E7D32' }}
                />
                {selectedRecord && (
                  <ReferenceDot
                    x={selectedRecord.date}
                    y={selectedRecord.mean}
                    r={6}
                    fill={ndviColor}
                    stroke="white"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div style={{ fontSize: '0.72rem', color: '#999', textAlign: 'center', marginTop: 4 }}>
            Кликните по графику — NDVI-карта загрузится автоматически
          </div>
        </div>
      )}
    </div>
  )
}

export default NdviPanel

