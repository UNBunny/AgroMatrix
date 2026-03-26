import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, useMapEvents, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Field } from '../types/Field'
import { getNdviColor } from '../services/ndviService'

interface FieldMapProps {
  fields: Field[]
  isDrawing: boolean
  currentPolygon: number[][]
  onPolygonUpdate: (coordinates: number[][]) => void
  currentHoles?: number[][][]
  onHolesUpdate?: (holes: number[][][]) => void
  isCreatingHole?: boolean
  currentHole?: number[][]
  onHoleUpdate?: (hole: number[][]) => void
  /** fieldId → ndviMean: для цветовой индикации по NDVI */
  ndviColors?: Record<number, number | null>
  /** Callback при клике на поле */
  onFieldClick?: (field: Field) => void
  /** Выбранное поле — карта автоматически зумится на него */
  selectedField?: Field | null
  /** Начальный центр карты [lat, lng] */
  initialCenter?: [number, number]
  /** Начальный зум */
  initialZoom?: number
}

function EditablePoint({ position, index, onDrag, onDelete, color = '#3498db', size = 8, isDeletable = true }: {
  position: [number, number]
  index: number
  onDrag: (index: number, newPosition: [number, number]) => void
  onDelete?: (index: number) => void
  color?: string
  size?: number
  isDeletable?: boolean
}) {
  const markerRef = useRef<L.Marker>(null)

  const icon = L.divIcon({
    html: `<div style="background: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: grab; transition: all 0.2s; z-index: 1000;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })

  const deleteIcon = L.divIcon({
    html: `<div style="background: #e74c3c; color: white; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; cursor: pointer; border: 1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">×</div>`,
    className: 'delete-marker',
    iconSize: [14, 14],
    iconAnchor: [-2, -2]
  })

  return (
    <>
      <Marker
        ref={markerRef}
        position={position}
        icon={icon}
        draggable={true}
        zIndexOffset={500}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target
            const newPos = marker.getLatLng()
            onDrag(index, [newPos.lat, newPos.lng])
          }
        }}
      />
      {isDeletable && onDelete && (
        <Marker
          position={position}
          icon={deleteIcon}
          eventHandlers={{
            click: (e) => {
              e.originalEvent?.stopPropagation()
              e.originalEvent?.preventDefault()
              onDelete(index)
            },
            mousedown: (e) => {
              e.originalEvent?.stopPropagation()
              e.originalEvent?.preventDefault()
            },
            mouseover: (e) => {
              e.originalEvent?.stopPropagation()
            },
            mouseout: (e) => {
              e.originalEvent?.stopPropagation()
            }
          }}
              zIndexOffset={1000}
        />
      )}
    </>
  )
}

function DrawingHandler({ isDrawing, currentPolygon, onPolygonUpdate, isCreatingHole, currentHole, onHoleUpdate }: {
  isDrawing: boolean
  currentPolygon: number[][]
  onPolygonUpdate: (coordinates: number[][]) => void
  isCreatingHole?: boolean
  currentHole?: number[][]
  onHoleUpdate?: (hole: number[][]) => void
}) {
  useMapEvents({
    click: (e) => {
      if (isDrawing && !isCreatingHole) {
        const { lat, lng } = e.latlng
        const newPoint = [lng, lat]
        onPolygonUpdate([...currentPolygon, newPoint])
      } else if (isCreatingHole && onHoleUpdate && currentHole) {
        const { lat, lng } = e.latlng
        const newPoint = [lng, lat]
        onHoleUpdate([...currentHole, newPoint])
      }
    }
  })

  return null
}

function getPolygonPositions(coordinates: number[][]): [number, number][] {
  return coordinates.map(coord => [coord[1], coord[0]])
}

function calculatePolygonArea(coordinates: number[][]): number {
  if (coordinates.length < 3) return 0

  const earthRadius = 6371000
  let area = 0

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length
    const lat1 = coordinates[i][1] * Math.PI / 180
    const lat2 = coordinates[j][1] * Math.PI / 180
    const deltaLon = (coordinates[j][0] - coordinates[i][0]) * Math.PI / 180
    
    area += deltaLon * (2 + Math.sin(lat1) + Math.sin(lat2))
  }

  area = Math.abs(area * earthRadius * earthRadius / 2)
  return area / 10000
}

export function calculateFieldArea(mainPolygon: number[][], holes: number[][][] = []): number {
  const mainArea = calculatePolygonArea(mainPolygon)
  const holesArea = holes.reduce((sum, hole) => sum + calculatePolygonArea(hole), 0)
  return Math.max(0, mainArea - holesArea)
}

function FlyToField({ field }: { field: Field | null | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (!field || !field.coordinates || field.coordinates.length === 0) return
    const latLngs = field.coordinates.map(c => L.latLng(c[1], c[0]))
    const bounds = L.latLngBounds(latLngs)
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 0.8 })
  }, [field?.id, map])
  return null
}

export function FieldMap({
  fields, 
  isDrawing, 
  currentPolygon, 
  onPolygonUpdate,
  currentHoles = [],
  onHolesUpdate,
  isCreatingHole = false,
  currentHole = [],
  onHoleUpdate,
  ndviColors,
  onFieldClick,
  selectedField,
  initialCenter = [54.9924, 73.3686],
  initialZoom = 10,
}: FieldMapProps) {

  const handleMainPolygonDrag = (index: number, newPosition: [number, number]) => {
    const newPolygon = [...currentPolygon]
    newPolygon[index] = [newPosition[1], newPosition[0]]
    onPolygonUpdate(newPolygon)
  }

  const handleMainPolygonDelete = (index: number) => {
    if (currentPolygon.length > 3) {
      const newPolygon = currentPolygon.filter((_, i) => i !== index)
      onPolygonUpdate(newPolygon)
    }
  }

  const handleHoleDrag = (index: number, newPosition: [number, number]) => {
    if (onHoleUpdate) {
      const newHole = [...currentHole]
      newHole[index] = [newPosition[1], newPosition[0]]
      onHoleUpdate(newHole)
    }
  }

  const handleHoleDelete = (index: number) => {
    if (onHoleUpdate && currentHole.length > 3) {
      const newHole = currentHole.filter((_, i) => i !== index)
      onHoleUpdate(newHole)
    }
  }

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        attribution="&copy; Google Satellite"
        maxZoom={20}
      />

      <DrawingHandler
        isDrawing={isDrawing}
        currentPolygon={currentPolygon}
        onPolygonUpdate={onPolygonUpdate}
        isCreatingHole={isCreatingHole}
        currentHole={currentHole}
        onHoleUpdate={onHoleUpdate}
      />

      <FlyToField field={selectedField} />

        {fields.map((field) => {
            const mainPolygonCoords = getPolygonPositions(field.coordinates);
            const ndviValue = ndviColors ? ndviColors[field.id] : undefined
            const fillColor = ndviValue !== undefined && ndviValue !== null
              ? getNdviColor(ndviValue)
              : '#27ae60'
            const eventHandlers = onFieldClick
              ? { click: () => onFieldClick(field) }
              : {}

            if (field.holes && field.holes.length > 0) {
                const allPolygons = [
                    mainPolygonCoords,
                    ...field.holes.map(hole => getPolygonPositions(hole))
                ];
                return (
                    <Polygon
                        key={field.id}
                        positions={allPolygons}
                        pathOptions={{
                            fillColor,
                            fillOpacity: 0.45,
                            color: fillColor,
                            weight: 2
                        }}
                        eventHandlers={eventHandlers}
                    />
                );
            } else {
                return (
                    <Polygon
                        key={field.id}
                        positions={mainPolygonCoords}
                        pathOptions={{
                            fillColor,
                            fillOpacity: 0.45,
                            color: fillColor,
                            weight: 2
                        }}
                        eventHandlers={eventHandlers}
                    />
                );
            }
        })}

      {currentPolygon.length >= 3 && (() => {
        if (!isDrawing && !isCreatingHole && currentHoles.length > 0) {
          const positions = [
            getPolygonPositions(currentPolygon),
            ...currentHoles.map(h => getPolygonPositions(h)),
          ] as [number, number][][]
          return (
            <Polygon
              positions={positions}
              pathOptions={{ fillColor: '#3498db', fillOpacity: 0.35, color: '#3498db', weight: 3 }}
            />
          )
        }
        return (
          <Polygon
            positions={getPolygonPositions(currentPolygon)}
            pathOptions={{
              fillColor: '#3498db',
              fillOpacity: isCreatingHole ? 0.1 : 0.2,
              color: '#3498db',
              weight: 3,
              dashArray: isCreatingHole ? '5, 15' : '10, 10'
            }}
          />
        )
      })()}

      {currentPolygon.length > 0 && !isCreatingHole && currentPolygon.map((coord, index) => (
        <EditablePoint
          key={`main-${index}`}
          position={[coord[1], coord[0]]}
          index={index}
          onDrag={handleMainPolygonDrag}
          onDelete={handleMainPolygonDelete}
          color="#3498db"
          size={10}
          isDeletable={currentPolygon.length > 3}
        />
      ))}

      {(isDrawing || isCreatingHole) && currentHoles.map((hole, holeIndex) => (
        <Polygon
          key={`hole-${holeIndex}`}
          positions={getPolygonPositions(hole)}
          pathOptions={{
            fillColor: '#e74c3c',
            fillOpacity: 0.3,
            color: '#e74c3c',
            weight: 2
          }}
        />
      ))}

      {isCreatingHole && currentHole.length >= 3 && (
        <Polygon
          positions={getPolygonPositions(currentHole)}
          pathOptions={{
            fillColor: '#e74c3c',
            fillOpacity: 0.4,
            color: '#e74c3c',
            weight: 3,
            dashArray: '8, 4'
          }}
        />
      )}
      
      {isCreatingHole && currentHole.length > 0 && currentHole.map((coord, index) => (
        <EditablePoint
          key={`hole-${index}`}
          position={[coord[1], coord[0]]}
          index={index}
          onDrag={handleHoleDrag}
          onDelete={handleHoleDelete}
          color="#e74c3c"
          size={9}
          isDeletable={currentHole.length > 3}
        />
      ))}

      {isDrawing && !isCreatingHole && currentPolygon.length > 1 && (
        <Polyline
          positions={getPolygonPositions(currentPolygon)}
          pathOptions={{
            color: '#3498db',
            weight: 3,
            dashArray: '10, 10'
          }}
        />
      )}

      {isCreatingHole && currentHole.length > 1 && (
        <Polyline
          positions={getPolygonPositions(currentHole)}
          pathOptions={{
            color: '#e74c3c',
            weight: 3,
            dashArray: '8, 4'
          }}
        />

      )}
    </MapContainer>
  )
}