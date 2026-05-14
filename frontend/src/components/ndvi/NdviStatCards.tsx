import { Satellite } from 'lucide-react'
import { getNdviColor } from '../../services/ndviService'
import { getNdviBadge } from '../ui/Badge'
import { NdviRecord } from '../../types/Field'

function fmtShort(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface NdviStatCardsProps {
  currentNdvi: number | null
  maxNdvi: number | null
  minNdvi: number | null
  maxRecord?: NdviRecord | null
  minRecord?: NdviRecord | null
}

/**
 * Три карточки статистики NDVI: текущий, максимум, минимум.
 * Извлечены из NdviMonitoringPage для переиспользования.
 */
export function NdviStatCards({
  currentNdvi,
  maxNdvi,
  minNdvi,
  maxRecord,
  minRecord,
}: NdviStatCardsProps) {
  return (
    <div className="grid-3 mb-20">
      <div className="stat-card">
        <div className="stat-card-header">
          <div className="stat-card-icon green"><Satellite size={16} /></div>
        </div>
        <div className="stat-card-value" style={{ color: getNdviColor(currentNdvi) }}>
          {currentNdvi != null ? currentNdvi.toFixed(3) : '—'}
        </div>
        <div className="stat-card-label">Текущий NDVI</div>
        <div style={{ marginTop: 6 }}>{getNdviBadge(currentNdvi)}</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <div className="stat-card-icon green">📈</div>
        </div>
        <div className="stat-card-value" style={{ color: getNdviColor(maxNdvi) }}>
          {maxNdvi != null ? maxNdvi.toFixed(3) : '—'}
        </div>
        <div className="stat-card-label">Максимум за период</div>
        {maxRecord && <div className="text-muted mt-4">{fmtShort(maxRecord.date)}</div>}
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <div className="stat-card-icon red">📉</div>
        </div>
        <div className="stat-card-value" style={{ color: getNdviColor(minNdvi) }}>
          {minNdvi != null ? minNdvi.toFixed(3) : '—'}
        </div>
        <div className="stat-card-label">Минимум за период</div>
        {minRecord && <div className="text-muted mt-4">{fmtShort(minRecord.date)}</div>}
      </div>
    </div>
  )
}

