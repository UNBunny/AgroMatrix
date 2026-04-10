interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  iconColor?: 'green' | 'blue' | 'orange' | 'red'
  subtitle?: string
}

export function StatCard({ icon, value, label, iconColor = 'green', subtitle }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className={`stat-card-icon ${iconColor}`}>{icon}</div>
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

