import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  onClick?: () => void
  accent?: string
  highlight?: boolean
  style?: CSSProperties
}

export function Card({ children, onClick, accent, highlight, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#1e293b',
        border: `1px solid ${highlight ? '#0ea5e9' : '#334155'}`,
        borderLeft: accent ? `6px solid ${accent}` : `1px solid ${highlight ? '#0ea5e9' : '#334155'}`,
        borderRadius: '12px',
        padding: '1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.1s',
        ...style,
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = '#475569' }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = highlight ? '#0ea5e9' : '#334155' }}
    >
      {children}
    </div>
  )
}
