// Badge компонент
interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'gray'
  className?: string
}

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  )
}

// Функция для получения NDVI бейджа
export function getNdviBadge(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return <Badge variant="gray">Нет данных</Badge>
  }
  if (value >= 0.6) return <Badge variant="green">🟢 {value.toFixed(2)} Хороший</Badge>
  if (value >= 0.4) return <Badge variant="yellow">🟡 {value.toFixed(2)} Умеренный</Badge>
  if (value >= 0.2) return <Badge variant="orange">🟠 {value.toFixed(2)} Слабый</Badge>
  return <Badge variant="red">🔴 {value.toFixed(2)} Критический</Badge>
}

export function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    PLANNED: { label: 'Запланировано', variant: 'blue' },
    PLANTED: { label: 'Посажено', variant: 'green' },
    GROWING: { label: 'Растёт', variant: 'green' },
    HARVESTED: { label: 'Собрано', variant: 'yellow' },
  }
  const item = map[status] || { label: status, variant: 'gray' }
  return <Badge variant={item.variant}>{item.label}</Badge>
}

