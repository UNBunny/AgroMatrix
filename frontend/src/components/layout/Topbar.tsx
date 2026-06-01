import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { AppRole } from '../../hooks/useRole'

const breadcrumbMap: Record<string, string[]> = {
  '/': ['Карта полей'],
  '/map': ['Карта полей'],
  '/dashboard': ['Дашборд'],
  '/ndvi': ['Мониторинг', 'NDVI'],
  '/fields': ['Агрономия', 'Поля'],
  '/fields/new': ['Агрономия', 'Поля', 'Создание поля'],
  '/crop-rotation': ['Агрономия', 'Севооборот'],
  '/phenology': ['Агрономия', 'Фенология BBCH'],
  '/diseases': ['Защита растений', 'Болезни'],
  '/soil': ['Агрохимия', 'Почва'],
  '/field-protection': ['Агрохимия', 'Питание и защита'],
  '/disease-prediction': ['Агрохимия', 'ML-прогноз болезней'],
  '/operations': ['Агрохимия', 'Журнал операций'],
  '/recommendations': ['Аналитика', 'Рекомендации'],
  '/market': ['Аналитика', 'Рынок регионов'],
  '/price-history': ['Аналитика', 'История цен'],
  '/crops': ['Справочники', 'Культуры и сорта'],
  '/profile': ['Профиль хозяйства'],
}

interface TopbarProps {
  onHamburgerClick?: () => void
  role?: AppRole
  onRoleChange?: (r: AppRole) => void
}

export default function Topbar({ onHamburgerClick, role = 'agronomist', onRoleChange }: TopbarProps) {
  const location = useLocation()
  const crumbs = breadcrumbMap[location.pathname] || [location.pathname.replace('/', '') || 'Главная']

  return (
    <header className="topbar">
      <button className="topbar-hamburger" onClick={onHamburgerClick} aria-label="Открыть меню">
        <Menu size={20} />
      </button>
      <div className="topbar-breadcrumbs">
        <span className="breadcrumb-item">AgroMatrix</span>
        {crumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="breadcrumb-sep">/</span>
            <span className={`breadcrumb-item${i === crumbs.length - 1 ? ' current' : ''}`}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

    </header>
  )
}

