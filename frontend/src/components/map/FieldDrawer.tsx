import { Field } from '../../types/Field'
import { SearchInput } from '../ui/SearchInput'
import { getNdviBadge } from '../ui/Badge'

interface FieldDrawerProps {
  fields: Field[]
  ndviMap: Record<number, number | null>
  search: string
  onSearchChange: (value: string) => void
  selectedFieldId: number | null
  onFieldClick: (field: Field) => void
}

/**
 * Левая панель карты со списком полей.
 * Извлечена из MapPage для переиспользования.
 */
export function FieldDrawer({
  fields,
  ndviMap,
  search,
  onSearchChange,
  selectedFieldId,
  onFieldClick,
}: FieldDrawerProps) {
  const filteredFields = fields.filter(f =>
    f.fieldName.toLowerCase().includes(search.toLowerCase()) ||
    (f.crop_type || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="map-left-panel">
      <div className="map-left-panel-header">
        <div className="map-left-panel-title">Поля ({fields.length})</div>
        <SearchInput value={search} onChange={onSearchChange} placeholder="Поиск поля..." />
      </div>
      <div className="map-left-panel-list">
        {filteredFields.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
            Полей не найдено
          </div>
        )}
        {filteredFields.map(field => (
          <div
            key={field.id}
            className={`map-field-card${selectedFieldId === field.id ? ' selected' : ''}`}
            onClick={() => onFieldClick(field)}
          >
            <div className="map-field-card-name">{field.fieldName}</div>
            <div className="map-field-card-meta">
              <span className="map-field-card-area">
                {field.areaHectares} га · {field.crop_type || 'Культура не указана'}
              </span>
              {ndviMap[field.id] !== undefined && getNdviBadge(ndviMap[field.id])}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

