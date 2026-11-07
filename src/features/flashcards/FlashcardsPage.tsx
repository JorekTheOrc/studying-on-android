import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'

export function FlashcardsPage() {
  const { setId } = useParams()
  const [isFlipped, setIsFlipped] = useState(false)
  
  // Fetch cards that are due (or just all cards for simplicity in MVP)
  const cards = useLiveQuery(async () => {
    if (!setId) return []
    const allCards = await db.cards.where('set_id').equals(setId).toArray()
    // In a real app we'd filter by due <= Date.now(), but for testing we show all
    return allCards.filter(c => c.due <= Date.now() || true) 
  }, [setId])

  if (cards === undefined) return <p>Loading cards...</p>
  if (cards.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', marginTop: '4rem' }}>
        <h2>No flashcards found.</h2>
        <p style={{ color: '#94a3b8' }}>Make sure your JSON included a "cards" array.</p>
        <Link to={`/runner/${setId}`} style={{ color: '#38bdf8' }}>← Back to Set</Link>
      </div>
    )
  }

  const currentCard = cards[0] // Just show the first due card

  const handleRating = async (rating: 'again' | 'good') => {
    const now = Date.now()
    let newInterval = currentCard.interval
    let newDue = now

    if (rating === 'again') {
      newInterval = 0
      newDue = now + 60 * 1000 // 1 minute
    } else {
      // Simple SM-2 approximation
      newInterval = currentCard.interval === 0 ? 1 : currentCard.interval * 2
      newDue = now + newInterval * 24 * 60 * 60 * 1000 // days
    }

    await db.cards.update(currentCard.id, {
      interval: newInterval,
      due: newDue,
      reps: currentCard.reps + 1
    })

    setIsFlipped(false)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Link to={`/runner/${setId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>← Quit Review</Link>
        <span style={{ color: '#94a3b8' }}>Cards due: {cards.length}</span>
      </div>

      {/* Card Container */}
      <div 
        onClick={() => !isFlipped && setIsFlipped(true)}
        style={{ 
          minHeight: '300px', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          padding: '2rem', cursor: isFlipped ? 'default' : 'pointer', textAlign: 'center', transition: '0.2s',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#e2e8f0' }}>{currentCard.front}</h2>
        
        {isFlipped && (
          <>
            <hr style={{ width: '50%', borderColor: '#475569', margin: '2rem 0' }} />
            <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#38bdf8' }}>{currentCard.back}</h3>
          </>
        )}

        {!isFlipped && (
          <p style={{ color: '#64748b', marginTop: '2rem', fontSize: '0.9rem' }}>Click to reveal answer</p>
        )}
      </div>

      {/* Action Buttons */}
      {isFlipped && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button 
            onClick={() => handleRating('again')}
            style={{ flex: 1, padding: '1rem', background: '#7f1d1d', color: '#fecaca', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Again (1 min)
          </button>
          <button 
            onClick={() => handleRating('good')}
            style={{ flex: 1, padding: '1rem', background: '#14532d', color: '#dcfce7', border: '1px solid #22c55e', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Good (Next interval)
          </button>
        </div>
      )}
    </div>
  )
}
