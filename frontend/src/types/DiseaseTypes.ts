// Enums
export enum DiseaseType {
  FUNGAL = 'FUNGAL',
  BACTERIAL = 'BACTERIAL',
  VIRAL = 'VIRAL',
  PHYTOPLASMA = 'PHYTOPLASMA',
  NEMATODE = 'NEMATODE',
  ABIOTIC = 'ABIOTIC',
  UNKNOWN = 'UNKNOWN'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ResistanceLevel {
  SUSCEPTIBLE = 'SUSCEPTIBLE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  IMMUNE = 'IMMUNE'
}

// Disease
export interface Disease {
  id: number
  scientificName: string
  commonName: string
  diseaseType: DiseaseType
  affectedCropIds?: number[]
  symptoms?: string
  preventionMeasures?: string
  treatmentMethods?: string
  riskLevel: RiskLevel
  activeSeason?: string
  favorableConditions?: string
  imageUrl?: string
  isActive?: boolean
}

export interface DiseaseRequest {
  scientificName: string
  commonName: string
  diseaseType: DiseaseType
  affectedCropIds?: number[]
  symptoms?: string
  preventionMeasures?: string
  treatmentMethods?: string
  riskLevel: RiskLevel
  activeSeason?: string
  favorableConditions?: string
  imageUrl?: string
  isActive?: boolean
}

// Disease Resistance
export interface DiseaseResistance {
  id: number
  diseaseId: number
  diseaseName: string
  cropVarietyId: number
  cropVarietyName: string
  resistanceLevel: ResistanceLevel
}

export interface DiseaseResistanceRequest {
  diseaseId: number
  cropVarietyId: number
  resistanceLevel: ResistanceLevel
}
