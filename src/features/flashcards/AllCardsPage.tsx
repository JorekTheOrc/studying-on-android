import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useState } from 'react'

export function AllCardsPage() {
  const [search, setSearch] = useState('')
  
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  
  if (!cards || !sets) return <p>Loading cards...</p>

  // Map set_id to set title for display
  const setMap = new Map(sets.map(s => [s.id, s.title]))

  const filteredCards = cards.filter(c => 
    c.front.toLowerCase().includes(search.toLowerCase()) || 
    c.back.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.due - a.due) // Sort by due date (newest first)

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>All Flashcards</h1>
        <input 
          type="text" 
          placeholder="Search front or back..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.6rem 1rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px', width: '300px' }}
        />
      </div>

      {filteredCards.length === 0 ? (
        <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>No cards found</h2>
          <p>Look up words during practice and add them, or import sets with cards.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {filteredCards.map(card => {
            const isDue = card.due <= Date.now()
            return (
              <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${isDue ? '#ef4444' : '#22c55e'}` }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.3rem' }}>{card.front}</div>
                  <div style={{ color: '#38bdf8', fontSize: '1rem' }}>{card.back}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Set: {setMap.get(card.set_id) || 'Unknown'} | Tags: {card.tags.length > 0 ? card.tags.join(', ') : 'none'}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8' }}>
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
