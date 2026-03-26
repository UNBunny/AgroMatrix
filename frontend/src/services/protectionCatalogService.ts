import { api } from './api'

// ── Inbound (client → Java /api/protection/filter) ────────────────────────

export interface CatalogFilterRequest {
  cropCode: string
  bbchStage: number
  tempC: number
  humidity: number
  leafWetnessHours: number
  diseaseType: string | null
  mlRiskLevel: string | null
  mlPathogenName: string | null
  mlInfectionIndex: number | null
}

export interface ProductRecommendationDto {
  entryId: number
  diseaseName: string
  pathogenLatin: string | null
  diseaseType: string
  productName: string
  activeIngredients: string
  aiConcentration: string | null
  fracCode: string | null
  fracGroup: string | null
  doseRate: string
  doseValue: number | null
  doseUnit: string | null
  applicationType: string
  bbchFrom: number | null
  bbchTo: number | null
  tempMinC: number | null
  tempOptC: number | null
  tempMaxC: number | null
  phiDays: number
  filterRationale: string
  isOptimalTemp: boolean
}

export interface CatalogFilterResponse {
  cropCode: string
  bbchStage: number
  appliedDiseaseType: string | null
  totalCandidates: number
  afterBbchFilter: number
  afterTypeFilter: number
  afterTempFilter: number
  finalCount: number
  recommendations: ProductRecommendationDto[]
  fracsRepresented: string[]
  filterSummary: string
}

// ── Inbound (client → Java /api/protection/analyze) ──────────────────────

export interface ProtectionAnalysisRequest {
  fieldId: number
  bbchStage: number
  targetDiseases: string[]
}

export interface ThreatRecommendation {
  productName: string
  fracCode: string | null
  fracGroup: string | null
  activeIngredients: string
  doseRate: string
  doseValue: number | null
  doseUnit: string | null
  bbchFrom: number | null
  bbchTo: number | null
  tempMinC: number | null
  tempMaxC: number | null
  phiDays: number
  rationale: string
  diseaseName: string
}

export interface ThreatAnalysisResponse {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  infectionIndex: number
  ndviCorrectedIndex: number
  nitrogenOverloadWarning: string | null
  activeThreats: string[]
  recommendations: ThreatRecommendation[]
  fracsUsedRecently: string[]
  analysisNotes: string
}

// ── Service ────────────────────────────────────────────────────────────────

export const protectionCatalogService = {
  /** Fast synchronous filter — no external service calls. */
  async filterCatalog(req: CatalogFilterRequest): Promise<CatalogFilterResponse> {
    const { data } = await api.post<CatalogFilterResponse>('/protection/filter', req)
    return data
  },

  /** Full async ML pipeline: weather + NDVI + Python inference. */
  async analyzeField(req: ProtectionAnalysisRequest): Promise<ThreatAnalysisResponse> {
    const { data } = await api.post<ThreatAnalysisResponse>(
      '/protection/analyze', req, { timeout: 60_000 }
    )
    return data
  },
}
