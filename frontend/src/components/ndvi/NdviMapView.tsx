import { useEffect } from 'react'
import { MapContainer, TileLayer, Polygon as LeafletPolygon, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Satellite } from 'lucide-react'
import { Field, NdviImageResponse } from '../../types/Field'
import { LoadingOverlay } from '../ui/LoadingOverlay'
import 'leaflet/dist/leaflet.css'

function fmtShort(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function todayStr() { return new Date().toISOString().split('T')[0] }

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

interface NdviMapViewProps {
  field: Field
  ndviImage: NdviImageResponse | null
  availableDates: string[]
  selectedDate: string
  onDateChange: (date: string) => void
  onLoadImage: () => void
  loadingImage: boolean
}

/**
 * Карта NDVI поля с imageOverlay и выбором даты.
 * Извлечена из NdviMonitoringPage для переиспользования.
 */
export function NdviMapView({
  field,
  ndviImage,
  availableDates,
  selectedDate,
  onDateChange,
  onLoadImage,
  loadingImage,
}: NdviMapViewProps) {
  return (
    <div className="card" style={{ overflow: 'hidden', height: 360 }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>🗺️ Карта NDVI</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {availableDates.length > 0 ? (
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: 12 }}
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
            >
              {availableDates.slice().reverse().map(d => (
                <option key={d} value={d}>{fmtShort(d)}</option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              className="form-control"
              style={{ width: 130, fontSize: 12 }}
              value={selectedDate}
              max={todayStr()}
              onChange={e => onDateChange(e.target.value)}
            />
          )}
          <button className="btn btn-primary btn-sm" onClick={onLoadImage} disabled={loadingImage}>
            <Satellite size={12} /> {loadingImage ? '...' : 'Загрузить'}
          </button>
        </div>
      </div>

      <div style={{ height: 'calc(100% - 52px)', position: 'relative' }}>
        <MapContainer
          center={[field.coordinates[0][1], field.coordinates[0][0]]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={20} />
          <FitBounds field={field} />
          <LeafletPolygon
            positions={field.coordinates.map(c => [c[1], c[0]] as [number, number])}
            pathOptions={{ color: '#ffffff', weight: 2, fill: false, dashArray: '5 5' }}
          />
          {ndviImage?.imageUrl && ndviImage.bbox && (
            <NdviImageLayer imageUrl={ndviImage.imageUrl} bbox={ndviImage.bbox} />
          )}
        </MapContainer>

        <LoadingOverlay visible={loadingImage} message="Загрузка спутниковых данных..." />

        {!ndviImage?.imageUrl && !loadingImage && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '6px 12px',
            fontSize: 11, color: 'var(--color-text-muted)', zIndex: 500, whiteSpace: 'nowrap'
          }}>
            Кликните по графику или таблице — карта загрузится
          </div>
        )}
      </div>
    </div>
  )
}

