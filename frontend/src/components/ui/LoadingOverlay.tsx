interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

/**
 * Полупрозрачный оверлей со спиннером.
 * Использует CSS-класс .loading-overlay из global.css.
 */
export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <div className="loading-overlay">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 8px' }} />
        {message && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{message}</div>
        )}
      </div>
    </div>
  )
}

