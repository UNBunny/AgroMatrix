import { X, Eye, TrendingUp } from 'lucide-react'
import { Field } from '../../types/Field'
import { getNdviBadge } from '../ui/Badge'
import { getNdviLabel } from '../../services/ndviService'
import { getFieldStatusLabel } from '../../utils/fieldUtils'

interface FieldDetailPanelProps {
  field: Field
  ndviValue: number | null | undefined
  onClose: () => void
  onNavigateDetails: () => void
  onNavigateRecommendations?: (fieldId: number) => void
}

/**
 * Правая панель карты с деталями выбранного поля.
 * Извлечена из MapPage для переиспользования.
 */
export function FieldDetailPanel({
  field,
  ndviValue,
  onClose,
  onNavigateDetails,
  onNavigateRecommendations,
}: FieldDetailPanelProps) {
  return (
    <div className="field-detail-panel">
      <div className="field-detail-panel-header">
        <div>
          <div className="field-detail-panel-name">🌾 {field.fieldName}</div>
          <div className="field-detail-panel-area">{field.areaHectares} га</div>
        </div>
        <button
          className="btn-icon"
          style={{ color: 'rgba(255,255,255,0.8)' }}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="field-detail-panel-body">
        <div className="field-detail-row">
          <span className="field-detail-label">Культура</span>
          <span className="field-detail-value">{field.crop_type || '—'}</span>
        </div>
        <div className="field-detail-row">
          <span className="field-detail-label">Статус</span>
          <span className="field-detail-value">{getFieldStatusLabel(field.status)}</span>
        </div>
        <div className="field-detail-row">
          <span className="field-detail-label">Площадь</span>
          <span className="field-detail-value">{field.areaHectares} га</span>
        </div>
        <div className="field-detail-row">
          <span className="field-detail-label">Точек контура</span>
          <span className="field-detail-value">{field.coordinates.length}</span>
        </div>
        <div className="field-detail-row" style={{ borderBottom: 'none' }}>
          <span className="field-detail-label">NDVI</span>
          <span>{getNdviBadge(ndviValue)}</span>
        </div>
        {ndviValue !== undefined && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
            {getNdviLabel(ndviValue)}
          </div>
        )}
      </div>

      <div className="field-detail-panel-actions">
        {onNavigateRecommendations && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateRecommendations(field.id)}
          >
            <TrendingUp size={14} /> Рекомендации
          </button>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={onNavigateDetails}
        >
          <Eye size={14} /> Детали
        </button>
      </div>
    </div>
  )
}

