import { useState, useEffect } from 'react'
import { weatherService, WeatherDay, weatherIcon, tempColor } from '../../services/weatherService'

// Координаты по умолчанию (центр поля / Омск)
const DEFAULT_LAT = 54.9924
const DEFAULT_LON = 73.3686

function fmtDate(ds: string) {
  const d = new Date(ds)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Завтра'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function fmtDow(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { weekday: 'short' })
}

interface WeatherWidgetProps {
  lat?: number
  lon?: number
  title?: string
}

export default function WeatherWidget({ lat = DEFAULT_LAT, lon = DEFAULT_LON, title = '🌤️ Погода' }: WeatherWidgetProps) {
  const [days, setDays] = useState<WeatherDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WeatherDay | null>(null)
  const [view, setView] = useState<'cards' | 'table'>('cards')

  useEffect(() => {
    setLoading(true)
    setError(null)
    weatherService.getForecast(lat, lon, 14)
      .then(r => { setDays(r.days); setSelected(r.days[0] ?? null) })
      .catch(() => setError('Погодный сервис недоступен'))
      .finally(() => setLoading(false))
  }, [lat, lon])

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Заголовок */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`btn btn-sm ${view === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('cards')}
            style={{ padding: '3px 8px', fontSize: 11 }}
          >Карточки</button>
          <button
            className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('table')}
            style={{ padding: '3px 8px', fontSize: 11 }}
          >Таблица</button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '32px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--color-text-muted)' }}>
          <div className="spinner" /> Загрузка прогноза...
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-danger)', fontSize: 13 }}>
          ⚠️ {error}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Запустите weather-service на порту 8082
          </div>
        </div>
      )}

      {/* ── Карточки ── */}
      {!loading && !error && view === 'cards' && (
        <div>
          {/* Выбранный день — детали */}
          {selected && (
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, var(--color-primary-light) 0%, rgba(255,255,255,0) 100%)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 40, lineHeight: 1 }}>{weatherIcon(selected)}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{fmtDate(selected.date)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{fmtDow(selected.date)}</div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginLeft: 8 }}>
                <Metric label="Макс" value={`${selected.tempMax?.toFixed(0) ?? '—'}°`} color={tempColor(selected.tempMax)} />
                <Metric label="Мин" value={`${selected.tempMin?.toFixed(0) ?? '—'}°`} color={tempColor(selected.tempMin)} />
                <Metric label="Осадки" value={`${selected.precipitation?.toFixed(1) ?? '—'} мм`} color="var(--color-info)" />
                <Metric label="Влажность" value={`${selected.humidity?.toFixed(0) ?? '—'}%`} color="var(--color-info)" />
                <Metric label="Ветер" value={`${selected.windSpeed?.toFixed(0) ?? '—'} км/ч`} color="var(--color-text-muted)" />
                {selected.sunshine != null && (
                  <Metric label="Солнце" value={`${selected.sunshine.toFixed(1)} ч`} color="#e67e22" />
                )}
              </div>
            </div>
          )}

          {/* Горизонтальная лента дней */}
          <div style={{
            display: 'flex', overflowX: 'auto', padding: '10px 12px', gap: 6,
          }}>
            {days.map(day => (
              <DayCard
                key={day.date}
                day={day}
                isSelected={selected?.date === day.date}
                onClick={() => setSelected(day)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Таблица ── */}
      {!loading && !error && view === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Погода</th>
                <th>Макс °C</th>
                <th>Мин °C</th>
                <th>Осадки, мм</th>
                <th>Влажность, %</th>
                <th>Ветер, км/ч</th>
                <th>Солнце, ч</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day.date}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{fmtDate(day.date)}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{fmtDow(day.date)}</div>
                  </td>
                  <td style={{ fontSize: 18 }}>{weatherIcon(day)}</td>
                  <td style={{ fontWeight: 600, color: tempColor(day.tempMax) }}>{day.tempMax?.toFixed(1) ?? '—'}</td>
                  <td style={{ color: tempColor(day.tempMin) }}>{day.tempMin?.toFixed(1) ?? '—'}</td>
                  <td>
                    {day.precipitation != null && day.precipitation > 0
                      ? <span style={{ color: 'var(--color-info)', fontWeight: 500 }}>{day.precipitation.toFixed(1)}</span>
                      : <span style={{ color: 'var(--color-text-placeholder)' }}>0</span>}
                  </td>
                  <td>{day.humidity?.toFixed(0) ?? '—'}</td>
                  <td>{day.windSpeed?.toFixed(0) ?? '—'}</td>
                  <td>{day.sunshine?.toFixed(1) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Карточка одного дня ──
function DayCard({ day, isSelected, onClick }: { day: WeatherDay; isSelected: boolean; onClick: () => void }) {
  const hasPrecip = (day.precipitation ?? 0) > 0.5
  return (
    <div
      onClick={onClick}
      style={{
        flexShrink: 0, width: 64, cursor: 'pointer',
        padding: '8px 4px', borderRadius: 10, textAlign: 'center',
        background: isSelected ? 'var(--color-primary)' : 'var(--color-bg)',
        border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        transition: 'all 0.15s',
        boxShadow: isSelected ? '0 2px 8px rgba(45,122,69,0.25)' : 'none',
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>
        {fmtDow(day.date)}
      </div>
      <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-text-placeholder)', marginBottom: 5 }}>
        {new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })}
      </div>
      <div style={{ fontSize: 20, marginBottom: 5 }}>{weatherIcon(day)}</div>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: isSelected ? 'white' : tempColor(day.tempMax),
      }}>{day.tempMax?.toFixed(0) ?? '—'}°</div>
      <div style={{
        fontSize: 10,
        color: isSelected ? 'rgba(255,255,255,0.7)' : tempColor(day.tempMin),
      }}>{day.tempMin?.toFixed(0) ?? '—'}°</div>
      {hasPrecip && (
        <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-info)', marginTop: 3 }}>
          💧{day.precipitation!.toFixed(0)}мм
        </div>
      )}
    </div>
  )
}

// ── Один показатель ──
function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 1 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color }}>{value}</div>
    </div>
  )
}

