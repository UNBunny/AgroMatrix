import { NavLink, useLocation } from 'react-router-dom'
import {
  Map, LayoutDashboard, Layers,
  Book, ChevronLeft, ChevronRight, User, Repeat2,
  TrendingUp, ShieldAlert, FlaskConical, X,
  BarChart3, Sprout, Settings, Building2, Calculator
} from 'lucide-react'
import { AppRole, ROLE_LABELS } from '../../hooks/useRole'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
  role?: AppRole
}

const navGroups = [
  {
    label: 'Мониторинг',
    items: [
      { to: '/map',    icon: <Map size={18} />,             label: 'Карта полей' },
    ]
  },
  {
    label: 'Поля и посевы',
    items: [
      { to: '/fields',        icon: <Layers size={18} />,  label: 'Мои поля' },
      { to: '/crop-rotation', icon: <Repeat2 size={18} />, label: 'Севооборот' },
    ]
  },
  {
    label: 'Агрохимия и почва',
    items: [
      { to: '/soil',             icon: <FlaskConical size={18} />, label: 'Почва' },
      { to: '/field-protection', icon: <ShieldAlert size={18} />,  label: 'Питание и защита' },
    ]
  },
  {
    label: 'Советник',
    items: [
      { to: '/recommendations', icon: <TrendingUp size={18} />, label: 'Рекомендации' },
      { to: '/economics',       icon: <Calculator size={18} />, label: 'Экономика поля' },
    ]
  },
  {
    label: 'Аналитика',
    items: [
      { to: '/market',    icon: <BarChart3 size={18} />,      label: 'Рынок регионов' },
      { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Дашборд' },
    ]
  },
  {
    label: 'Справочники',
    items: [
      { to: '/crops',    icon: <Book size={18} />,   label: 'Культуры и сорта' },
      { to: '/diseases', icon: <Sprout size={18} />, label: 'Болезни' },
    ]
  },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, role = 'agronomist' }: SidebarProps) {
  const location = useLocation()

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Лого + кнопка collapse */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🌾</span>
          {!collapsed && <span className="sidebar-logo-text">AgroPlanPro</span>}
        </div>
        <button className="sidebar-mobile-close" onClick={onMobileClose} aria-label="Закрыть меню">
          <X size={16} />
        </button>
        <button className="sidebar-collapse-btn" onClick={onToggle} data-tooltip={collapsed ? 'Развернуть' : 'Свернуть'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Навигация */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label} className="sidebar-group">
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.to ||
                (item.to === '/map' && location.pathname === '/')
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`sidebar-link${isActive ? ' active' : ''}`}
                  data-tooltip={collapsed ? item.label : undefined}
                >
                  <span className="link-icon">{item.icon}</span>
                  {!collapsed && <span className="link-label">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Пользователь */}
      <div className="sidebar-footer">
        <NavLink
          to="/profile"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          data-tooltip={collapsed ? 'Профиль хозяйства' : undefined}
          style={{ marginBottom: 4 }}
        >
          <span className="link-icon"><Building2 size={18} /></span>
          {!collapsed && <span className="link-label">Профиль хозяйства</span>}
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          data-tooltip={collapsed ? 'Администрирование' : undefined}
          style={{ marginBottom: 8 }}
        >
          <span className="link-icon"><Settings size={18} /></span>
          {!collapsed && <span className="link-label">Администрирование</span>}
        </NavLink>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            <User size={14} />
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{ROLE_LABELS[role]}</div>
              <div className="sidebar-user-role">AgroPlanPro</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}