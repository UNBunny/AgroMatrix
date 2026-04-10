import { useEffect } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  side?: 'left' | 'right'
  width?: number | string
  title?: string
  children: React.ReactNode
  /** Показывать ли затемнённый backdrop */
  backdrop?: boolean
  className?: string
}

/**
 * Универсальная боковая выдвижная панель.
 * Может использоваться как левый drawer (список полей) или правый (детали).
 */
export function Drawer({
  isOpen,
  onClose,
  side = 'right',
  width = 320,
  title,
  children,
  backdrop = false,
  className = '',
}: DrawerProps) {
  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthValue = typeof width === 'number' ? `${width}px` : width

  return (
    <>
      {backdrop && (
        <div
          className="drawer-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 'var(--z-drawer)' as any,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}
      <div
        className={`drawer drawer-${side} ${className}`}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: widthValue,
          background: 'var(--color-surface)',
          boxShadow: side === 'left' ? 'var(--shadow-xl)' : 'calc(-1 * var(--shadow-xl, 0 8px 24px rgba(0,0,0,0.12)))',
          zIndex: 'var(--z-drawer)' as any,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: `slide-in-${side} 0.25s ease`,
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{title}</span>
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </>
  )
}

