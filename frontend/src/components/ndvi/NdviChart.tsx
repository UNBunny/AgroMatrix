import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot
} from 'recharts'
import { getNdviColor } from '../../services/ndviService'
import { NdviRecord } from '../../types/Field'

function fmtShort(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function fmtLong(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
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

interface NdviChartProps {
  history: NdviRecord[]
  selectedRecord: NdviRecord | null
  onRecordClick: (record: NdviRecord) => void
  loading: boolean
}

/**
 * График истории NDVI (recharts AreaChart).
 * Извлечён из NdviMonitoringPage для переиспользования.
 */
export function NdviChart({ history, selectedRecord, onRecordClick, loading }: NdviChartProps) {
  return (
    <div className="card card-padding mb-20">
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📈 История NDVI</div>

      {loading ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ marginRight: 8 }} /> Загрузка данных...
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 0' }}>
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Нет данных за выбранный период</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {/* @ts-ignore — recharts onClick */}
          <AreaChart
            data={history}
            margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
            onClick={(d: any) => {
              if (d?.activePayload?.[0]) {
                const rec = d.activePayload[0].payload as NdviRecord
                onRecordClick(rec)
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
            <XAxis
              dataKey="date"
              tickFormatter={fmtShort}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              interval={Math.max(0, Math.floor(history.length / 8) - 1)}
            />
            <YAxis
              domain={[0, 0.9]}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickFormatter={(v: number) => v.toFixed(1)}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={0.3} stroke="var(--color-danger)" strokeDasharray="4 4"
              label={{ value: 'Критический', position: 'insideTopRight', fontSize: 10, fill: 'var(--color-danger)' }}
            />
            <ReferenceLine
              y={0.5} stroke="var(--color-warning)" strokeDasharray="4 4"
              label={{ value: 'Умеренный', position: 'insideTopRight', fontSize: 10, fill: 'var(--color-warning)' }}
            />
            <Area
              type="monotone" dataKey="mean" stroke="#2d7a45" strokeWidth={2.5}
              fill="url(#ndvi-grad)" dot={false} activeDot={{ r: 5, fill: '#2d7a45' }}
            />
            {selectedRecord && (
              <ReferenceDot
                x={selectedRecord.date} y={selectedRecord.mean} r={6}
                fill={getNdviColor(selectedRecord.mean)} stroke="white" strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 8 }}>
        Кликните по графику — NDVI-карта загрузится автоматически
      </div>
    </div>
  )
}

