import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'

export function AllCardsPage() {
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  
  if (!cards || !sets) return <p>Loading cards...</p>

  const setMap = new Map(sets.map(s => [s.id, s]))

  // Get all unique tags for the filter dropdown
  const allTags = Array.from(new Set(cards.flatMap(c => c.tags)))

  const filteredCards = cards.filter(c => {
    const s = setMap.get(c.set_id)
    const matchesSearch = c.front.toLowerCase().includes(search.toLowerCase()) || c.back.toLowerCase().includes(search.toLowerCase())
    const matchesTag = filterTag === '' || c.tags.includes(filterTag)
    return matchesSearch && matchesTag
  }).sort((a, b) => b.due - a.due)

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header Layout Fix */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>All Flashcards</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ padding: '0.6rem', background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer' }}>
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
          <input 
            type="text" placeholder="Search words..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.6rem 1rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px', width: '200px' }}
          />
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>No cards found</h2>
          <p>Look up words during practice or change your search filters.</p>
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
                
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8', minWidth: '120px' }}>
                  <div style={{ marginBottom: '0.3rem', color: isDue ? '#fca5a5' : '#86efac', fontWeight: 'bold' }}>
                    {isDue ? 'Due Now' : `Due: ${formatDate(card.due)}`}
                  </div>
                  <div>Reviews: {card.reps}</div>
                  <div>Interval: {card.interval} days</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
