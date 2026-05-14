import { api } from './api'

export interface FactorScore {
  score: number
  weight: number
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL'
  explanation: string
}

export interface ScoreBreakdown {
  rotation: FactorScore
  soil: FactorScore
  climate: FactorScore
  economics: FactorScore
}

export interface SowingWindow {
  earliestDate: string
  latestDate: string
  optimalDateFrom: string
  optimalDateTo: string
  forecastAdjusted: boolean
  forecastNote: string | null
  climateNote: string | null
}

export interface VarietyRecommendation {
  name: string
  seedProducer: string
  origin: string
  droughtTolerance: string
  frostTolerance: string
  maturationDays: number
  recommendedRegions: string
  whyRecommended: string
  isTopByArea: boolean
}

export interface RecommendationMetadata {
  lastCropName: string
  analyzedHistoryYears: number
  soilType: string | null
  soilPh: number | null
  regionName: string
  weatherDataNote: string
  scoringMethodology: string
}

export interface CropRecommendationItem {
  cropTypeId: number
  cropTypeName: string
  rotationCompliant: boolean
  rotationViolationReason: string | null
  predictedYieldCentnersPerHa: number | null
  predictedPriceRubPerTon: number | null
  estimatedProfitRubPerHa: number | null
  rank: number
  soilCompatibilityScore: number | null
  totalScore: number | null
  scoreBreakdown: ScoreBreakdown | null
  recommendedVarieties: VarietyRecommendation[]
  agronomistSummary: string | null
  sowingWindow: SowingWindow | null
}

export interface CropRecommendationResponse {
  fieldId: number
  fieldName: string
  targetYear: number
  recommendations: CropRecommendationItem[]
  metadata: RecommendationMetadata | null
}

export interface DiseaseRiskItem {
  ruleId: number
  diseaseName: string
  diseaseType: string
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  riskScore: number
  ruleDescription: string
  triggeredConditions: string[]
  preventionAdvice: string | null
  treatmentAdvice: string | null
  urgencyDays: number | null
}

export interface DiseaseRiskResponse {
  fieldId: number
  fieldName: string
  cropName: string
  overallRiskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  overallRiskScore: number
  avgTemp: number | null
  sumPrecipitation: number | null
  humidity: number | null
  heatStressDays: number | null
  longestDryPeriod: number | null
  gtk: number | null
  droughtRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  droughtScore: number
  droughtDescription: string
  frostRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  frostScore: number
  frostDescription: string
  heatStressRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  heatStressScore: number
  heatStressDescription: string
  diseaseRisks: DiseaseRiskItem[]
  recommendations: string[]
  assessmentTime: string
  dataSource: string
}

export const recommendationService = {
  async getRecommendations(fieldId: number, year?: number): Promise<CropRecommendationResponse> {
    const params: Record<string, number> = {}
    if (year) params.year = year
    const { data } = await api.get<CropRecommendationResponse>(
      `/fields/${fieldId}/recommendations`,
      { params, timeout: 120000 }
    )
    return data
  },

  async getDiseaseRisk(fieldId: number, crop?: string): Promise<DiseaseRiskResponse> {
    const params: Record<string, string> = {}
    if (crop) params.crop = crop
    const { data } = await api.get<DiseaseRiskResponse>(
      `/fields/${fieldId}/disease-risk`,
      { params }
    )
    return data
  },
}
