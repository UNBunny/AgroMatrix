import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  BarChart2, Loader2, AlertTriangle, Calendar, Wheat,
  FileSpreadsheet, FileText,
} from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { cropHistoryService } from '../services/cropService'
import { reportService, FieldReportResponse, FieldReportTimelinePoint } from '../services/reportService'
import { exportToCsv, exportToXlsx, downloadApiXls, REPORT_TIMELINE_COLUMNS } from '../services/exportService'
import { StatCard } from '../components/ui/StatCard'
import { Field } from '../types/Field'
import { CropHistory } from '../types/CropTypes'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().split('T')[0]
const monthsAgo = (n: number) => {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().split('T')[0]
}
const fmtDate = (ds: string) =>
  new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

type ChartMode = 'fertilizer' | 'bbch' | 'ndvi'

export default function FieldReportPage() {
  const { user } = useAuth()
  const canExport = user?.role === 'DIRECTOR' || user?.role === 'ADMIN' || user?.role === 'AGRONOMIST'

  const [fields, setFields] = useState<Field[]>([])
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | ''>('')
  const [selectedCropHistoryId, setSelectedCropHistoryId] = useState<number | ''>('')
  const [dateFrom, setDateFrom] = useState(monthsAgo(6))
  const [dateTo, setDateTo] = useState(today())
  const [chartMode, setChartMode] = useState<ChartMode>('fertilizer')
  const [report, setReport] = useState<FieldReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fieldService.getAllFields().then(setFields).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedFieldId) { setHistories([]); return }
    cropHistoryService.getAll().then(all => {
      setHistories(all.filter(h => h.fieldId === Number(selectedFieldId)))
    }).catch(console.error)
  }, [selectedFieldId])

  async function loadReport() {
    if (!selectedFieldId) return
    setLoading(true); setError(null)
    try {
      const data = await reportService.getFieldReport({
        fieldId: Number(selectedFieldId),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        cropHistoryId: selectedCropHistoryId ? Number(selectedCropHistoryId) : undefined,
      })
      setReport(data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки отчёта')
    } finally {
      setLoading(false)
    }
  }

  function handleExportCsv() {
    if (!report) return
    exportToCsv(
      report.timeline,
      REPORT_TIMELINE_COLUMNS,
      `report_field_${selectedFieldId}_${dateFrom}_${dateTo}.csv`
    )
  }

  function handleExportXlsx() {
    if (!report) return
    exportToXlsx(
      report.timeline,
      REPORT_TIMELINE_COLUMNS,
      `report_field_${selectedFieldId}_${dateFrom}_${dateTo}.xlsx`,
      'Сводный отчёт'
    )
  }

  function handleExportServerXls() {
    if (!selectedFieldId) return
    downloadApiXls(
      `/fields/${selectedFieldId}/report/export`,
      `field-report-${selectedFieldId}.xlsx`
    ).catch(console.error)
  }

  const timelineData: (FieldReportTimelinePoint & { label: string })[] =
    (report?.timeline ?? []).map(p => ({ ...p, label: fmtDate(p.date) }))

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart2 size={22} color="var(--color-primary)" />
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)' }}>
            Сводный отчёт по полю
          </h1>
        </div>
        {canExport && report && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} /> CSV
            </button>
            <button className="btn-secondary" onClick={handleExportXlsx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button className="btn-primary" onClick={handleExportServerXls} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={15} /> XLS (полный)
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label className="form-label">Поле</label>
            <select
              className="form-select"
              value={selectedFieldId}
              onChange={e => { setSelectedFieldId(Number(e.target.value) || ''); setSelectedCropHistoryId('') }}
            >
              <option value="">— Выберите поле —</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.fieldName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Сезон / посев</label>
            <select
              className="form-select"
              value={selectedCropHistoryId}
              onChange={e => setSelectedCropHistoryId(Number(e.target.value) || '')}
              disabled={!selectedFieldId}
            >
              <option value="">— Все сезоны —</option>
              {histories.map(h => (
                <option key={h.id} value={h.id}>
                  {h.cropTypeName} {h.plantingDate ? `(${new Date(h.plantingDate).getFullYear()})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              <Calendar size={13} style={{ marginRight: 4 }} />Дата с
            </label>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">
              <Calendar size={13} style={{ marginRight: 4 }} />Дата по
            </label>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={loadReport}
              disabled={!selectedFieldId || loading}
            >
              {loading ? <Loader2 size={15} className="spin" /> : 'Загрузить'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-warning" style={{ marginBottom: 16 }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {report && (
        <>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard
              icon={<Wheat size={18} />}
              label="Фактический урожай"
              value={report.metrics.actualYieldKg != null ? `${report.metrics.actualYieldKg.toLocaleString('ru-RU')} кг` : '—'}
              iconColor="green"
              subtitle={report.metrics.expectedYieldKg != null ? `Ожидался: ${report.metrics.expectedYieldKg.toLocaleString('ru-RU')} кг` : undefined}
            />
            <StatCard
              icon={<BarChart2 size={18} />}
              label="Внесений удобрений"
              value={report.metrics.totalFertilizerApplications}
              iconColor="blue"
              subtitle={`${report.metrics.totalFertilizerKg.toLocaleString('ru-RU')} кг суммарно`}
            />
            <StatCard
              icon={<BarChart2 size={18} />}
              label="Операций защиты"
              value={report.metrics.totalProtectionOperations}
              iconColor="orange"
            />
            <StatCard
              icon={<Wheat size={18} />}
              label="Фаза BBCH"
              value={report.metrics.lastBbchScale != null ? `BBCH ${report.metrics.lastBbchScale}` : '—'}
              iconColor="green"
              subtitle={report.metrics.lastObservationDate ? `на ${fmtDate(report.metrics.lastObservationDate)}` : undefined}
            />
          </div>

          {/* Chart mode tabs */}
          <div className="card" style={{ padding: '20px 20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Динамика по периоду</span>
              <div className="tabs-bar" style={{ marginBottom: 0 }}>
                {([
                  ['fertilizer', 'Удобрения'],
                  ['bbch',       'BBCH'],
                  ['ndvi',       'NDVI'],
                ] as [ChartMode, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    className={`tab-btn${chartMode === m ? ' active' : ''}`}
                    onClick={() => setChartMode(m)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {timelineData.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0' }}>
                Нет данных для отображения в выбранном периоде
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                {chartMode === 'fertilizer' ? (
                  <BarChart data={timelineData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="fertilizerKg" name="Удобрения (кг)" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="protectionOps" name="Операций защиты" fill="var(--color-warning)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={timelineData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {chartMode === 'bbch' && (
                      <Line
                        type="monotone"
                        dataKey="bbchScale"
                        name="BBCH"
                        stroke="var(--color-accent)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    )}
                    {chartMode === 'ndvi' && (
                      <Line
                        type="monotone"
                        dataKey="ndviMean"
                        name="NDVI"
                        stroke="#27ae60"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Raw data table */}
          {timelineData.length > 0 && (
            <div className="card" style={{ marginTop: 20, padding: '16px 20px', overflowX: 'auto' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Табличные данные</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                    {REPORT_TIMELINE_COLUMNS.map(c => (
                      <th key={c.header} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timelineData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {REPORT_TIMELINE_COLUMNS.map(c => (
                        <td key={c.header} style={{ padding: '7px 12px', color: 'var(--color-text)' }}>
                          {c.accessor(row) ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!report && !loading && !error && (
        <div style={{
          textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px 0',
          border: '2px dashed var(--color-border)', borderRadius: 'var(--border-radius-lg)',
        }}>
          <BarChart2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div style={{ fontSize: 15 }}>Выберите поле и нажмите «Загрузить»</div>
        </div>
      )}
    </div>
  )
}
