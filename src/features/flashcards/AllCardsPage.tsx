import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useNavigate } from 'react-router-dom'
import type { Card } from '../../types'
import { ReviewModal } from '../../shared/ReviewModal'
import { getFolderColor } from '../../utils'

export function AllCardsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterFolder, setFilterFolder] = useState('all')
  const [filterSet, setFilterSet] = useState('all')
  const [filterTags, setFilterTags] = useState<string[]>([])
  
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  const folders = useLiveQuery(() => db.folders.toArray(), [])
  
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [editTags, setEditTags] = useState('')

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewBaseUrl, setReviewBaseUrl] = useState('')

  if (!cards || !sets || !folders) return <p>Loading cards...</p>

  const setMap = new Map(sets.map(s => [s.id, s]))
  const allTags = Array.from(new Set(cards.flatMap(c => c.tags))).sort()

  const filteredCards = cards.filter(c => {
    const set = setMap.get(c.set_id)
    if (!set) return false
    
    if (filterFolder !== 'all') {
      if (filterFolder === 'null' && set.folder_id !== null) return false
      if (filterFolder !== 'null' && set.folder_id !== filterFolder) return false
    }
    if (filterSet !== 'all' && c.set_id !== filterSet) return false
    if (filterTags.length > 0 && !filterTags.some(t => c.tags.includes(t))) return false
    const q = search.toLowerCase()
    if (q && !c.front.toLowerCase().includes(q) && !c.back.toLowerCase().includes(q)) return false
    
    return true
  }).sort((a, b) => b.due - a.due)

  const dueCount = filteredCards.filter(c => c.due <= Date.now()).length
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

  const toggleTag = (tag: string) => {
    setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const openReviewModal = () => {
    const params = new URLSearchParams()
    if (filterFolder !== 'all') {
      if (filterFolder === 'null') params.set('uncategorized', 'true')
      else params.set('folderId', filterFolder)
    }
    if (filterSet !== 'all') params.set('setId', filterSet)
    if (filterTags.length > 0) params.set('tags', filterTags.join(','))
    setReviewBaseUrl(params.toString())
    setIsReviewModalOpen(true)
  }

  const handleStartReview = (direction: string) => {
    const params = new URLSearchParams(reviewBaseUrl)
    params.set('direction', direction)
    navigate(`/review?${params.toString()}`)
  }

  const openEdit = (card: Card) => {
    setEditingCard(card)
    setEditFront(card.front)
    setEditBack(card.back)
    setEditTags(card.tags.join(', '))
  }

  const saveEdit = async () => {
    if (!editingCard) return
    const tagsArray = editTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    await db.cards.update(editingCard.id, { front: editFront, back: editBack, tags: tagsArray })
    setEditingCard(null)
  }

  const setsForFolder = filterFolder === 'all' ? sets : sets.filter(s => {
    if (filterFolder === 'null') return s.folder_id === null
    return s.folder_id === filterFolder
  })

  // Pill Component
  const Pill = ({ active, onClick, children, color }: any) => (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.8rem',
        borderRadius: '16px',
        background: active ? (color || '#0ea5e9') : '#1e293b',
        border: `1px solid ${active ? (color || '#0ea5e9') : '#475569'}`,
        color: active ? '#fff' : '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: active ? 'bold' : 'normal',
        transition: '0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem'
      }}
    >
      {children}
    </button>
  )

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>All Flashcards</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search words..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.6rem 1rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px', width: '200px' }} />
          <button onClick={openReviewModal} disabled={dueCount === 0} style={{ padding: '0.6rem 1.2rem', background: dueCount > 0 ? '#8b5cf6' : '#334155', color: '#fff', border: 'none', borderRadius: '8px', cursor: dueCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
            🎴 Start Review ({dueCount})
          </button>
        </div>
      </div>

      {/* Hierarchical Filters */}
      <div style={{ background: '#1e293b', padding: '1.2rem', borderRadius: '8px', border: '1px solid #334155', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Folders Row */}
        <div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Filter by Folder:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <Pill active={filterFolder === 'all'} onClick={() => { setFilterFolder('all'); setFilterSet('all') }}>All Folders</Pill>
            <Pill active={filterFolder === 'null'} onClick={() => { setFilterFolder('null'); setFilterSet('all') }}>Uncategorized</Pill>
            {folders.filter(f => f.parent_id === null).map(f => (
              <Pill key={f.id} active={filterFolder === f.id} onClick={() => { setFilterFolder(f.id); setFilterSet('all') }} color={getFolderColor(f.id)}>
                {f.name}
              </Pill>
            ))}
          </div>
        </div>

        {/* Sets Sub-Row */}
        <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Filter by Set:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <Pill active={filterSet === 'all'} onClick={() => setFilterSet('all')}>All Sets</Pill>
            {setsForFolder.map(s => (
              <Pill key={s.id} active={filterSet === s.id} onClick={() => setFilterSet(s.id)}>
                {s.title}
              </Pill>
            ))}
          </div>
        </div>

        {/* Tags Row */}
        {allTags.length > 0 && (
          <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Filter by Tags:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {allTags.map(tag => {
                const isActive = filterTags.includes(tag)
                return (
                  <Pill key={tag} active={isActive} onClick={() => toggleTag(tag)} color="#0ea5e9">
                    #{tag}
                  </Pill>
                )
              })}
              {filterTags.length > 0 && (
                <button onClick={() => setFilterTags([])} style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px dashed #64748b', color: '#94a3b8', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem' }}>Clear tags</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
        Showing {filteredCards.length} cards ({dueCount} due now)
      </div>

      {filteredCards.length === 0 ? (
        <div style={{ padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>No cards found</h2>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredCards.map(card => {
            const isDue = card.due <= Date.now()
            const set = setMap.get(card.set_id)
            return (
              <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '1.2rem', borderRadius: '8px', borderLeft: `4px solid ${isDue ? '#ef4444' : '#22c55e'}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.3rem' }}>{card.front}</div>
                  <div style={{ color: '#38bdf8', fontSize: '1rem', marginBottom: '0.8rem' }}>{card.back}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Set: <strong>{set?.title || 'Unknown'}</strong></span>
                    {card.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {card.tags.map(t => <span key={t} style={{ background: '#334155', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8', minWidth: '120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div>
                    <div style={{ marginBottom: '0.3rem', color: isDue ? '#fca5a5' : '#86efac', fontWeight: 'bold' }}>{isDue ? 'Due Now' : `Due: ${formatDate(card.due)}`}</div>
                    <div>Reviews: {card.reps}</div>
                    <div>Interval: {card.interval} days</div>
                  </div>
                  <button onClick={() => openEdit(card)} style={{ padding: '0.4rem 0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingCard && (
        <div onClick={() => setEditingCard(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Card</h2>
            <label style={{ display: 'block', marginBottom: '1rem' }}>Front
              <input type="text" value={editFront} onChange={e => setEditFront(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '1rem' }}>Back
              <input type="text" value={editBack} onChange={e => setEditBack(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '1.5rem' }}>Tags (comma separated)
              <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. noun, verb, hard" style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEditingCard(null)} style={{ flex: 1, padding: '0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '0.8rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} onSelect={handleStartReview} />
    </div>
  )
}
