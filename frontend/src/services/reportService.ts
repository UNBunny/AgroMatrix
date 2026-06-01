import { api } from './api'

// ── Field Report ──────────────────────────────────────────────────────────────

export interface FieldReportMetrics {
  fieldId: number
  fieldName: string
  cropType: string
  status: string
  areaHectares: number
  totalFertilizerApplications: number
  totalProtectionOperations: number
  totalFertilizerKg: number
  actualYieldKg: number | null
  expectedYieldKg: number | null
  lastObservationDate: string | null
  lastBbchScale: number | null
}

export interface FieldReportTimelinePoint {
  date: string
  fertilizerKg: number | null
  protectionOps: number | null
  bbchScale: number | null
  ndviMean: number | null
}

export interface FieldReportResponse {
  metrics: FieldReportMetrics
  timeline: FieldReportTimelinePoint[]
}

export interface FieldReportParams {
  fieldId: number
  dateFrom?: string
  dateTo?: string
  cropHistoryId?: number
}

// ── Plan Approval ─────────────────────────────────────────────────────────────

export type PlanStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

export interface SeasonPlan {
  id: number
  fieldId: number
  fieldName: string
  cropType: string
  season: string
  description: string | null
  status: PlanStatus
  createdByUserId: number
  createdByUsername: string
  reviewedByUserId: number | null
  reviewedByUsername: string | null
  reviewComment: string | null
  createdAt: string
  updatedAt: string
}

export interface SeasonPlanRequest {
  fieldId: number
  cropType: string
  season: string
  description?: string
}

export interface PlanReviewRequest {
  status: 'APPROVED' | 'REJECTED'
  comment?: string
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number
  entityType: string
  entityId: number
  action: string
  userId: number
  username: string
  fieldName: string | null
  changedField: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

export interface AuditLogParams {
  entityType?: string
  userId?: number
  dateFrom?: string
  dateTo?: string
  fieldId?: number
  page?: number
  size?: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const reportService = {
  getFieldReport: (params: FieldReportParams) =>
    api.get<FieldReportResponse>('/reports/field', { params }).then(r => r.data),

  getPlans: (params?: { fieldId?: number; status?: PlanStatus; farmId?: number }) =>
    api.get<SeasonPlan[]>('/plans', { params }).then(r => r.data),

  getPlanById: (id: number) =>
    api.get<SeasonPlan>(`/plans/${id}`).then(r => r.data),

  createPlan: (data: SeasonPlanRequest) =>
    api.post<SeasonPlan>('/plans', data).then(r => r.data),

  submitForApproval: (id: number) =>
    api.patch<SeasonPlan>(`/plans/${id}/submit`).then(r => r.data),

  reviewPlan: (id: number, data: PlanReviewRequest) =>
    api.patch<SeasonPlan>(`/plans/${id}/review`, data).then(r => r.data),

  getAuditLog: (params: AuditLogParams) =>
    api.get<PageResponse<AuditLogEntry>>('/audit', { params }).then(r => r.data),
}
