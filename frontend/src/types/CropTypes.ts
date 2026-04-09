// Enums
export enum ToleranceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum PlantingStatus {
  PLANNED = 'PLANNED',
  PLANTED = 'PLANTED',
  GROWING = 'GROWING',
  HARVESTED = 'HARVESTED'
}

// Crop Type
export interface CropType {
  id: number
  name: string
  category: string
  growingSeasonDays?: number
  optimalTemperatureMin?: number
  optimalTemperatureMax?: number
  waterRequirementsMm?: number
  notes?: string
  mlCropCode?: string
}

export interface CropTypeRequest {
  name: string
  category: string
  growingSeasonDays?: number
  optimalTemperatureMin?: number
  optimalTemperatureMax?: number
  waterRequirementsMm?: number
  notes?: string
  mlCropCode?: string
}

// Crop Variety
export interface CropVariety {
  id: number
  name: string
  cropType: CropType
  seedProducer?: string
  maturationDays?: number
  diseaseResistance: any[] // Will be typed more specifically with DiseaseResistance
  droughtTolerance?: ToleranceLevel
  frostTolerance?: ToleranceLevel
  recommendedSeedingRateKgPerHa?: number
  seedCostPerKg?: number
  isHybrid?: boolean
  notes?: string
}

export interface CropVarietyRequest {
  name: string
  cropTypeId: number
  seedProducer?: string
  maturationDays?: number
  diseaseResistanceId: number[]
  droughtTolerance?: ToleranceLevel
  frostTolerance?: ToleranceLevel
  recommendedSeedingRateKgPerHa?: number
  seedCostPerKg?: number
  isHybrid?: boolean
  notes?: string
}

// Crop History
export interface CropHistory {
  id: number
  fieldId: number
  fieldName: string
  cropTypeId: number
  cropTypeName: string
  cropVarietyId?: number
  cropVarietyName?: string
  plantingDate: string
  actualHarvestDate?: string
  expectedHarvestDate?: string
  seedAmountKgPerHa: number
  seedDepthCm?: number
  plantSpacingCm?: number
  actualYieldKg?: number
  expectedYieldKg?: number
  plantingStatus: PlantingStatus
  notes?: string
  weatherConditions?: string
}

export interface CropHistoryRequest {
  fieldId: number
  cropTypeId: number
  cropVarietyId?: number
  plantingDate: string
  actualHarvestDate?: string
  expectedHarvestDate?: string
  seedAmountKgPerHa: number
  seedDepthCm?: number
  plantSpacingCm?: number
  actualYieldKg?: number
  expectedYieldKg?: number
  plantingStatus: PlantingStatus
  notes?: string
  weatherConditions?: string
}
