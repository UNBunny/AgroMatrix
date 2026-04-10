import { api } from './api'

const DAILY_PARAMS = [
  'temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean',
  'relative_humidity_2m_mean',
  'precipitation_sum',
  'wind_speed_10m_max',
  'sunshine_duration',
].join(',')

export interface WeatherDay {
  date: string
  tempMax: number | null
  tempMin: number | null
  tempMean: number | null
  precipitation: number | null
  humidity: number | null
  windSpeed: number | null
  sunshine: number | null
}

export interface WeatherForecast {
  days: WeatherDay[]
  lat: number
  lon: number
}

function toHours(seconds: number | null): number | null {
  if (seconds == null) return null
  return Math.round(seconds / 36) / 100
}

function parseDaily(d: any, lat: number, lon: number): WeatherForecast {
  const result: WeatherDay[] = d.time.map((date: string, i: number) => ({
    date,
    tempMax: d.temperature_2m_max?.[i] ?? null,
    tempMin: d.temperature_2m_min?.[i] ?? null,
    tempMean: d.temperature_2m_mean?.[i] ?? null,
    precipitation: d.precipitation_sum?.[i] ?? null,
    humidity: d.relative_humidity_2m_mean?.[i] ?? null,
    windSpeed: d.wind_speed_10m_max?.[i] ?? null,
    sunshine: toHours(d.sunshine_duration?.[i] ?? null),
  }))
  return { days: result, lat, lon }
}

export const weatherService = {
  async getForecast(lat: number, lon: number, days = 14): Promise<WeatherForecast> {
    const res = await api.get('/open-meteo/ml', { params: { lat, lon, days } })
    const d = res.data?.daily
    if (!d || !d.time) throw new Error('Нет данных')
    return parseDaily(d, lat, lon)
  },
}

export function weatherIcon(day: WeatherDay): string {
  const p = day.precipitation ?? 0
  const t = day.tempMean ?? 15
  if (p > 10) return '🌧️'
  if (p > 4) return '🌦️'
  if (p > 1) return '🌂'
  if (t < 0) return '❄️'
  if (t < 5) return '🌤️'
  if ((day.sunshine ?? 0) > 6) return '☀️'
  return '⛅'
}

export function tempColor(t: number | null): string {
  if (t == null) return 'var(--color-text-muted)'
  if (t >= 30) return '#e74c3c'
  if (t >= 22) return '#e67e22'
  if (t >= 12) return '#27ae60'
  if (t >= 0) return '#2980b9'
  return '#8e44ad'
}
