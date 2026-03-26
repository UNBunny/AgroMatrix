import { useState, useEffect } from 'react'
import { ShieldAlert, Thermometer, Droplets, Sun, Bug, Loader2, Info } from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { recommendationService, DiseaseRiskResponse } from '../services/recommendationService'
import { Field } from '../types/Field'

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#e74c3c',
  HIGH: '#e67e22',
  MEDIUM: '#f1c40f',
  LOW: '#27ae60',
}

const RISK_LABELS: Record<string, string> = {
  CRITICAL: 'Критический',
  HIGH: 'Высокий',
  MEDIUM: 'Средний',
  LOW: 'Низкий',
}

function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className="badge"
      style={{
        background: RISK_COLORS[level] ?? '#999',
        color: '#fff',
        fontWeight: 600,
        fontSize: 11,
        padding: '3px 10px',
      }}
    >
      {RISK_LABELS[level] ?? level}
    </span>
  )
}

function RiskCard({ title, icon, level, score, description }: {
  title: string; icon: React.ReactNode; level: string; score: number; description: string
}) {
  return (
    <div className="card card-padding" style={{ borderLeft: `3px solid ${RISK_COLORS[level] ?? '#999'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon}
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        <div style={{ marginLeft: 'auto' }}><RiskBadge level={level} /></div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{description}</div>
      <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score * 100}%`, borderRadius: 3,
          background: RISK_COLORS[level], transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

export default function DiseaseRiskPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [crop, setCrop] = useState('пшеница')
  const [result, setResult] = useState<DiseaseRiskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fieldService.getAllFields()
      .then(data => { setFields(data); setFieldsLoading(false) })
      .catch(() => setFieldsLoading(false))
  }, [])

  const fetchRisk = async () => {
    if (!selectedFieldId) return
    try {
      setLoading(true); setError(null); setResult(null)
      const data = await recommendationService.getDiseaseRisk(selectedFieldId, crop)
      setResult(data)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка оценки рисков')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">Оценка рисков</h1>
      </div>

      {/* Форма */}
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
              Поле
            </label>
            <select
              className="input"
              value={selectedFieldId ?? ''}
              onChange={e => setSelectedFieldId(Number(e.target.value) || null)}
              disabled={fieldsLoading}
            >
              <option value="">— Выберите поле —</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.fieldName} ({f.areaHectares} га)</option>
              ))}
            </select>
          </div>
          <div style={{ width: 180 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
              Культура
            </label>
            <select className="input" value={crop} onChange={e => setCrop(e.target.value)}>
              <option value="пшеница">Пшеница</option>
              <option value="пшеница яровая">Пшеница яровая</option>
              <option value="пшеница озимая">Пшеница озимая</option>
              <option value="ячмень">Ячмень</option>
              <option value="кукуруза">Кукуруза</option>
              <option value="подсолнечник">Подсолнечник</option>
              <option value="соя">Соя</option>
              <option value="рапс">Рапс</option>
              <option value="горох">Горох</option>
              <option value="овёс">Овёс</option>
              <option value="гречиха">Гречиха</option>
              <option value="лён">Лён</option>
              <option value="чечевица">Чечевица</option>
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={fetchRisk}
            disabled={!selectedFieldId || loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <ShieldAlert size={16} />}
            Оценить риски
          </button>
        </div>
      </div>

      {error && (
        <div className="card card-padding mb-20" style={{ borderLeft: '3px solid var(--color-danger)' }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{error}</div>
        </div>
      )}

      {result && (
        <>
          {/* Общий уровень */}
          <div className="card card-padding mb-20" style={{
            background: 'var(--color-bg-subtle)',
            borderLeft: `4px solid ${RISK_COLORS[result.overallRiskLevel]}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShieldAlert size={24} color={RISK_COLORS[result.overallRiskLevel]} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {result.fieldName} — {result.cropName}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Общий уровень риска: <RiskBadge level={result.overallRiskLevel} />
                  <span style={{ marginLeft: 8 }}>({(result.overallRiskScore * 100).toFixed(0)}%)</span>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
                {result.dataSource === 'FORECAST' ? '📡 Прогноз' :
                 result.dataSource === 'HISTORICAL' ? '📊 Исторические' : '⚠️ Приблизительно'}
              </div>
            </div>
          </div>

          {/* Погодные данные */}
          {(result.avgTemp !== null || result.sumPrecipitation !== null || result.gtk !== null) && (
            <div className="grid-4 mb-20">
              {result.avgTemp !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Thermometer size={18} color="#e67e22" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.avgTemp.toFixed(1)}°C</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Ср. температура</div>
                </div>
              )}
              {result.sumPrecipitation !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Droplets size={18} color="#3498db" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.sumPrecipitation.toFixed(1)} мм</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Осадки</div>
                </div>
              )}
              {result.gtk !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Droplets size={18} color="#2ecc71" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.gtk.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>ГТК</div>
                </div>
              )}
              {result.heatStressDays !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Sun size={18} color="#e74c3c" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.heatStressDays}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Дней жары</div>
                </div>
              )}
            </div>
          )}

          {/* Абиотические риски */}
          <div className="grid-3 mb-20">
            <RiskCard
              title="Засуха"
              icon={<Droplets size={16} color={RISK_COLORS[result.droughtRisk]} />}
              level={result.droughtRisk}
              score={result.droughtScore}
              description={result.droughtDescription}
            />
            <RiskCard
              title="Заморозки"
              icon={<Thermometer size={16} color={RISK_COLORS[result.frostRisk]} />}
              level={result.frostRisk}
              score={result.frostScore}
              description={result.frostDescription}
            />
            <RiskCard
              title="Тепловой стресс"
              icon={<Sun size={16} color={RISK_COLORS[result.heatStressRisk]} />}
              level={result.heatStressRisk}
              score={result.heatStressScore}
              description={result.heatStressDescription}
            />
          </div>

          {/* Болезни */}
          {result.diseaseRisks.length > 0 && (
            <div className="card mb-20">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bug size={16} color="#e74c3c" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Риски болезней</span>
                <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{result.diseaseRisks.length}</span>
              </div>
              {result.diseaseRisks.map(d => (
                <div key={d.ruleId} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{d.diseaseName}</span>
                    <RiskBadge level={d.riskLevel} />
                    {d.urgencyDays && (
                      <span style={{ fontSize: 11, color: 'var(--color-danger)', marginLeft: 8 }}>
                        ⏰ {d.urgencyDays} дн.
                      </span>
                    )}
                  </div>
                  {d.ruleDescription && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{d.ruleDescription}</div>
                  )}
                  {d.triggeredConditions.length > 0 && (
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      {d.triggeredConditions.map((c, i) => (
                        <div key={i} style={{ padding: '2px 0', color: '#e67e22' }}>• {c}</div>
                      ))}
                    </div>
                  )}
                  {(d.preventionAdvice || d.treatmentAdvice) && (
                    <div style={{ fontSize: 12, color: '#27ae60' }}>
                      {d.preventionAdvice && <div>💊 {d.preventionAdvice}</div>}
                      {d.treatmentAdvice && <div>🔬 {d.treatmentAdvice}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Рекомендации */}
          {result.recommendations.length > 0 && (
            <div className="card card-padding mb-20">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Info size={16} color="#3498db" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Рекомендации</span>
              </div>
              {result.recommendations.map((rec, i) => (
                <div key={i} style={{ fontSize: 13, padding: '6px 0', lineHeight: 1.5 }}>{rec}</div>
              ))}
            </div>
          )}
        </>
      )}

      {!result && !loading && !error && (
        <div className="card card-padding" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Выберите поле и культуру</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Система оценит риски засухи, заморозков, теплового стресса и болезней на основе прогноза погоды
          </div>
        </div>
      )}
    </div>
  )
}
