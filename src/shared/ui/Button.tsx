import type { CSSProperties, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'purple' | 'warning' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
  title?: string
}

const COLORS: Record<Variant, { bg: string; color: string; border: string; hover: string }> = {
  primary:   { bg: '#0ea5e9', color: '#fff', border: '#0ea5e9', hover: '#0284c7' },
  secondary: { bg: '#334155', color: '#fff', border: '#334155', hover: '#475569' },
  danger:    { bg: '#ef4444', color: '#fff', border: '#ef4444', hover: '#dc2626' },
  success:   { bg: '#22c55e', color: '#fff', border: '#22c55e', hover: '#16a34a' },
  purple:    { bg: '#8b5cf6', color: '#fff', border: '#8b5cf6', hover: '#7c3aed' },
  warning:   { bg: '#eab308', color: '#fff', border: '#eab308', hover: '#ca8a04' },
  ghost:     { bg: 'transparent', color: '#94a3b8', border: 'transparent', hover: '#334155' },
}

const PADDING: Record<Size, string> = {
  sm: '0.4rem 0.8rem',
  md: '0.6rem 1rem',
  lg: '0.8rem 1.5rem',
}

const FONT_SIZE: Record<Size, string> = {
  sm: '0.85rem',
  md: '0.95rem',
  lg: '1.05rem',
}

export function Button({
  children, onClick, variant = 'secondary', size = 'md',
  fullWidth, disabled, type = 'button', style, title
}: ButtonProps) {
  const c = COLORS[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: PADDING[size],
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 'bold',
        fontSize: FONT_SIZE[size],
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, transform 0.1s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = c.hover }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = c.bg }}
    >
      {children}
    </button>
  )
}
