import { useState, useEffect, useMemo } from 'react'
import { priceHistoryService, PriceTimeSeriesResponse, PriceDataPoint } from '../services/priceHistoryService'
import { TrendingUp, Filter, BarChart3, MapPin, Calendar, X } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const CROP_LABELS: Record<string, string> = {
  wheat: 'Пшеница', spring_wheat: 'Пшеница яровая', winter_wheat: 'Пшеница озимая',
  barley: 'Ячмень', spring_barley: 'Ячмень яровой',
  corn: 'Кукуруза', sunflower: 'Подсолнечник', soybean: 'Соя',
  rapeseed: 'Рапс', peas: 'Горох', oat: 'Овёс',
  buckwheat: 'Гречиха', rye: 'Рожь', flax: 'Лён',
  sugar_beet: 'Сахарная свёкла', potato: 'Картофель',
  millet: 'Просо', rice: 'Рис',
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

interface RegionData {
  region: string
  data: PriceTimeSeriesResponse | null
  loading: boolean
  error: string | null
}

interface YearRange {
  min: number
  max: number
}

function formatPrice(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  return `${Math.round(val).toLocaleString('ru-RU')} ₽/т`
}

function formatDateLabel(year: number, month: number): string {
  return `${MONTHS_SHORT[month - 1]} ${year}`
}

interface ChartCardProps extends RegionData {
  yearRange?: YearRange | null
  onClose?: () => void
  expanded?: boolean
}

function ChartCard({ region, data, loading, error, yearRange, onClose, expanded }: ChartCardProps) {
  const chartHeight = expanded ? 350 : 220

  if (loading) {
    return (
      <div className="card" style={{ minHeight: expanded ? 420 : 320, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div className="loading">Загрузка графика...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ minHeight: expanded ? 420 : 320, overflow: 'hidden' }}>
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  if (!data || !data.found || data.data.length === 0) {
    return (
      <div className="card" style={{ minHeight: expanded ? 420 : 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', overflow: 'hidden' }}>
        Нет данных по ценам для региона «{region}»
      </div>
    )
  }

  // Фильтруем данные по выбранному периоду
  const filteredData = yearRange
    ? data.data.filter((p: PriceDataPoint) => p.year >= yearRange.min && p.year <= yearRange.max)
    : data.data

  if (filteredData.length === 0) {
    return (
      <div className="card" style={{ minHeight: expanded ? 420 : 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', overflow: 'hidden' }}>
        Нет данных за выбранный период
      </div>
    )
  }

  // Подготовка данных для графика
  const chartData = filteredData.map((point: PriceDataPoint) => ({
    ...point,
    label: formatDateLabel(point.year, point.month),
    dateKey: `${point.year}-${String(point.month).padStart(2, '0')}`,
  }))

  // Расчет статистики
  const prices = chartData.filter(d => d.price != null).map(d => d.price!)
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
  const lastPrice = chartData[chartData.length - 1]?.price ?? null
  const firstPrice = chartData[0]?.price ?? null
  const totalChange = firstPrice && lastPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

  // Определяем цвет линии в зависимости от тренда
  const lineColor = totalChange >= 0 ? '#27ae60' : '#e74c3c'

  const displayYears = yearRange
    ? `${yearRange.min}—${yearRange.max}`
    : `${data.years[0]}—${data.years[data.years.length - 1]}`

  return (
    <div className="card" style={{ padding: 12, overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, minWidth: 0 }}>
        <MapPin size={16} style={{ color: '#3498db', flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{region}</h3>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888', flexShrink: 0 }}>
          {displayYears}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Скрыть график"
          >
            <X size={16} style={{ color: '#888' }} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10, minWidth: 0 }}>
        <div style={{ textAlign: 'center', padding: '6px 4px', background: '#f8f9fa', borderRadius: 6, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>Текущая</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: lineColor, whiteSpace: 'nowrap' }}>{formatPrice(lastPrice)}</div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px 4px', background: '#f8f9fa', borderRadius: 6, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>Диапазон</div>
          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPrice(minPrice)}—{formatPrice(maxPrice)}</div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px 4px', background: '#f8f9fa', borderRadius: 6, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>Изменение</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: lineColor, whiteSpace: 'nowrap' }}>
            {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ height: chartHeight, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="dateKey"
              tick={{ fontSize: 10 }}
              tickFormatter={(value: string) => {
                const [year, month] = value.split('-')
                return `${MONTHS_SHORT[parseInt(month) - 1]}'${year.slice(2)}`
              }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}к`}
              width={40}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelFormatter={(_: any, payload: any[]) => {
                if (payload && payload[0]) {
                  const p = payload[0].payload as PriceDataPoint & { label: string }
                  return p.label
                }
                return ''
              }}
              formatter={(value: number, name: string) => {
                if (name === 'price') return [formatPrice(value), 'Цена']
                if (name === 'price_ma3') return [formatPrice(value), 'Скольз. средн. 3 мес.']
                if (name === 'price_ma12') return [formatPrice(value), 'Скольз. средн. 12 мес.']
                return [value, name]
              }}
            />
            <ReferenceLine y={avgPrice} stroke="#95a5a6" strokeDasharray="5 5" />
            <Line
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="price_ma3"
              stroke="#9b59b6"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="price_ma12"
              stroke="#3498db"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6, fontSize: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 2, background: lineColor, borderRadius: 1 }} />
          Цена
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 2, background: '#9b59b6', borderRadius: 1 }} />
          MA3
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 2, background: '#3498db', borderRadius: 1 }} />
          MA12
        </span>
      </div>
    </div>
  )
}

export default function PriceHistoryPage() {
  const [regions, setRegions] = useState<string[]>([])
  const [crops, setCrops] = useState<string[]>([])
  const [selectedCrop, setSelectedCrop] = useState('')
  const [regionData, setRegionData] = useState<RegionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleRegions, setVisibleRegions] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [startYear, setStartYear] = useState<number | ''>('')
  const [endYear, setEndYear] = useState<number | ''>('')

  useEffect(() => {
    loadRegions()
    loadCrops()
  }, [])

  const loadRegions = async () => {
    try {
      const data = await priceHistoryService.getRegions()
      setRegions(data)
    } catch {
      // silent fail
    }
  }

  const loadCrops = async () => {
    try {
      const data = await priceHistoryService.getCrops()
      setCrops(data)
      if (data.length > 0 && !selectedCrop) {
        setSelectedCrop(data[0])
      }
    } catch {
      // silent fail
    }
  }

  // Загружаем данные для всех регионов при изменении культуры
  useEffect(() => {
    if (!selectedCrop || regions.length === 0) return

    const loadAllRegions = async () => {
      setLoading(true)
      setError(null)
      setRegionData(regions.map(r => ({ region: r, data: null, loading: true, error: null })))

      // Загружаем данные параллельно пачками по 5 регионов
      const batchSize = 5
      for (let i = 0; i < regions.length; i += batchSize) {
        const batch = regions.slice(i, i + batchSize)
        const batchPromises = batch.map(async (region) => {
          try {
            const data = await priceHistoryService.getPriceTimeSeries(region, selectedCrop)
            return { region, data, loading: false, error: null }
          } catch (e) {
            return { region, data: null, loading: false, error: 'Ошибка загрузки' }
          }
        })

        const batchResults = await Promise.all(batchPromises)

        setRegionData(prev => {
          const updated = [...prev]
          batchResults.forEach(result => {
            const idx = updated.findIndex(r => r.region === result.region)
            if (idx >= 0) updated[idx] = result
          })
          return updated
        })
      }

      setLoading(false)
    }

    loadAllRegions()
  }, [selectedCrop, regions])

  // Инициализируем видимые регионы при первой загрузке данных
  useEffect(() => {
    if (regionData.length > 0 && visibleRegions.size === 0) {
      // Показываем первые 6 регионов с данными
      const regionsWithData = regionData
        .filter(r => r.data?.found && (r.data?.data?.length ?? 0) > 0)
        .slice(0, 6)
        .map(r => r.region)
      setVisibleRegions(new Set(regionsWithData))

      // Определяем доступные годы из данных
      const allYears = new Set<number>()
      regionData.forEach(r => {
        if (r.data?.years) {
          r.data.years.forEach(y => allYears.add(y))
        }
      })
      const sortedYears = Array.from(allYears).sort((a, b) => a - b)
      if (sortedYears.length > 0) {
        setAvailableYears(sortedYears)
        setStartYear(sortedYears[0])
        setEndYear(sortedYears[sortedYears.length - 1])
      }
    }
  }, [regionData])

  // Фильтруем регионы по поиску и наличию данных
  const filteredRegions = useMemo(() => {
    let filtered = regionData

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => r.region.toLowerCase().includes(query))
    }

    // Сортируем: сначала с данными, потом без
    return filtered.sort((a, b) => {
      const aHasData = a.data?.found && (a.data?.data?.length ?? 0) > 0
      const bHasData = b.data?.found && (b.data?.data?.length ?? 0) > 0
      if (aHasData && !bHasData) return -1
      if (!aHasData && bHasData) return 1
      return a.region.localeCompare(b.region)
    })
  }, [regionData, searchQuery])

  const toggleRegion = (region: string) => {
    setVisibleRegions(prev => {
      const next = new Set(prev)
      if (next.has(region)) {
        next.delete(region)
      } else {
        next.add(region)
      }
      return next
    })
  }

  // Текущий выбранный диапазон годов
  const yearRange = useMemo(() => {
    if (startYear === '' || endYear === '') return null
    return { min: startYear, max: endYear }
  }, [startYear, endYear])

  const stats = useMemo(() => {
    const withData = regionData.filter(r => r.data?.found && (r.data?.data?.length ?? 0) > 0)
    const totalRegions = regionData.length
    const regionsWithData = withData.length

    // Находим регион с максимальной ценой (с учетом фильтра по годам)
    let maxPrice = 0
    let maxRegion = ''
    let minPrice = Infinity
    let minRegion = ''

    withData.forEach(r => {
      const data = yearRange
        ? r.data!.data.filter(d => d.year >= yearRange.min && d.year <= yearRange.max)
        : r.data!.data
      const prices = data.filter(d => d.price != null).map(d => d.price!)
      if (prices.length > 0) {
        const max = Math.max(...prices)
        const min = Math.min(...prices)
        if (max > maxPrice) {
          maxPrice = max
          maxRegion = r.region
        }
        if (min < minPrice) {
          minPrice = min
          minRegion = r.region
        }
      }
    })

    return {
      totalRegions,
      regionsWithData,
      maxPrice: maxPrice > 0 ? maxPrice : null,
      maxRegion,
      minPrice: minPrice < Infinity ? minPrice : null,
      minRegion,
    }
  }, [regionData, yearRange])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <TrendingUp size={28} style={{ marginRight: 12 }} />
          История цен на сельхозпродукцию
        </h1>
      </div>

      {/* Панель управления */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={16} />
              Культура
            </label>
            <select
              className="input"
              value={selectedCrop}
              onChange={(e) => {
                setSelectedCrop(e.target.value)
                setVisibleRegions(new Set())
              }}
            >
              {crops.length > 0 ? (
                crops.map(c => (
                  <option key={c} value={c}>{CROP_LABELS[c] || c}</option>
                ))
              ) : (
                <option value="">Загрузка...</option>
              )}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={16} />
              Поиск региона
            </label>
            <input
              type="text"
              className="input"
              placeholder="Начните вводить название региона..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {availableYears.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} />
                Период
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="input"
                  value={startYear}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setStartYear(val)
                    if (endYear !== '' && val > endYear) {
                      setEndYear(val)
                    }
                  }}
                  style={{ flex: 1, minWidth: 80 }}
                >
                  {availableYears.map(y => (
                    <option key={`start-${y}`} value={y}>{y}</option>
                  ))}
                </select>
                <span style={{ color: '#888' }}>—</span>
                <select
                  className="input"
                  value={endYear}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setEndYear(val)
                    if (startYear !== '' && val < startYear) {
                      setStartYear(val)
                    }
                  }}
                  style={{ flex: 1, minWidth: 80 }}
                >
                  {availableYears.map(y => (
                    <option key={`end-${y}`} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Статистика */}
      {stats.regionsWithData > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 11, color: '#666' }}>Регионов с данными</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#3498db' }}>
              {stats.regionsWithData} / {stats.totalRegions}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 11, color: '#666' }}>Максимальная цена</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e74c3c' }}>
              {formatPrice(stats.maxPrice)}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>{stats.maxRegion}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 11, color: '#666' }}>Минимальная цена</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#27ae60' }}>
              {formatPrice(stats.minPrice)}
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>{stats.minRegion}</div>
          </div>
        </div>
      )}

      {/* Список регионов для выбора */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Выберите регионы для отображения ({visibleRegions.size} выбрано):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto', padding: 4 }}>
          {filteredRegions.map(({ region, data }) => {
            const hasData = data?.found && (data?.data?.length ?? 0) > 0
            const isVisible = visibleRegions.has(region)
            return (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 14,
                  border: 'none',
                  fontSize: 11,
                  cursor: hasData ? 'pointer' : 'not-allowed',
                  background: isVisible ? '#3498db' : hasData ? '#ecf0f1' : '#f5f5f5',
                  color: isVisible ? '#fff' : hasData ? '#333' : '#aaa',
                  opacity: hasData ? 1 : 0.6,
                  transition: 'all 0.2s',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                disabled={!hasData}
                title={region}
              >
                {region.length > 25 ? region.substring(0, 22) + '...' : region}
                {!hasData && ' (нет данных)'}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
          Кликните на регион, чтобы добавить/убрать его график.
          {availableYears.length > 0 && ` Доступны данные с ${availableYears[0]} по ${availableYears[availableYears.length - 1]} год.`}
        </div>
      </div>

      {loading && regionData.length === 0 && (
        <div className="loading" style={{ padding: 40 }}>Загрузка данных по регионам...</div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Сетка графиков - адаптивная в зависимости от количества */}
      {visibleRegions.size > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: (() => {
            const count = visibleRegions.size
            if (count === 1) return '1fr'
            if (count === 2) return 'repeat(2, 1fr)'
            if (count <= 4) return 'repeat(auto-fit, minmax(400px, 1fr))'
            return 'repeat(auto-fill, minmax(350px, 1fr))'
          })(),
          gap: 16,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {regionData
            .filter(r => visibleRegions.has(r.region))
            .map(r => (
              <ChartCard
                key={r.region}
                region={r.region}
                data={r.data}
                loading={r.loading}
                error={r.error}
                yearRange={yearRange}
                onClose={() => toggleRegion(r.region)}
                expanded={visibleRegions.size === 1}
              />
            ))}
        </div>
      )}

      {visibleRegions.size === 0 && !loading && regionData.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          <BarChart3 size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p>Выберите регионы из списка выше, чтобы увидеть графики цен</p>
        </div>
      )}
    </div>
  )
}
