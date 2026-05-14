import { useState } from 'react'
import {
  FlaskConical, ShieldAlert, Thermometer, Droplets,
  Loader2, ChevronRight, AlertTriangle, Info, Leaf, CheckCircle,
} from 'lucide-react'
import {
  protectionCatalogService,
  CatalogFilterResponse,
  ProductRecommendationDto,
  ThreatAnalysisResponse,
  ThreatRecommendation,
} from '../services/protectionCatalogService'

// ── Constants & helpers ────────────────────────────────────────────────────

const CROP_RU_TO_ML: Record<string, string> = {
  'Пшеница яровая': 'spring_wheat', 'Пшеница озимая': 'winter_wheat',
  'Ячмень яровой': 'spring_barley', 'Ячмень': 'spring_barley',
  'Кукуруза': 'corn', 'Подсолнечник': 'sunflower', 'Соя': 'soybean',
  'Рапс': 'rapeseed', 'Горох': 'peas', 'Гречиха': 'buckwheat',
  'Лён масличный': 'flax', 'Лён': 'flax', 'Рожь': 'rye',
  'Овёс': 'oat', 'Просо': 'millet',
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#e74c3c', HIGH: '#e67e22', MEDIUM: '#f39c12', LOW: '#27ae60',
}
const RISK_LABELS: Record<string, string> = {
  CRITICAL: 'Критический', HIGH: 'Высокий', MEDIUM: 'Умеренный', LOW: 'Низкий',
}

const FRAC_PALETTE: Record<string, string> = {
  G1: '#8e44ad', G2: '#16a085', C3: '#2471a3',
  M3: '#d35400', MBC: '#c0392b', '4': '#1e8449',
  '11': '#1a5276', '7': '#6c3483',
}

function fracColor(code: string | null): string {
  if (!code) return '#7f8c8d'
  return FRAC_PALETTE[code.split('+')[0].trim()] ?? '#7f8c8d'
}

function bbchLabel(s: number): string {
  if (s <= 9) return 'Прорастание'
  if (s <= 19) return 'Всходы'
  if (s <= 29) return 'Кущение'
  if (s <= 39) return 'Выход в трубку'
  if (s <= 49) return 'Флаг-лист'
  if (s <= 59) return 'Колошение'
  if (s <= 69) return 'Цветение'
  if (s <= 79) return 'Налив зерна'
  if (s <= 89) return 'Созревание'
  return 'Полная спелость'
}

function lwhRisk(h: number): string {
  if (h >= 12) return 'CRITICAL'
  if (h >= 8)  return 'HIGH'
  if (h >= 4)  return 'MEDIUM'
  return 'LOW'
}

// ── Shared micro-components ────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  return (
    <span style={{
      background: RISK_COLORS[level] ?? '#999', color: '#fff',
      fontWeight: 700, fontSize: 10, padding: '2px 9px',
      borderRadius: 20, display: 'inline-block', letterSpacing: '0.3px',
    }}>
      {RISK_LABELS[level] ?? level}
    </span>
  )
}

function FracBadge({ code }: { code: string | null }) {
  if (!code) return null
  const isCombo = code.includes('+')
  return (
    <span style={{
      background: fracColor(code), color: '#fff',
      fontSize: 10, fontWeight: 700, padding: '2px 7px',
      borderRadius: 4, display: 'inline-block', letterSpacing: '0.5px',
    }}>
      FRAC {code}{isCombo ? ' ✦' : ''}
    </span>
  )
}

// ── Filter funnel ─────────────────────────────────────────────────────────

function FilterFunnel({ r }: { r: CatalogFilterResponse }) {
  const steps = [
    { label: 'Каталог', value: r.totalCandidates, color: '#85929e' },
    { label: 'BBCH', value: r.afterBbchFilter, color: '#2980b9' },
    { label: 'Тип', value: r.afterTypeFilter, color: '#8e44ad' },
    { label: 'Темп.', value: r.afterTempFilter, color: '#e67e22' },
    { label: 'Итого', value: r.finalCount, color: '#27ae60' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: s.color,
              background: s.color + '1a', borderRadius: 8,
              padding: '4px 14px', display: 'inline-block', minWidth: 40,
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3 }}>{s.label}</div>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight size={14} color="var(--color-text-muted)" style={{ marginTop: -12 }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Product card (shared for both filter and ML results) ───────────────────

interface CardProduct {
  productName: string
  fracCode: string | null
  fracGroup: string | null
  diseaseName: string
  pathogenLatin?: string | null
  diseaseType: string
  activeIngredients: string
  aiConcentration?: string | null
  doseRate: string
  bbchFrom: number | null
  bbchTo: number | null
  tempMinC: number | null
  tempMaxC: number | null
  tempOptC?: number | null
  phiDays: number
  isOptimalTemp?: boolean
}

function ProductCard({ p, rationale }: { p: CardProduct; rationale: string }) {
  return (
    <div className="card mb-12" style={{ overflow: 'hidden' }}>
      {/* ── header ── */}
      <div style={{
        padding: '11px 16px',
        background: 'var(--color-bg-subtle)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            🧪 {p.productName}
            {p.isOptimalTemp && (
              <span style={{ fontSize: 11, color: '#27ae60', fontWeight: 600 }}>✓ опт.T</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {p.diseaseName}
            {p.pathogenLatin && <em style={{ marginLeft: 6, opacity: 0.75 }}>({p.pathogenLatin})</em>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <FracBadge code={p.fracCode} />
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px',
            borderRadius: 12, background: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}>
            {p.diseaseType}
          </span>
        </div>
      </div>

      {/* ── body ── */}
      <div style={{ padding: '10px 16px' }}>
        {/* Active ingredients */}
        <div style={{ fontSize: 12, marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>ДВ: </span>
          {p.activeIngredients}
          {p.aiConcentration && (
            <span style={{
              marginLeft: 6, fontSize: 11, padding: '1px 6px',
              background: 'var(--color-bg-subtle)', borderRadius: 4,
              color: 'var(--color-text-muted)',
            }}>
              {p.aiConcentration}
            </span>
          )}
          {p.fracGroup && (
            <span style={{ marginLeft: 6, fontSize: 11, color: fracColor(p.fracCode) }}>
              ({p.fracGroup})
            </span>
          )}
        </div>

        {/* Key parameters row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
          <Chip icon={<FlaskConical size={12} color="#2471a3" />} bg="#eaf4fd">
            {p.doseRate}
          </Chip>
          {p.bbchFrom != null && p.bbchTo != null && (
            <Chip icon={<Leaf size={12} color="#1e8449" />} bg="#eafaf1">
              BBCH {p.bbchFrom}–{p.bbchTo}
            </Chip>
          )}
          {(p.tempMinC != null || p.tempMaxC != null) && (
            <Chip icon={<Thermometer size={12} color="#e67e22" />} bg="#fdf2e9">
              {p.tempMinC != null ? `+${p.tempMinC}` : '—'}..
              {p.tempMaxC != null ? `+${p.tempMaxC}` : '—'}°C
            </Chip>
          )}
          {p.phiDays > 0 && (
            <Chip bg="#fdfbea">⏳ PHI {p.phiDays} дн.</Chip>
          )}
        </div>

        {/* Rationale */}
        {rationale && (
          <div style={{
            fontSize: 11, color: '#566573', lineHeight: 1.55,
            background: 'var(--color-bg-subtle)', borderRadius: 6,
            padding: '6px 10px', borderLeft: '3px solid var(--color-border)',
          }}>
            💬 {rationale}
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ icon, bg, children }: { icon?: React.ReactNode; bg: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: bg, borderRadius: 6, padding: '4px 10px',
      fontSize: 12, fontWeight: 600,
    }}>
      {icon}{children}
    </div>
  )
}

// ── Filter result panel ────────────────────────────────────────────────────

function FilterResultPanel({ result }: { result: CatalogFilterResponse }) {
  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <CheckCircle size={16} color="#27ae60" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            Подобрано препаратов: {result.finalCount}
          </span>
          {result.appliedDiseaseType && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 12,
              background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)',
            }}>
              {result.appliedDiseaseType}
            </span>
          )}
        </div>

        <FilterFunnel r={result} />

        {result.fracsRepresented.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              FRAC:
            </span>
            {result.fracsRepresented.map(f => <FracBadge key={f} code={f} />)}
          </div>
        )}
      </div>

      {result.recommendations.length === 0 ? (
        <div className="card card-padding mb-20" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Info size={20} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div>Препаратов, соответствующих всем критериям, не найдено</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Попробуйте расширить фильтр или снять ограничение по типу угрозы</div>
        </div>
      ) : (
        result.recommendations.map((p: ProductRecommendationDto) => (
          <ProductCard
            key={p.entryId}
            p={{
              productName: p.productName,
              fracCode: p.fracCode,
              fracGroup: p.fracGroup,
              diseaseName: p.diseaseName,
              pathogenLatin: p.pathogenLatin,
              diseaseType: p.diseaseType,
              activeIngredients: p.activeIngredients,
              aiConcentration: p.aiConcentration,
              doseRate: p.doseRate,
              bbchFrom: p.bbchFrom,
              bbchTo: p.bbchTo,
              tempMinC: p.tempMinC,
              tempMaxC: p.tempMaxC,
              tempOptC: p.tempOptC,
              phiDays: p.phiDays,
              isOptimalTemp: p.isOptimalTemp,
            }}
            rationale={p.filterRationale}
          />
        ))
      )}
    </>
  )
}

// ── ML analyze result panel ────────────────────────────────────────────────

function AnalyzeResultPanel({ result }: { result: ThreatAnalysisResponse }) {
  return (
    <>
      {/* Risk overview */}
      <div className="card card-padding mb-16"
        style={{ borderLeft: `4px solid ${RISK_COLORS[result.riskLevel] ?? '#999'}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <ShieldAlert size={20} color={RISK_COLORS[result.riskLevel]} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>ML-анализ угроз</span>
              <RiskBadge level={result.riskLevel} />
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Индекс заражения: </span>
                <strong style={{ color: RISK_COLORS[result.riskLevel] }}>
                  {(result.infectionIndex * 100).toFixed(0)}%
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>NDVI-коррекция: </span>
                <strong>{(result.ndviCorrectedIndex * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>
          {result.activeThreats.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                Угрозы
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {result.activeThreats.map(t => (
                  <span key={t} style={{
                    fontSize: 12, padding: '2px 10px', borderRadius: 20,
                    background: '#fdecea', color: '#c0392b', fontWeight: 600,
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {result.analysisNotes && (
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
            {result.analysisNotes}
          </div>
        )}
      </div>

      {/* Nitrogen overload warning */}
      {result.nitrogenOverloadWarning && (
        <div className="card card-padding mb-16"
          style={{ borderLeft: '4px solid #f39c12', display: 'flex', gap: 10 }}>
          <AlertTriangle size={16} color="#e67e22" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>⚠️ Азотная перегрузка / мучнистая роса</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {result.nitrogenOverloadWarning}
            </div>
          </div>
        </div>
      )}

      {/* FRAC codes used */}
      {result.fracsUsedRecently.length > 0 && (
        <div className="card card-padding mb-16"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            FRAC в рекомендациях:
          </span>
          {result.fracsUsedRecently.map(f => <FracBadge key={f} code={f} />)}
        </div>
      )}

      {/* Products */}
      {result.recommendations.length === 0 ? (
        <div className="card card-padding mb-20"
          style={{ display: 'flex', gap: 8, color: '#27ae60' }}>
          <Info size={16} />
          Уровень риска низкий — защитная обработка не требуется
        </div>
      ) : (
        result.recommendations.map((r: ThreatRecommendation, i: number) => (
          <ProductCard
            key={i}
            p={{
              productName: r.productName,
              fracCode: r.fracCode,
              fracGroup: r.fracGroup,
              diseaseName: r.diseaseName,
              diseaseType: 'FUNGAL',
              activeIngredients: r.activeIngredients,
              doseRate: r.doseRate,
              bbchFrom: r.bbchFrom,
              bbchTo: r.bbchTo,
              tempMinC: r.tempMinC,
              tempMaxC: r.tempMaxC,
              phiDays: r.phiDays,
            }}
            rationale={r.rationale}
          />
        ))
      )}
    </>
  )
}

// ── Main exported component ────────────────────────────────────────────────

export default function ProtectionCatalogTab({
  fieldId,
  cropRu,
}: {
  fieldId: number
  cropRu: string
}) {
  const cropCode = CROP_RU_TO_ML[cropRu] ?? 'spring_wheat'

  const [bbch, setBbch] = useState(45)
  const [tempC, setTempC] = useState(18)
  const [humidity, setHumidity] = useState(75)
  const [lwh, setLwh] = useState(8)
  const [diseaseType, setDiseaseType] = useState('FUNGAL')

  const [filterResult, setFilterResult] = useState<CatalogFilterResponse | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<ThreatAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const busy = loading || analyzing

  const doFilter = async () => {
    try {
      setLoading(true); setError(null)
      setFilterResult(null); setAnalyzeResult(null)
      const result = await protectionCatalogService.filterCatalog({
        cropCode, bbchStage: bbch, tempC, humidity,
        leafWetnessHours: lwh,
        diseaseType: diseaseType || null,
        mlRiskLevel: null, mlPathogenName: null, mlInfectionIndex: null,
      })
      setFilterResult(result)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Ошибка фильтрации каталога')
    } finally { setLoading(false) }
  }

  const doAnalyze = async () => {
    try {
      setAnalyzing(true); setError(null)
      setFilterResult(null); setAnalyzeResult(null)
      const result = await protectionCatalogService.analyzeField({
        fieldId, bbchStage: bbch, targetDiseases: [],
      })
      setAnalyzeResult(result)
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message
        ?? 'Ошибка ML-анализа — убедитесь, что weather-service и ndvi-service запущены'
      )
    } finally { setAnalyzing(false) }
  }

  const currentLwhRisk = lwhRisk(lwh)

  return (
    <>
      {/* ── Form card ── */}
      <div className="card card-padding mb-20">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FlaskConical size={15} color="#8e44ad" />
          Параметры фильтрации каталога СЗР
        </div>

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          {/* Crop code (read-only) */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Культура (ML-код)
            </label>
            <div className="input" style={{
              background: 'var(--color-bg-subtle)', cursor: 'default',
              fontSize: 13, color: 'var(--color-text-muted)',
            }}>
              {cropCode}
            </div>
          </div>

          {/* BBCH slider */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Фаза BBCH:&nbsp;
              <strong style={{ color: 'var(--color-text)', fontSize: 13 }}>{bbch}</strong>
              &nbsp;&nbsp;
              <span style={{ fontWeight: 400, color: '#8e44ad' }}>{bbchLabel(bbch)}</span>
            </label>
            <input
              type="range" min={0} max={99} value={bbch}
              onChange={e => setBbch(+e.target.value)}
              style={{ width: '100%', marginTop: 2, accentColor: '#8e44ad' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--color-text-muted)', marginTop: 1 }}>
              <span>Посев</span><span>Кущение</span><span>Колос</span><span>Зерно</span>
            </div>
          </div>

          {/* Disease type */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Тип угрозы
            </label>
            <select className="input" value={diseaseType} onChange={e => setDiseaseType(e.target.value)}>
              <option value="">Все типы</option>
              <option value="FUNGAL">🍄 Грибковые (FUNGAL)</option>
              <option value="INSECT">🐛 Вредители (INSECT)</option>
              <option value="ABIOTIC">☀️ Абиотические (ABIOTIC)</option>
              <option value="BACTERIAL">🦠 Бактериальные (BACTERIAL)</option>
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
          {/* Temperature */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Температура воздуха (°C)
            </label>
            <div style={{ position: 'relative' }}>
              <Thermometer size={14} color="#e67e22" style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
              <input
                type="number" className="input" value={tempC} step={0.5}
                onChange={e => setTempC(+e.target.value)}
                style={{ paddingLeft: 30 }}
              />
            </div>
            {tempC >= 15 && tempC <= 23
              ? <div style={{ fontSize: 10, color: '#27ae60', marginTop: 3 }}>✓ Оптимально для грибков (15–23°C)</div>
              : (tempC < 5 || tempC > 30) && <div style={{ fontSize: 10, color: '#3498db', marginTop: 3 }}>Вне диапазона активности грибков</div>
            }
          </div>

          {/* Humidity */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Относительная влажность (%)
            </label>
            <div style={{ position: 'relative' }}>
              <Droplets size={14} color="#2980b9" style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
              <input
                type="number" className="input" value={humidity} min={0} max={100}
                onChange={e => setHumidity(+e.target.value)}
                style={{ paddingLeft: 30 }}
              />
            </div>
            {humidity >= 85 && (
              <div style={{ fontSize: 10, color: '#e74c3c', marginTop: 3 }}>⚠️ Высокая — риск споруляции патогенов</div>
            )}
          </div>

          {/* LWH */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Увлажнённость листьев LWH (ч)&nbsp;
              <RiskBadge level={currentLwhRisk} />
            </label>
            <input
              type="number" className="input" value={lwh} min={0} max={24} step={0.5}
              onChange={e => setLwh(+e.target.value)}
            />
            {lwh >= 12
              ? <div style={{ fontSize: 10, color: '#e74c3c', marginTop: 3 }}>🚨 Критический порог — гарантированное заражение</div>
              : lwh >= 8
              ? <div style={{ fontSize: 10, color: '#e67e22', marginTop: 3 }}>⚠️ Высокий риск заражения</div>
              : null
            }
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={doFilter} disabled={busy}>
            {loading ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />}
            Подобрать по каталогу
          </button>
          <button
            className="btn btn-secondary" onClick={doAnalyze} disabled={busy}
            title="Загружает актуальные погодные данные и NDVI, затем отправляет на ML-анализ"
          >
            {analyzing ? <Loader2 size={16} className="spin" /> : <ShieldAlert size={16} />}
            Полный ML-анализ
          </button>
          {busy && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {analyzing ? '⏳ Загрузка погоды и NDVI...' : '⏳ Фильтрация каталога...'}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card card-padding mb-20" style={{
          borderLeft: '3px solid var(--color-danger)', color: 'var(--color-danger)',
          display: 'flex', gap: 10,
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>{error}</div>
        </div>
      )}

      {/* Results */}
      {filterResult && <FilterResultPanel result={filterResult} />}
      {analyzeResult && <AnalyzeResultPanel result={analyzeResult} />}

      {/* Empty state */}
      {!filterResult && !analyzeResult && !loading && !analyzing && !error && (
        <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--color-text-muted)' }}>
          <FlaskConical size={48} style={{ opacity: 0.12, marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Настройте параметры и нажмите «Подобрать»
          </div>
          <div style={{ fontSize: 12, maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            <strong>«Подобрать по каталогу»</strong> — мгновенная синхронная фильтрация по BBCH,
            температуре и типу угрозы без внешних запросов.
            <br />
            <strong>«Полный ML-анализ»</strong> — загружает погоду 48 ч и NDVI, рассчитывает
            индекс заражения и поправку на вегетационный индекс.
          </div>
        </div>
      )}
    </>
  )
}
