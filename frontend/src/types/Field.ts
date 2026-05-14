export interface Field {
  id: number
  fieldName: string
  crop_type: string
  status: string
  coordinates: number[][]
  holes?: number[][][]
  areaHectares: number
  regionCode?: string
  regionName?: string
}

export interface FieldCreateRequest {
  fieldName: string
  crop_type: string
  status: string
  coordinates: number[][]
  holes?: number[][][]
  areaHectares: number
  regionCode?: string
  regionName?: string
}

export interface NdviRecord {
  fieldId: number
  date: string
  mean: number
  min: number | null
  max: number | null
  std: number | null
  source: 'AGROMONITORING' | 'GEE_SENTINEL2'
}

export interface NdviHistoryResponse {
  fieldId: number
  fieldName: string
  current: NdviRecord | null
  history: NdviRecord[]
}

export interface NdviImageResponse {
  imageUrl: string | null
  bbox: number[] | null       // [west, south, east, north]
  ndviMean: number | null
  ndviMin: number | null
  ndviMax: number | null
  actualDate: string | null
  imagesFound: number
  error: string | null
}

export interface NdviAvailableDatesResponse {
  dates: string[]
  error: string | null
}

