import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'

export function ReviewPage() {
  const [searchParams] = useSearchParams()
  const [isFlipped, setIsFlipped] = useState(false)
  
  const folderId = searchParams.get('folderId')
  const setId = searchParams.get('setId')
  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',') : []
  const uncategorized = searchParams.get('uncategorized') === 'true'
  
  const cards = useLiveQuery(async () => {
    let allCards = await db.cards.toArray()
    
    if (folderId || uncategorized) {
      const allSets = await db.sets.toArray()
      const matchingSetIds = new Set<string>()
      allSets.forEach(s => {
        if (uncategorized && s.folder_id === null) matchingSetIds.add(s.id)
        if (folderId && s.folder_id === folderId) matchingSetIds.add(s.id)
      })
      allCards = allCards.filter(c => matchingSetIds.has(c.set_id))
    }
    
    if (setId) allCards = allCards.filter(c => c.set_id === setId)
    if (tags.length > 0) allCards = allCards.filter(c => tags.some(t => c.tags.includes(t)))
    
    return allCards.filter(c => c.due <= Date.now())
  }, [folderId, setId, tagsParam, uncategorized])

  if (cards === undefined) return <p>Loading cards...</p>
  
  const backTo = setId ? `/runner/${setId}` : '/cards'
  
  if (cards.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', marginTop: '4rem' }}>
        <h2>All done for now! 🎉</h2>
        <p style={{ color: '#94a3b8' }}>No cards due for review with these filters.</p>
        <Link to={backTo} style={{ display: 'inline-block', marginTop: '1rem', color: '#38bdf8' }}>← Go back</Link>
      </div>
    )
  }

  const currentCard = cards[0]

  const handleRating = async (rating: 'again' | 'good') => {
    const now = Date.now()
    let newInterval = currentCard.interval
    let newDue = now

    if (rating === 'again') {
      newInterval = 0
      newDue = now + 60 * 1000
    } else {
      newInterval = currentCard.interval === 0 ? 1 : currentCard.interval * 2
      newDue = now + newInterval * 24 * 60 * 60 * 1000
    }

    await db.cards.update(currentCard.id, {
      interval: newInterval, due: newDue, reps: currentCard.reps + 1
    })
    setIsFlipped(false)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Link to={backTo} style={{ color: '#94a3b8', textDecoration: 'none' }}>← Quit Review</Link>
        <span style={{ color: '#94a3b8' }}>Cards due: {cards.length}</span>
      </div>

      <div 
        onClick={() => !isFlipped && setIsFlipped(true)}
        style={{ 
          minHeight: '300px', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          padding: '2rem', cursor: isFlipped ? 'default' : 'pointer', textAlign: 'center', transition: '0.2s',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', wordBreak: 'break-word', overflowWrap: 'anywhere'
        }}
      >
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#e2e8f0', lineHeight: 1.2 }}>{currentCard.front}</h2>
        
        {isFlipped && (
          <>
            <hr style={{ width: '50%', borderColor: '#475569', margin: '2rem 0' }} />
            <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#38bdf8', lineHeight: 1.4 }}>{currentCard.back}</h3>
          </>
        )}

        {!isFlipped && <p style={{ color: '#64748b', marginTop: '2rem', fontSize: '0.9rem' }}>Click to reveal answer</p>}
      </div>

      {isFlipped && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={() => handleRating('again')} style={{ flex: 1, padding: '1rem', background: '#7f1d1d', color: '#fecaca', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Again (1 min)</button>
          <button onClick={() => handleRating('good')} style={{ flex: 1, padding: '1rem', background: '#14532d', color: '#dcfce7', border: '1px solid #22c55e', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Good (Next interval)</button>
        </div>
      )}
    </div>
  )
}
