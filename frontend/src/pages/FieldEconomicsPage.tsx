import { useState, useEffect, useCallback } from 'react'
import { Calculator, ChevronDown, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { cropHistoryService } from '../services/cropService'
import { fertilizerApplicationService } from '../services/fertilizerApplicationService'
import { plantProtectionService } from '../services/plantProtectionService'
import { yieldService } from '../services/mlService'
import type { CropHistory } from '../types/CropTypes'
import type { FertilizerApplication, PlantProtectionOperation } from '../types/AgronomicTypes'

interface Field { id: number; fieldName: string; areaHectares?: number }

interface NormativeCosts {
  seedCostPerHa: string
  tillageCostPerHa: string
  harvestCostPerHa: string
  otherCostPerHa: string
  actualYieldCha: string
  pricePerTon: string
}

const DEFAULT_NORMS: NormativeCosts = {
  seedCostPerHa: '1800',
  tillageCostPerHa: '900',
  harvestCostPerHa: '1200',
  otherCostPerHa: '500',
  actualYieldCha: '',
  pricePerTon: '',
}

const CROP_SEED_DEFAULTS: Record<string, string> = {
  'Пшеница яровая': '1600', 'Пшеница озимая': '2000', 'Ячмень яровой': '1400',
  'Подсолнечник': '2200', 'Рапс': '1800', 'Кукуруза': '3000',
  'Горох': '2800', 'Гречиха': '1200', 'Овёс': '1100', 'Просо': '800',
  'Рожь озимая': '1500', 'Лён': '900', 'Соя': '3200',
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

function numOf(s: string) {
  const v = parseFloat(s.replace(',', '.'))
  return isNaN(v) ? 0 : v
}

export default function FieldEconomicsPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [cropHistories, setCropHistories] = useState<CropHistory[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [fertilizers, setFertilizers] = useState<FertilizerApplication[]>([])
  const [protections, setProtections] = useState<PlantProtectionOperation[]>([])
  const [norms, setNorms] = useState<NormativeCosts>(DEFAULT_NORMS)
  const [loading, setLoading] = useState(false)
  const [mlPrice, setMlPrice] = useState<number | null>(null)
  const [mlPriceLabel, setMlPriceLabel] = useState<string | null>(null)

  useEffect(() => {
    fieldService.getAllFields().then((data: any[]) => setFields(data)).catch(() => {})
  }, [])

  const selectedField = fields.find(f => f.id === selectedFieldId)
  const selectedHistory = cropHistories.find(h => h.id === selectedHistoryId)
  const areaHa = selectedField?.areaHectares ?? 0

  const loadHistory = useCallback(async (fieldId: number) => {
    setLoading(true)
    try {
      const all = await cropHistoryService.getAll()
      const forField = all.filter((h: CropHistory) => h.fieldId === fieldId)
        .sort((a: CropHistory, b: CropHistory) =>
          new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime())
      setCropHistories(forField)
      if (forField.length > 0) {
        setSelectedHistoryId(forField[0].id)
      } else {
        setSelectedHistoryId(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedFieldId) return
    loadHistory(selectedFieldId)
  }, [selectedFieldId, loadHistory])

  useEffect(() => {
    if (!selectedHistoryId) { setFertilizers([]); setProtections([]); return }
    Promise.all([
      fertilizerApplicationService.getByCropHistory(selectedHistoryId),
      plantProtectionService.getByCropHistory(selectedHistoryId),
    ]).then(([f, p]) => {
      setFertilizers(f)
      setProtections(p)
      // подставляем дефолт по культуре
      if (selectedHistory) {
        const seed = CROP_SEED_DEFAULTS[selectedHistory.cropTypeName] ?? '1800'
        setNorms(prev => ({ ...DEFAULT_NORMS, seedCostPerHa: seed, ...{ pricePerTon: prev.pricePerTon } }))
      }
      // Загружаем ML-прогноз цены для культуры
      if (selectedHistory?.cropTypeName) {
        const CROP_NAME_TO_ML_CODE: Record<string, string> = {
          'Пшеница яровая': 'spring_wheat', 'Пшеница озимая': 'winter_wheat',
          'Ячмень яровой': 'spring_barley', 'Подсолнечник': 'sunflower',
          'Рапс': 'rapeseed', 'Кукуруза': 'corn', 'Горох': 'peas',
          'Гречиха': 'buckwheat', 'Лён': 'flax', 'Соя': 'soybean', 'Овёс': 'oat',
        }
        const mlCode = CROP_NAME_TO_ML_CODE[selectedHistory.cropTypeName]
        if (mlCode) {
          const year = new Date(selectedHistory.plantingDate).getFullYear()
          yieldService.forecastRegionsBulk({ crop: mlCode, year })
            .then(res => {
              const oms = res.regions.find(r => r.region_code === 'OMS')
              if (oms?.price_pred) {
                setMlPrice(Math.round(oms.price_pred))
                setMlPriceLabel(`ML-прогноз для ${oms.region_name}, ${year}`)
              } else setMlPrice(null)
            }).catch(() => setMlPrice(null))
        }
      }
    }).catch(() => {})
  }, [selectedHistoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Расчёт ──────────────────────────────────────────────────────────────────

  const fertCostPerHa = fertilizers.reduce((s, f) => s + (f.costPerHa ?? 0), 0)
  const protCostPerHa = protections.reduce((s, p) => s + (p.costPerHa ?? 0), 0)
  const seedCost    = numOf(norms.seedCostPerHa)
  const tillageCost = numOf(norms.tillageCostPerHa)
  const harvestCost = numOf(norms.harvestCostPerHa)
  const otherCost   = numOf(norms.otherCostPerHa)

  const totalCostPerHa = seedCost + tillageCost + harvestCost + otherCost + fertCostPerHa + protCostPerHa
  const totalCost = totalCostPerHa * areaHa

  const yieldCha   = numOf(norms.actualYieldCha)
  const pricePerT  = numOf(norms.pricePerTon)
  const revenuePerHa = yieldCha * 0.1 * pricePerT
  const revenue = revenuePerHa * areaHa

  const profitPerHa = revenuePerHa - totalCostPerHa
  const profit = revenue - totalCost

  const hasRevenue = yieldCha > 0 && pricePerT > 0

  const profitColor = profitPerHa > 0 ? '#22c55e' : profitPerHa < 0 ? '#ef4444' : '#94a3b8'
  const ProfitIcon = profitPerHa > 0 ? TrendingUp : profitPerHa < 0 ? TrendingDown : Minus

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Calculator size={22} color="#16a34a" />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Экономика поля</h1>
      </div>

      {/* Выбор поля и сезона */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <label style={labelStyle}>
          <span style={labelText}>Поле</span>
          <div style={selectWrap}>
            <select
              style={selectStyle}
              value={selectedFieldId ?? ''}
              onChange={e => { setSelectedFieldId(Number(e.target.value)); setCropHistories([]); setSelectedHistoryId(null) }}
            >
              <option value="">— выберите поле —</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>
                  {f.fieldName}{f.areaHectares ? ` (${f.areaHectares} га)` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Сезон (история посевов)</span>
          <div style={selectWrap}>
            <select
              style={selectStyle}
              value={selectedHistoryId ?? ''}
              onChange={e => setSelectedHistoryId(Number(e.target.value))}
              disabled={!selectedFieldId || cropHistories.length === 0}
            >
              {cropHistories.length === 0
                ? <option value="">— нет записей —</option>
                : cropHistories.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.cropTypeName} · {new Date(h.plantingDate).getFullYear()}
                      {h.actualHarvestDate ? `–${new Date(h.actualHarvestDate).getFullYear()}` : ''}
                    </option>
                  ))
              }
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>
        </label>
      </div>

      {loading && <p style={{ color: '#64748b', textAlign: 'center' }}>Загрузка...</p>}

      {selectedHistoryId && !loading && (
        <>
          {/* Сводка из журналов */}
          <div style={sectionCard}>
            <div style={sectionTitle}>Из журналов хозяйства</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <CostRow
                label={`Удобрения (${fertilizers.length} записей)`}
                perHa={fertCostPerHa}
                total={fertCostPerHa * areaHa}
                hint={fertilizers.length === 0 ? 'Нет данных о стоимости — добавьте в журнал удобрений' : undefined}
              />
              <CostRow
                label={`Защита растений (${protections.length} операций)`}
                perHa={protCostPerHa}
                total={protCostPerHa * areaHa}
                hint={protections.length === 0 ? 'Нет данных о стоимости — добавьте в журнал защиты' : undefined}
              />
            </div>
          </div>

          {/* Нормативные затраты */}
          <div style={sectionCard}>
            <div style={sectionTitle}>Нормативные затраты (редактируемые)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NormInput label="Семена, ₽/га" value={norms.seedCostPerHa}
                onChange={v => setNorms(p => ({ ...p, seedCostPerHa: v }))} />
              <NormInput label="Обработка почвы, ₽/га" value={norms.tillageCostPerHa}
                onChange={v => setNorms(p => ({ ...p, tillageCostPerHa: v }))} />
              <NormInput label="Уборка, ₽/га" value={norms.harvestCostPerHa}
                onChange={v => setNorms(p => ({ ...p, harvestCostPerHa: v }))} />
              <NormInput label="Прочее, ₽/га" value={norms.otherCostPerHa}
                onChange={v => setNorms(p => ({ ...p, otherCostPerHa: v }))} />
            </div>
          </div>

          {/* Выручка */}
          <div style={sectionCard}>
            <div style={sectionTitle}>Выручка</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NormInput label="Фактическая урожайность, ц/га" value={norms.actualYieldCha}
                onChange={v => setNorms(p => ({ ...p, actualYieldCha: v }))} placeholder="напр. 24.5" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <NormInput label="Цена реализации, ₽/т" value={norms.pricePerTon}
                  onChange={v => setNorms(p => ({ ...p, pricePerTon: v }))} placeholder="напр. 10500" />
                {mlPrice && (
                  <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Info size={11} color="#94a3b8" />
                    {mlPriceLabel}: <b style={{ color: '#3b82f6' }}>{mlPrice.toLocaleString('ru-RU')} ₽/т</b>
                    <button
                      type="button"
                      onClick={() => setNorms(p => ({ ...p, pricePerTon: String(mlPrice) }))}
                      style={{ fontSize: 10, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >подставить</button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Итог */}
          <div style={{ ...sectionCard, background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
            <div style={sectionTitle}>Итог{areaHa > 0 ? ` · поле ${areaHa} га` : ''}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <SummaryCard label="Затраты на 1 га" value={`${fmt(totalCostPerHa)} ₽`} sub={areaHa > 0 ? `${fmt(totalCost)} ₽ итого` : undefined} color="#ef4444" />
              <SummaryCard
                label="Выручка на 1 га"
                value={hasRevenue ? `${fmt(revenuePerHa)} ₽` : '—'}
                sub={hasRevenue && areaHa > 0 ? `${fmt(revenue)} ₽ итого` : 'введите урожайность и цену'}
                color="#3b82f6"
              />
              <SummaryCard
                label="Прибыль на 1 га"
                value={hasRevenue ? `${profitPerHa >= 0 ? '+' : ''}${fmt(profitPerHa)} ₽` : '—'}
                sub={hasRevenue && areaHa > 0 ? `${profit >= 0 ? '+' : ''}${fmt(profit)} ₽ итого` : undefined}
                color={profitColor}
                icon={<ProfitIcon size={16} color={profitColor} />}
              />
            </div>

            {/* Детализация затрат */}
            <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Структура затрат (₽/га)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                {[
                  ['Семена', seedCost],
                  ['Обработка', tillageCost],
                  ['Уборка', harvestCost],
                  ['Удобрения', fertCostPerHa],
                  ['Защита', protCostPerHa],
                  ['Прочее', otherCost],
                ].filter(([, v]) => (v as number) > 0).map(([lbl, val]) => (
                  <span key={lbl as string} style={{ fontSize: 12, color: '#475569' }}>
                    <b>{lbl as string}</b>: {fmt(val as number)} ₽
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedFieldId && (
        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 60 }}>
          <Calculator size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p>Выберите поле чтобы начать расчёт</p>
        </div>
      )}
    </div>
  )
}

// ── Вспомогательные компоненты ───────────────────────────────────────────────

function CostRow({ label, perHa, total, hint }: { label: string; perHa: number; total: number; hint?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {hint && <span title={hint}><Info size={12} color="#94a3b8" /></span>}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: perHa > 0 ? '#0f172a' : '#94a3b8' }}>
        {perHa > 0 ? `${fmt(perHa)} ₽/га` : '—'}
      </div>
      {perHa > 0 && total > 0 && (
        <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(total)} ₽ итого</div>
      )}
    </div>
  )
}

function NormInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px',
          fontSize: 14, color: '#0f172a', background: '#fff', outline: 'none',
          width: '100%', boxSizing: 'border-box',
        }}
      />
    </label>
  )
}

function SummaryCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${color}22`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 18, color, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}{value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Стили ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const labelText: React.CSSProperties = { fontSize: 12, color: '#64748b' }
const selectWrap: React.CSSProperties = { position: 'relative' }
const selectStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: 6,
  padding: '8px 32px 8px 10px', fontSize: 14, color: '#0f172a',
  background: '#fff', appearance: 'none', outline: 'none', cursor: 'pointer',
}
const sectionCard: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
  padding: '16px', marginBottom: 16,
}
const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 12,
}
