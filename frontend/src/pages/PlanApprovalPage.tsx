import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, Clock, Plus, Send, Loader2, AlertTriangle,
  ChevronDown, ChevronUp, MessageSquare, Wheat,
} from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { reportService, SeasonPlan, PlanStatus, SeasonPlanRequest } from '../services/reportService'
import { useAuth } from '../context/AuthContext'
import { Field } from '../types/Field'

const STATUS_CONFIG: Record<PlanStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:             { label: 'Черновик',        color: 'var(--color-text-muted)',    icon: <Clock size={14} /> },
  PENDING_APPROVAL:  { label: 'На утверждении',  color: 'var(--color-warning)',       icon: <Send size={14} /> },
  APPROVED:          { label: 'Утверждён',        color: 'var(--color-success)',       icon: <CheckCircle size={14} /> },
  REJECTED:          { label: 'Отклонён',         color: 'var(--color-danger)',        icon: <XCircle size={14} /> },
}

function StatusBadge({ status }: { status: PlanStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="status-pill"
      style={{ borderColor: cfg.color, background: cfg.color + '22', color: cfg.color, cursor: 'default', padding: '3px 10px', fontSize: 12 }}
    >
      {cfg.icon} {cfg.label}
    </span>
  )
}

interface PlanCardProps {
  plan: SeasonPlan
  isDirector: boolean
  isAgronomist: boolean
  onSubmit: (id: number) => void
  onReview: (id: number, status: 'APPROVED' | 'REJECTED', comment: string) => void
  submitting: number | null
}

function PlanCard({ plan, isDirector, isAgronomist, onSubmit, onReview, submitting }: PlanCardProps) {
  const [expanded, setExpanded]         = useState(false)
  const [comment, setComment]           = useState('')
  const [reviewMode, setReviewMode]     = useState<'APPROVED' | 'REJECTED' | null>(null)

  const canSubmit = isAgronomist && plan.status === 'DRAFT'
  const canReview = isDirector && plan.status === 'PENDING_APPROVAL'

  function handleReview(status: 'APPROVED' | 'REJECTED') {
    setReviewMode(status)
    setExpanded(true)
  }

  function submitReview() {
    if (!reviewMode) return
    onReview(plan.id, reviewMode, comment)
    setReviewMode(null)
    setComment('')
    setExpanded(false)
  }

  return (
    <div className="card card-padding mb-12">
      <div className="plan-card">
        <div className="plan-card-info">
          <div className="plan-card-top">
            <Wheat size={16} color="var(--color-primary)" />
            <span style={{ fontWeight: 600 }}>{plan.fieldName}</span>
            <StatusBadge status={plan.status} />
          </div>
          <div className="plan-card-meta">
            <span>Культура: <b>{plan.cropType}</b></span>
            <span>Сезон: <b>{plan.season}</b></span>
            <span>Автор: <b>{plan.createdByUsername}</b></span>
          </div>
          {plan.description && (
            <div className="plan-card-desc">{plan.description}</div>
          )}
          {plan.reviewComment && (
            <div
              className="plan-review-comment"
              style={{
                background: plan.status === 'REJECTED' ? 'var(--color-danger-light)' : 'var(--color-success-light)',
                color: plan.status === 'REJECTED' ? 'var(--color-danger)' : 'var(--color-success)',
              }}
            >
              <MessageSquare size={13} style={{ marginTop: 2, flexShrink: 0 }} />
              {plan.reviewComment}
            </div>
          )}
          {plan.reviewedByUsername && (
            <div className="plan-reviewer">Проверил: {plan.reviewedByUsername}</div>
          )}
        </div>

        <div className="plan-card-actions">
          {canSubmit && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onSubmit(plan.id)}
              disabled={submitting === plan.id}
            >
              {submitting === plan.id
                ? <Loader2 size={14} className="spin" />
                : <><Send size={13} /> Отправить</>}
            </button>
          )}
          {canReview && (
            <>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                onClick={() => handleReview('APPROVED')}
                disabled={submitting === plan.id}
              >
                <CheckCircle size={13} /> Утвердить
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                onClick={() => handleReview('REJECTED')}
                disabled={submitting === plan.id}
              >
                <XCircle size={13} /> Отклонить
              </button>
            </>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && reviewMode && (
        <div
          className="plan-review-box"
          style={{ background: reviewMode === 'APPROVED' ? 'var(--color-success-light)' : 'var(--color-danger-light)' }}
        >
          <div className="plan-review-box-title">
            {reviewMode === 'APPROVED' ? 'Подтверждение утверждения' : 'Причина отклонения'}
          </div>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="plan-review-actions">
            <button
              className="btn btn-primary btn-sm"
              style={{
                background: reviewMode === 'APPROVED' ? 'var(--color-success)' : 'var(--color-danger)',
                borderColor: reviewMode === 'APPROVED' ? 'var(--color-success)' : 'var(--color-danger)',
              }}
              onClick={submitReview}
              disabled={submitting === plan.id}
            >
              {submitting === plan.id ? <Loader2 size={14} className="spin" /> : 'Подтвердить'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setReviewMode(null); setExpanded(false) }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanApprovalPage() {
  const { user } = useAuth()
  const isDirector   = user?.role === 'DIRECTOR' || user?.role === 'ADMIN'
  const isAgronomist = user?.role === 'AGRONOMIST' || user?.role === 'ADMIN'

  const [plans, setPlans]             = useState<SeasonPlan[]>([])
  const [fields, setFields]           = useState<Field[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<PlanStatus | ''>('')

  const [showForm, setShowForm]         = useState(false)
  const [formFieldId, setFormFieldId]   = useState<number | ''>('')
  const [formCropType, setFormCropType] = useState('')
  const [formSeason, setFormSeason]     = useState(String(new Date().getFullYear()))
  const [formDesc, setFormDesc]         = useState('')
  const [creating, setCreating]         = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await reportService.getPlans(filterStatus ? { status: filterStatus } : {})
      setPlans([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки планов')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    loadPlans()
    fieldService.getAllFields().then(setFields).catch(console.error)
  }, [loadPlans])

  async function handleSubmitForApproval(id: number) {
    setSubmitting(id)
    try {
      const updated = await reportService.submitForApproval(id)
      setPlans(prev => prev.map(p => p.id === id ? updated : p))
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка отправки')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleReview(id: number, status: 'APPROVED' | 'REJECTED', comment: string) {
    setSubmitting(id)
    try {
      const updated = await reportService.reviewPlan(id, { status, comment })
      setPlans(prev => prev.map(p => p.id === id ? updated : p))
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка рецензирования')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formFieldId || !formCropType || !formSeason) return
    setCreating(true)
    try {
      const req: SeasonPlanRequest = {
        fieldId: Number(formFieldId),
        cropType: formCropType,
        season: formSeason,
        description: formDesc || undefined,
      }
      const created = await reportService.createPlan(req)
      setPlans(prev => [created, ...prev])
      setShowForm(false)
      setFormFieldId(''); setFormCropType(''); setFormSeason(String(new Date().getFullYear())); setFormDesc('')
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка создания плана')
    } finally {
      setCreating(false)
    }
  }

  const statusCounts = plans.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1; return acc
  }, {} as Record<PlanStatus, number>)

  return (
    <div className="plan-page">
      <div className="plan-header">
        <div className="plan-header-left">
          <CheckCircle size={22} color="var(--color-primary)" />
          <h1 className="page-title">Утверждение планов</h1>
        </div>
        {isAgronomist && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={15} /> Новый план
          </button>
        )}
      </div>

      <div className="status-filters">
        {(Object.entries(STATUS_CONFIG) as [PlanStatus, (typeof STATUS_CONFIG)[PlanStatus]][]).map(([s, cfg]) => (
          <button
            key={s}
            className="status-pill"
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            style={{
              borderColor: cfg.color,
              background: filterStatus === s ? cfg.color + '33' : 'transparent',
              color: cfg.color,
            }}
          >
            {cfg.icon} {cfg.label} {statusCounts[s] ? <b>({statusCounts[s]})</b> : null}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card card-padding mb-20">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Создать новый план</div>
          <form onSubmit={handleCreate}>
            <div className="plan-create-form">
              <div className="form-group">
                <label className="form-label">Поле *</label>
                <select className="form-control" value={formFieldId} onChange={e => setFormFieldId(Number(e.target.value) || '')} required>
                  <option value="">— выберите —</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Культура *</label>
                <input className="form-control" value={formCropType} onChange={e => setFormCropType(e.target.value)} required placeholder="Пшеница" />
              </div>
              <div className="form-group">
                <label className="form-label">Сезон (год) *</label>
                <input className="form-control" value={formSeason} onChange={e => setFormSeason(e.target.value)} required placeholder="2025" />
              </div>
              <div className="form-group">
                <label className="form-label">Описание</label>
                <input className="form-control" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Необязательно" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? <Loader2 size={14} className="spin" /> : 'Создать'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="alert-warning mb-12">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto' }} />
        </div>
      ) : plans.length === 0 ? (
        <div className="plan-empty">
          <CheckCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div>Планов не найдено</div>
        </div>
      ) : (
        <div>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isDirector={isDirector}
              isAgronomist={isAgronomist}
              onSubmit={handleSubmitForApproval}
              onReview={handleReview}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
