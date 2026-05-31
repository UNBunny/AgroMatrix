import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Polygon, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { Plus } from 'lucide-react'
import { Field } from '../types/Field'
import { getNdviColor } from '../services/ndviService'
import { useFields } from '../hooks/useFields'
import { FieldDrawer } from '../components/map/FieldDrawer'
import { FieldDetailPanel } from '../components/map/FieldDetailPanel'
import { recommendationService, DiseaseRiskResponse } from '../services/recommendationService'
import 'leaflet/dist/leaflet.css'

// ── Цвета культур ─────────────────────────────────────────────────────────────

const CROP_COLORS: Record<string, string> = {
  'spring_wheat':  '#f39c12',
  'winter_wheat':  '#e67e22',
  'spring_barley': '#f1c40f',
  'winter_barley': '#d4ac0d',
  'corn':          '#27ae60',
  'sunflower':     '#ff6b35',
  'soybean':       '#16a085',
  'rapeseed':      '#8e44ad',
  'peas':          '#2ecc71',
  'buckwheat':     '#c0392b',
  'oat':           '#95a5a6',
  'rye':           '#a04000',
  'millet':        '#d35400',
  'flax':          '#2980b9',
}

const CROP_CODE_MAP: Record<string, string> = {
  'Пшеница яровая':  'spring_wheat',
  'Пшеница озимая':  'winter_wheat',
  'Ячмень яровой':   'spring_barley',
  'Ячмень озимый':   'winter_barley',
  'Кукуруза':        'corn',
  'Подсолнечник':    'sunflower',
  'Соя':             'soybean',
  'Рапс':            'rapeseed',
  'Горох':           'peas',
  'Гречиха':         'buckwheat',
  'Овёс':            'oat',
  'Рожь':            'rye',
  'Просо':           'millet',
  'Лён':             'flax',
}

function getCropColor(field: Field): string {
  const code = CROP_CODE_MAP[field.crop_type] ?? field.crop_type
  return CROP_COLORS[code] ?? '#3498db'
}

// ── Иконка риска болезней ─────────────────────────────────────────────────────

const RISK_ICON: Record<string, string> = {
  CRITICAL: '🔴',
  HIGH:     '🟠',
  MEDIUM:   '🟡',
  LOW:      '🟢',
}

function createRiskIcon(level: string): L.DivIcon {
  return L.divIcon({
    html: `<span style="font-size:18px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">${RISK_ICON[level] ?? '⚪'}</span>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function fieldCenter(field: Field): [number, number] {
  const lats = field.coordinates.map(c => c[1])
  const lngs = field.coordinates.map(c => c[0])
  return [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ]
}

// ── Конвертация координат ────────────────────────────────────────────────────

function toLatLng(coords: number[][]): [number, number][] {
  return coords.map(c => [c[1], c[0]])
}

type ColorMode = 'ndvi' | 'crop'

export default function MapPage() {
  const navigate = useNavigate()
  const { fields, ndviMap } = useFields({ withNdvi: true })
  const [selectedField, setSelectedField] = useState<Field | null>(null)
  const [search, setSearch] = useState('')
  const [layer, setLayer] = useState<'satellite' | 'map'>('satellite')
  const [colorMode, setColorMode] = useState<ColorMode>('ndvi')
  const [mapRef, setMapRef] = useState<L.Map | null>(null)
  const [diseaseRiskMap, setDiseaseRiskMap] = useState<Record<number, DiseaseRiskResponse>>({})

  // Force Leaflet to recalculate size after mount (needed on mobile)
  useEffect(() => {
    if (!mapRef) return
    const t = setTimeout(() => mapRef.invalidateSize(), 100)
    return () => clearTimeout(t)
  }, [mapRef])

  // Загрузка рисков болезней для всех полей с культурами
  useEffect(() => {
    if (fields.length === 0) return
    const fieldsWithCrop = fields.filter(f => f.crop_type && f.crop_type !== 'Не задана')
    Promise.allSettled(
      fieldsWithCrop.map(f =>
        recommendationService.getDiseaseRisk(f.id, f.crop_type)
          .then(risk => ({ id: f.id, risk }))
      )
    ).then(results => {
      const map: Record<number, DiseaseRiskResponse> = {}
      results.forEach(res => {
        if (res.status === 'fulfilled') map[res.value.id] = res.value.risk
      })
      setDiseaseRiskMap(map)
    })
  }, [fields.length])

  const handleAddField = () => {
    const center = mapRef ? mapRef.getCenter() : null
    const zoom = mapRef ? mapRef.getZoom() : 10
    navigate('/fields/new', {
      state: center ? { lat: center.lat, lng: center.lng, zoom } : undefined
    })
  }

  const handleFieldClick = (field: Field) => {
    setSelectedField(field)
    if (mapRef) {
      const bounds = L.latLngBounds(field.coordinates.map(c => L.latLng(c[1], c[0])))
      mapRef.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
    }
  }

  const tileUrl = layer === 'satellite'
    ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <div className="map-page">
      {/* Leaflet карта */}
      <MapContainer
        center={[54.9924, 73.3686]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        ref={(map) => { if (map) setMapRef(map) }}
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution="&copy; Google / OSM" maxZoom={20} />

        {fields.map((field) => {
          const color = colorMode === 'ndvi'
            ? getNdviColor(ndviMap[field.id])
            : getCropColor(field)
          const isSelected = selectedField?.id === field.id
          const mainPositions = toLatLng(field.coordinates)
          const positionsWithHoles: [number, number][] | [number, number][][] =
            field.holes && field.holes.length > 0
              ? [mainPositions, ...field.holes.map(h => toLatLng(h))]
              : mainPositions

          const risk = diseaseRiskMap[field.id]
          const showRisk = risk && (risk.overallRiskLevel === 'HIGH' || risk.overallRiskLevel === 'CRITICAL')

          return (
            <Fragment key={field.id}>
              <Polygon
                positions={positionsWithHoles as any}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: isSelected ? 0.7 : 0.45,
                  color: isSelected ? '#ffffff' : color,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{ click: () => handleFieldClick(field) }}
              />
              {showRisk && (
                <Marker
                  key={`risk-${field.id}`}
                  position={fieldCenter(field)}
                  icon={createRiskIcon(risk.overallRiskLevel)}
                  eventHandlers={{ click: () => handleFieldClick(field) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    <div style={{ fontSize: 12, maxWidth: 200 }}>
                      <strong>{field.fieldName}</strong><br />
                      {RISK_ICON[risk.overallRiskLevel]} Риск болезней: {risk.overallRiskLevel}<br />
                      {risk.diseaseRisks.slice(0, 2).map((d, i) => (
                        <span key={i} style={{ display: 'block', color: '#e74c3c' }}>
                          • {d.diseaseName}
                        </span>
                      ))}
                    </div>
                  </Tooltip>
                </Marker>
              )}
            </Fragment>
          )
        })}
      </MapContainer>

      {/* Toolbar по центру сверху */}
      <div className="map-toolbar">
        <button
          className={`map-layer-btn${layer === 'satellite' ? ' active' : ''}`}
          onClick={() => setLayer('satellite')}
        >🛰️ Спутник</button>
        <button
          className={`map-layer-btn${layer === 'map' ? ' active' : ''}`}
          onClick={() => setLayer('map')}
        >🗺️ Схема</button>
        <div style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 4px' }} />
        <button
          className={`map-layer-btn${colorMode === 'ndvi' ? ' active' : ''}`}
          onClick={() => setColorMode('ndvi')}
        >🌿 NDVI</button>
        <button
          className={`map-layer-btn${colorMode === 'crop' ? ' active' : ''}`}
          onClick={() => setColorMode('crop')}
        >🌾 Культура</button>
        <div style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 4px' }} />
        <button className="btn btn-primary btn-sm" onClick={handleAddField}>
          <Plus size={14} /> Добавить поле
        </button>
      </div>

      {/* Левая панель — список полей */}
      <FieldDrawer
        fields={fields}
        ndviMap={ndviMap}
        search={search}
        onSearchChange={setSearch}
        selectedFieldId={selectedField?.id ?? null}
        onFieldClick={handleFieldClick}
      />

      {/* Правая панель — детали выбранного поля */}
      {selectedField && (
        <FieldDetailPanel
          field={selectedField}
          ndviValue={ndviMap[selectedField.id]}
          onClose={() => setSelectedField(null)}
          onNavigateDetails={() => navigate(`/fields/${selectedField.id}`)}
          onNavigateRecommendations={(id) => navigate(`/recommendations?fieldId=${id}`)}
        />
      )}
    </div>
  )
}
