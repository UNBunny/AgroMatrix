import { api } from './api'

export interface YieldRequest {
  region_code: string
  crop: string
  year: number
  precip_jun_jul?: number
  precip_apr_may?: number
  temp_sum_jun_jul?: number
  drought_index?: number
  weather_favorability?: number
  yield_lag1?: number
  yield_lag2?: number
  yield_ma3?: number
  yield_ma5?: number
}

export interface YieldResponse {
  region_code: string
  crop: string
  year: number
  predicted_yield_centners_per_ha: number
  model_version: string
}

export interface ChainedForecastRequest {
  region_code: string
  crop: string
  years: number[]
  known_yields?: Record<number, number>
  weather?: Record<string, number>
}

export interface ChainedForecastResponse {
  region_code: string
  crop: string
  forecast: Record<string, number>
  note: string
}

export interface PriceRequest {
  region: string
  crop: string
  year: number
  month: number
  price_lag1?: number
  price_lag12?: number
  price_ma3?: number
  price_yoy?: number
}

export interface PriceResponse {
  region: string
  crop: string
  year: number
  month: number
  predicted_price_rub_per_ton: number
  model_version: string
}

export interface CropRecommendRequest {
  N: number
  P: number
  K: number
  temperature: number
  humidity: number
  ph: number
  rainfall: number
}

export interface CropRecommendResponse {
  recommended_crop: string
  confidence: number
  top3: Array<{ crop: string; probability: number }>
}

export interface FertilizerRequest {
  crop_type: string
  soil_type: 'chernozem' | 'loamy' | 'solonetz'
  deficiency_level: 'nitrogen' | 'phosphorus' | 'potassium'
}

export interface FertilizerResponse {
  recommended_fertilizer: string
  confidence: number
  note?: string
}

export interface PesticideRequest {
  crop: string
  pest_type: 'aphid' | 'sunn_pest' | 'cutworm' | 'beetle' | 'thrips' | 'weevil' | 'moth'
  intensity: 'low' | 'medium' | 'high'
}

export interface PesticideResponse {
  recommended_pesticide: string
  confidence: number
  active_ingredient?: string
}

export interface YieldModelInfo {
  cv_r2_mean: number
  cv_mape_mean: number
  cv_rmse_mean: number
  in_sample_r2: number
  cv_type: string
  crops: string[]
  n_regions: number
  years: string
  trained_at: string
  top5_features: string[]
}

export interface RegionWeatherItem {
  precip_oct_mar?: number
  precip_apr_may?: number
  precip_jun_jul?: number
  precip_aug_sep?: number
  temp_sum_apr_may?: number
  temp_sum_jun_jul?: number
  temp_sum_aug_sep?: number
  temp_sum_apr_sep?: number
}

export interface RegionsBulkRequest {
  crop: string
  year: number
  as_of_date?: string
  per_region_weather?: Record<string, RegionWeatherItem>
}

export interface RegionForecastItem {
  region_code: string
  region_name: string
  yield_pred: number
  yield_ma5: number | null
  delta_pct: number | null
  price_pred: number | null
  signal: 'SURPLUS' | 'NEUTRAL' | 'DEFICIT' | 'UNKNOWN'
  sown_area_thou_ha: number | null
  is_forecast: boolean
}

export interface RegionForecastResponse {
  crop: string
  year: number
  regions: RegionForecastItem[]
  cached: boolean
  is_forecast_year: boolean
}

export const yieldService = {
  async predict(req: YieldRequest): Promise<YieldResponse> {
    const { data } = await api.post<YieldResponse>('/yield/predict', req)
    return data
  },

  async forecastChained(req: ChainedForecastRequest): Promise<ChainedForecastResponse> {
    const { data } = await api.post<ChainedForecastResponse>('/yield/forecast/chained', req)
    return data
  },

  async forecastRegionsBulk(req: RegionsBulkRequest): Promise<RegionForecastResponse> {
    const { data } = await api.post<RegionForecastResponse>('/yield/regions', req)
    return data
  },

  async getModelInfo(): Promise<YieldModelInfo> {
    const { data } = await api.get<YieldModelInfo>('/yield/info')
    return data
  },
}

export const priceService = {
  async predict(req: PriceRequest): Promise<PriceResponse> {
    const { data } = await api.post<PriceResponse>('/price/predict', req)
    return data
  },
}

export const agroService = {
  async recommendCrop(req: CropRecommendRequest): Promise<CropRecommendResponse> {
    const { data } = await api.post<CropRecommendResponse>('/crop/recommend', req)
    return data
  },

  async recommendFertilizer(req: FertilizerRequest): Promise<FertilizerResponse> {
    const { data } = await api.post<FertilizerResponse>('/fertilizer/recommend', req)
    return data
  },

  async recommendPesticide(req: PesticideRequest): Promise<PesticideResponse> {
    const { data } = await api.post<PesticideResponse>('/pesticide/recommend', req)
    return data
  },
}

export interface DiseasePredictRequest {
  crop: string
  temperature: number
  humidity: number
  rainfall: number
  growth_stage: 'seedling' | 'vegetative' | 'flowering' | 'ripening'
}

export interface DiseaseTop3Item {
  disease: string
  probability: number
}

export interface DiseasePredictResponse {
  disease: string
  disease_confidence: number
  risk_level: 'high' | 'medium' | 'low'
  risk_confidence: number
  top3_diseases: DiseaseTop3Item[]
}

export const diseaseMLService = {
  async predict(req: DiseasePredictRequest): Promise<DiseasePredictResponse> {
    const { data } = await api.post<DiseasePredictResponse>('/disease/predict', req)
    return data
  },
}

export const mlHealthService = {
  async check(): Promise<{ status: string; models_loaded: boolean; version: string }> {
    const { data } = await api.get('/ml/health', { baseURL: api.defaults.baseURL?.replace('/api', '') })
    return data
  },
}
