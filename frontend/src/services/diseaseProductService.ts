import { api } from './api'

export interface DiseaseProductItemDto {
  id: number
  name: string
  activeIngredient: string
  mechanism: string
  dose: string
  doseValue: number
  timing: string
  phiDays: number
}

export interface DiseaseProductRecommendationDto {
  id: number
  opType: string
  opLabel: string
  opColor: string
  opEmoji: string
  reason: string
  products: DiseaseProductItemDto[]
}

export const diseaseProductService = {
  async getByDiseaseName(disease: string): Promise<DiseaseProductRecommendationDto | null> {
    const { data, status } = await api.get<DiseaseProductRecommendationDto>(
      '/disease-product-recommendations/search',
      { params: { disease }, validateStatus: s => s === 200 || s === 204 }
    )
    return status === 204 ? null : data
  },
}
