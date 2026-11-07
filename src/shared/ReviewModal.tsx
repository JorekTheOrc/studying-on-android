
interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (direction: 'target_to_native' | 'native_to_target' | 'mixed') => void
}

export function ReviewModal({ isOpen, onClose, onSelect }: Props) {
  if (!isOpen) return null

  const options = [
    { id: 'target_to_native', label: 'Target → Native', desc: 'Show foreign word, guess translation (default)' },
    { id: 'native_to_target', label: 'Native → Target', desc: 'Show translation, guess foreign word (active recall)' },
    { id: 'mixed', label: 'Mixed', desc: 'Random direction for each card' },
  ] as const

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '100%' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Select Direction</h2>
        
        <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1.5rem' }}>
          {options.map(opt => (
            <button 
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              style={{ padding: '1rem', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', textAlign: 'left', cursor: 'pointer', transition: '0.2s' }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#0ea5e9'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#475569'}
            >
              <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '0.3rem' }}>{opt.label}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{opt.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
      </div>
    </div>
  )
}
