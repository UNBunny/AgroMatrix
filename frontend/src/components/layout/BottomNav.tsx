import { NavLink } from 'react-router-dom'
import { Map, Layers, TrendingUp, LayoutDashboard, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/map',             icon: <Map size={22} />,             label: 'Карта' },
  { to: '/fields',          icon: <Layers size={22} />,          label: 'Поля' },
  { to: '/dashboard',       icon: <LayoutDashboard size={22} />, label: 'Дашборд' },
  { to: '/recommendations', icon: <TrendingUp size={22} />,      label: 'Советник' },
  { to: '/market',          icon: <BarChart3 size={22} />,       label: 'Рынок' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          {item.icon}
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
