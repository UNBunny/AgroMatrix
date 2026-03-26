import { api } from './api'

export interface PriceHistoryResponse {
  region: string
  crop: string
  last_year: number
  last_month: number
  price_lag1: number | null
  price_lag12: number | null
  price_lag24: number | null
  price_ma3: number | null
  price_ma12: number | null
  price_mom: number | null
  price_yoy: number | null
  found: boolean
}

export interface PriceDataPoint {
  year: number
  month: number
  month_name: string
  price: number | null
  price_ma3: number | null
  price_ma12: number | null
}

export interface PriceTimeSeriesResponse {
  region: string
  crop: string
  data: PriceDataPoint[]
  years: number[]
  found: boolean
}

export const priceHistoryService = {
  async getPriceHistory(region: string, crop: string): Promise<PriceHistoryResponse> {
    const response = await api.get('/price/history', { params: { region, crop } })
    return response.data
  },

  async getRegions(): Promise<string[]> {
    const response = await api.get('/price/regions')
    return response.data
  },

  async getCrops(): Promise<string[]> {
    const response = await api.get('/price/crops')
    return response.data
  },

  async getModelInfo(): Promise<any> {
    const response = await api.get('/price/info')
    return response.data
  },

  async getPriceTimeSeries(region: string, crop: string): Promise<PriceTimeSeriesResponse> {
    const response = await api.get('/price/timeseries', { params: { region, crop } })
    return response.data
  },
}
