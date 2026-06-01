import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sprout, Bug, Leaf, ArrowRight, TrendingUp, FlaskConical, FileSpreadsheet } from 'lucide-react'
import { cropTypeService, cropVarietyService } from '../../services/cropService'
import { diseaseService } from '../../services/diseaseService'
import { catalogEntryService } from '../../services/catalogEntryService'
import { downloadApiXls } from '../../services/exportService'

interface StatCard {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  route: string
}

export default function AdminOverviewPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ cropTypes: 0, varieties: 0, diseases: 0, products: 0 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  async function handleEnterpriseExport() {
    setExporting(true)
    try {
      await downloadApiXls('/enterprise/report/export', 'enterprise-report.xlsx')
    } catch (e) { console.error(e) } finally { setExporting(false) }
  }

  useEffect(() => {
    Promise.all([
      cropTypeService.getAll(),
      cropVarietyService.getAll(),
      diseaseService.getAll(),
      catalogEntryService.getAll().catch(() => [] as never[]),
    ]).then(([types, varieties, diseases, products]) => {
      setStats({ cropTypes: types.length, varieties: varieties.length, diseases: diseases.length, products: products.length })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const cards: StatCard[] = [
    {
      label: 'Культуры',
      value: loading ? '—' : stats.cropTypes,
      icon: <Sprout size={28} />,
      color: 'var(--color-primary)',
      route: '/admin/crops',
    },
    {
      label: 'Сорта',
      value: loading ? '—' : stats.varieties,
      icon: <Leaf size={28} />,
      color: 'var(--color-info)',
      route: '/admin/crops?tab=varieties',
    },
    {
      label: 'Болезни',
      value: loading ? '—' : stats.diseases,
      icon: <Bug size={28} />,
      color: 'var(--color-danger)',
      route: '/admin/diseases',
    },
    {
      label: 'Препараты защиты',
      value: loading ? '—' : stats.products,
      icon: <FlaskConical size={28} />,
      color: 'var(--color-info)',
      route: '/admin/products',
    },
  ]

  return (
    <div className="admin-overview">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <TrendingUp size={22} />
          <h1>Обзор справочников</h1>
        </div>
        <p className="admin-page-subtitle">
          Управление справочными данными системы AgroMatrix
        </p>
      </div>

      <div className="admin-stat-grid">
        {cards.map((card) => (
          <button
            key={card.label}
            className="admin-stat-card"
            onClick={() => navigate(card.route)}
          >
            <div className="admin-stat-icon" style={{ color: card.color }}>
              {card.icon}
            </div>
            <div className="admin-stat-info">
              <div className="admin-stat-value">{card.value}</div>
              <div className="admin-stat-label">{card.label}</div>
            </div>
            <ArrowRight size={16} className="admin-stat-arrow" />
          </button>
        ))}
      </div>

      <div className="admin-quick-actions">
        <h2>Быстрые действия</h2>
        <div className="admin-quick-grid">
          <button className="admin-quick-btn" onClick={() => navigate('/admin/crops')}>
            <Sprout size={18} />
            Управление культурами
          </button>
          <button className="admin-quick-btn" onClick={() => navigate('/admin/crops?tab=varieties')}>
            <Leaf size={18} />
            Управление сортами
          </button>
          <button className="admin-quick-btn" onClick={() => navigate('/admin/diseases')}>
            <Bug size={18} />
            Управление болезнями
          </button>
          <button className="admin-quick-btn" onClick={() => navigate('/admin/products')}>
            <FlaskConical size={18} />
            Каталог препаратов
          </button>
          <button className="admin-quick-btn" onClick={handleEnterpriseExport} disabled={exporting}>
            <FileSpreadsheet size={18} />
            {exporting ? 'Загрузка...' : 'Сводный отчёт (Excel)'}
          </button>
        </div>
      </div>
    </div>
  )
}
