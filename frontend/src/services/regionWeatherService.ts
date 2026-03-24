import { api } from './api'
import type { RegionWeatherItem } from './mlService'

interface RegionCoords { lat: number; lon: number; name: string }
type RegionCoordsMap = Record<string, RegionCoords>

let _coordsCache: RegionCoordsMap | null = null

export async function loadRegionCoords(): Promise<RegionCoordsMap> {
  if (_coordsCache) return _coordsCache
  try {
    const resp = await fetch('/region_coords.json')
    _coordsCache = await resp.json()
    return _coordsCache!
  } catch {
    return {}
  }
}

function weatherCacheKey(regionCode: string, year: number) {
  return `weather:${regionCode}:${year}`
}

async function fetchOneRegionWeather(
  regionCode: string, lat: number, lon: number, year: number,
): Promise<RegionWeatherItem | null> {
  const key = weatherCacheKey(regionCode, year)
  const cached = sessionStorage.getItem(key)
  if (cached) return JSON.parse(cached)
  try {
    const { data } = await api.get('/agro-data/seasonal', {
      params: { lat, lon, year },
      timeout: 8000,
    })
    const w: RegionWeatherItem = {
      precip_oct_mar:   data.precipOctMar   ?? undefined,
      precip_apr_may:   data.precipAprMay   ?? undefined,
      precip_jun_jul:   data.precipJunJul   ?? undefined,
      precip_aug_sep:   data.precipAugSep   ?? undefined,
      temp_sum_apr_may: data.tempSumAprMay  ?? undefined,
      temp_sum_jun_jul: data.tempSumJunJul  ?? undefined,
      temp_sum_aug_sep: data.tempSumAugSep  ?? undefined,
      temp_sum_apr_sep: data.tempSumAprSep  ?? undefined,
    }
    sessionStorage.setItem(key, JSON.stringify(w))
    return w
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

/**
 * Returns the set of region codes to fetch weather for.
 * Controlled by VITE_WEATHER_REGIONS env var (comma-separated).
 * If the var is empty or unset, all codes are returned unchanged.
 */
function applyWeatherRegionFilter(regionCodes: string[]): string[] {
  const raw = import.meta.env.VITE_WEATHER_REGIONS as string | undefined
  if (!raw || !raw.trim()) return regionCodes
  const allowed = new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
  return regionCodes.filter(c => allowed.has(c))
}

/**
 * Fetches weather for every region in coords map, batched to avoid 429 from Open-Meteo.
 * Regions are filtered by VITE_WEATHER_REGIONS env var before fetching.
 * Returns {region_code: SeasonalWeather} — only regions that responded successfully.
 */
export async function fetchAllRegionWeather(
  regionCodes: string[],
  year: number,
  coords: RegionCoordsMap,
  batchSize = 5,
  delayMs = 700,
): Promise<Record<string, RegionWeatherItem>> {
  regionCodes = applyWeatherRegionFilter(regionCodes)
  const result: Record<string, RegionWeatherItem> = {}
  const batches: string[][] = []
  for (let i = 0; i < regionCodes.length; i += batchSize) {
    batches.push(regionCodes.slice(i, i + batchSize))
  }
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const settled = await Promise.allSettled(
      batch.map(code => {
        const c = coords[code]
        if (!c) return Promise.resolve(null)
        return fetchOneRegionWeather(code, c.lat, c.lon, year)
      }),
    )
    settled.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value) {
        result[batch[i]] = res.value
      }
    })
    if (bi < batches.length - 1) await sleep(delayMs)
  }
  return result
}
