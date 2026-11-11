import type { ReactNode } from 'react'

interface PillProps {
  active?: boolean
  onClick?: () => void
  color?: string
  isEditing?: boolean
  children: ReactNode
}

export function Pill({ active, onClick, color = '#0ea5e9', isEditing, children }: PillProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.85rem',
        borderRadius: '16px',
        background: active ? color : '#1e293b',
        border: `1px solid ${active ? color : (isEditing ? '#f59e0b' : '#475569')}`,
        color: active ? '#fff' : '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: active ? 'bold' : 'normal',
        transition: '0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        whiteSpace: 'nowrap',
      }}
    >
      {isEditing && <span style={{ fontSize: '0.8rem' }}>✏️</span>}
      {children}
    </button>
  )
}
