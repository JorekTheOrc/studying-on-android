import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import type { Card } from '../../types'

export function AllCardsPage() {
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  
  // Edit State
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [editTags, setEditTags] = useState('')

  if (!cards || !sets) return <p>Loading cards...</p>

  const setMap = new Map(sets.map(s => [s.id, s]))
  const allTags = Array.from(new Set(cards.flatMap(c => c.tags)))

  const filteredCards = cards.filter(c => {
    const matchesSearch = c.front.toLowerCase().includes(search.toLowerCase()) || c.back.toLowerCase().includes(search.toLowerCase())
    const matchesTag = filterTag === '' || c.tags.includes(filterTag)
    return matchesSearch && matchesTag
  }).sort((a, b) => b.due - a.due)

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

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

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>All Flashcards</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ padding: '0.6rem', background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer' }}>
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
          <input type="text" placeholder="Search words..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.6rem 1rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px', width: '200px' }} />
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
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
                    <div style={{ marginBottom: '0.3rem', color: isDue ? '#fca5a5' : '#86efac', fontWeight: 'bold' }}>
                      {isDue ? 'Due Now' : `Due: ${formatDate(card.due)}`}
                    </div>
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

      {/* Card Edit Modal */}
      {editingCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Card</h2>
            
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              Front (Лицевая сторона)
              <input type="text" value={editFront} onChange={e => setEditFront(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              Back (Обратная сторона)
              <input type="text" value={editBack} onChange={e => setEditBack(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>

            <label style={{ display: 'block', marginBottom: '1.5rem' }}>
              Tags (comma separated)
              <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. noun, verb, hard" style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEditingCard(null)} style={{ flex: 1, padding: '0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '0.8rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
