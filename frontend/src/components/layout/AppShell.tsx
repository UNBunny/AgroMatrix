import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import { useRole } from '../../hooks/useRole'

// Страницы с fullscreen картой (без topbar и padding)
const FULLSCREEN_ROUTES = ['/map', '/']

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isFullscreen = FULLSCREEN_ROUTES.includes(location.pathname)
  const { role, setRole } = useRole()

  // Close mobile sidebar on navigation
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop${mobileOpen ? ' visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        role={role}
      />

      <div className="main-area" style={{ minWidth: 0 }}>
        {!isFullscreen && (
          <Topbar
            onHamburgerClick={() => setMobileOpen(true)}
            role={role}
            onRoleChange={setRole}
          />
        )}
        <div
          className={isFullscreen ? 'page-content-fullscreen' : 'page-content-padded'}
        >
          <Outlet />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

