import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Sprout, Bug, ChevronLeft, ChevronRight,
  LayoutDashboard, ArrowLeftCircle, Settings, FlaskConical
} from 'lucide-react'

const adminNav = [
  { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Обзор', end: true },
  { to: '/admin/crops', icon: <Sprout size={18} />, label: 'Культуры и сорта' },
  { to: '/admin/diseases', icon: <Bug size={18} />, label: 'Болезни' },
  { to: '/admin/products', icon: <FlaskConical size={18} />, label: 'Каталог препаратов' },
]

export default function AdminShell() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar-panel${collapsed ? ' collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <Settings size={20} className="admin-logo-icon" />
            {!collapsed && <span className="admin-logo-text">Администрирование</span>}
          </div>
          <button
            className="admin-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="admin-nav">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {!collapsed && <span className="admin-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            className="admin-back-btn"
            onClick={() => navigate('/map')}
            title="Вернуться в приложение"
          >
            <ArrowLeftCircle size={18} />
            {!collapsed && <span>Вернуться в АgroPlan</span>}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <span className="admin-topbar-emoji">🌾</span>
            <span>AgroPlanPro — Панель администратора</span>
          </div>
        </header>
        <div className="admin-content-area">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
