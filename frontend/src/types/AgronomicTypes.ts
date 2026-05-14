// ─── Soil Horizons ───────────────────────────────────────────────────────────

export interface SoilHorizon {
  id: number
  fieldId: number
  fieldName: string
  depthFromCm: number
  depthToCm: number
  nitrogenN?: number
  phosphorusP?: number
  potassiumK?: number
  phLevel?: number
  bulkDensity?: number
  organicMatter?: number
  samplingDate?: string
  labProtocol?: string
  notes?: string
  createdAt: string
}

export interface SoilHorizonRequest {
  fieldId: number
  depthFromCm: number
  depthToCm: number
  nitrogenN?: number
  phosphorusP?: number
  potassiumK?: number
  phLevel?: number
  bulkDensity?: number
  organicMatter?: number
  samplingDate?: string
  labProtocol?: string
  notes?: string
}

// ─── Phenological Observations ───────────────────────────────────────────────

export enum ObservationMethod {
  VISUAL = 'VISUAL',
  TACTILE = 'TACTILE',
  LAB_ANALYSIS = 'LAB_ANALYSIS',
}

export interface PhenologicalObservation {
  id: number
  cropHistoryId: number
  cropTypeName: string
  fieldName: string
  observationDate: string
  bbchScale: number
  bbchDescription?: string
  observationMethod?: ObservationMethod
  notes?: string
  weatherConditions?: string
  createdAt: string
}

export interface PhenologicalObservationRequest {
  cropHistoryId: number
  observationDate: string
  bbchScale: number
  bbchDescription?: string
  observationMethod?: ObservationMethod
  notes?: string
  weatherConditions?: string
}

// ─── Fertilizer Applications ─────────────────────────────────────────────────

export enum ApplicationMethod {
  BROADCAST = 'BROADCAST',
  FERTIGATION = 'FERTIGATION',
  FOLIAR = 'FOLIAR',
  LOCALIZED = 'LOCALIZED',
}

export interface FertilizerApplication {
  id: number
  cropHistoryId: number
  cropTypeName: string
  fieldName: string
  applicationDate: string
  fertilizerType: string
  formulation?: string
  doseKgPerHa?: number
  totalAreaHa?: number
  totalAmountKg?: number
  applicationMethod?: ApplicationMethod
  bbchPhase?: number
  costPerHa?: number
  totalCost?: number
  weatherTempC?: number
  weatherHumidity?: number
  windSpeed?: number
  notes?: string
  createdAt: string
}

export interface FertilizerApplicationRequest {
  cropHistoryId: number
  applicationDate: string
  fertilizerType: string
  formulation?: string
  doseKgPerHa?: number
  totalAreaHa?: number
  totalAmountKg?: number
  applicationMethod?: ApplicationMethod
  bbchPhase?: number
  costPerHa?: number
  totalCost?: number
  weatherTempC?: number
  weatherHumidity?: number
  windSpeed?: number
  notes?: string
}

// ─── Plant Protection Operations ─────────────────────────────────────────────

export enum ProtectionOperationType {
  HERBICIDE = 'HERBICIDE',
  FUNGICIDE = 'FUNGICIDE',
  INSECTICIDE = 'INSECTICIDE',
  DESICCANT = 'DESICCANT',
}

export enum InfestationLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ECONOMIC_THRESHOLD = 'ECONOMIC_THRESHOLD',
}

export interface PlantProtectionOperation {
  id: number
  cropHistoryId: number
  cropTypeName: string
  fieldName: string
  operationDate: string
  operationType: ProtectionOperationType
  productName: string
  activeIngredient?: string
  mechanismOfAction?: string
  doseLPerHa?: number
  concentrationPercent?: number
  targetPest?: string
  infestationLevel?: InfestationLevel
  bbchPhase?: number
  tempC?: number
  humidity?: number
  windSpeed?: number
  precipitationExpected?: boolean
  efficacyPercent?: number
  followUpRequired?: boolean
  phiDays?: number
  harvestAllowedAfter?: string
  costPerHa?: number
  notes?: string
  createdAt: string
}

export interface PlantProtectionRequest {
  cropHistoryId: number
  operationDate: string
  operationType: ProtectionOperationType
  productName: string
  activeIngredient?: string
  mechanismOfAction?: string
  doseLPerHa?: number
  concentrationPercent?: number
  targetPest?: string
  infestationLevel?: InfestationLevel
  bbchPhase?: number
  tempC?: number
  humidity?: number
  windSpeed?: number
  precipitationExpected?: boolean
  efficacyPercent?: number
  followUpRequired?: boolean
  phiDays?: number
  harvestAllowedAfter?: string
  costPerHa?: number
  notes?: string
}

// ─── Crop Rotation Rule (gradient) ───────────────────────────────────────────

export enum RotationRecommendation {
  STRONGLY_RECOMMENDED = 'STRONGLY_RECOMMENDED',
  RECOMMENDED = 'RECOMMENDED',
  ACCEPTABLE = 'ACCEPTABLE',
  NOT_RECOMMENDED = 'NOT_RECOMMENDED',
  FORBIDDEN = 'FORBIDDEN',
}

export interface CropRotationRule {
  id: number
  predecessorCropId: number
  predecessorCropName: string
  successorCropId: number
  successorCropName: string
  allowed: boolean
  minGapYears?: number
  reason?: string
  recommendation?: RotationRecommendation
  recommendationScore?: number
  recommendationRationale?: string
  diseaseRisk?: string
  weedRisk?: string
  soilStructureImpact?: string
  nitrogenBalance?: string
  requiredPractices?: string
}

export interface CropRotationRuleRequest {
  predecessorCropId: number
  successorCropId: number
  allowed: boolean
  minGapYears?: number
  reason?: string
  recommendation?: RotationRecommendation
  diseaseRisk?: string
  weedRisk?: string
  soilStructureImpact?: string
  nitrogenBalance?: string
  requiredPractices?: string
}
