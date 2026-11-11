import type { CSSProperties } from 'react'

interface InputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'password' | 'number' | 'email'
  label?: string
  style?: CSSProperties
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function Input({ value, onChange, placeholder, type = 'text', label, style, autoFocus, onKeyDown }: InputProps) {
  const input = (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      style={{
        width: '100%',
        padding: '0.7rem 0.9rem',
        background: '#0f172a',
        border: '1px solid #475569',
        color: '#fff',
        borderRadius: '8px',
        fontSize: '0.95rem',
        boxSizing: 'border-box',
        ...style,
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
      onBlur={(e) => e.currentTarget.style.borderColor = '#475569'}
    />
  )

  if (!label) return input

  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.3rem' }}>{label}</div>
      {input}
    </label>
  )
}
