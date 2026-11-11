import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import type { Card } from '../../types'
import { speak } from '../../utils/tts'
import { useTtsEnabled } from '../../utils/useTtsEnabled'

export function ReviewPage() {
  const [searchParams] = useSearchParams()
  const [isFlipped, setIsFlipped] = useState(false)
  const ttsEnabled = useTtsEnabled()
  
  const folderId = searchParams.get('folderId')
  const setId = searchParams.get('setId')
  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',') : []
  const uncategorized = searchParams.get('uncategorized') === 'true'
  const direction = searchParams.get('direction') || 'target_to_native'
  
  const initialCards = useLiveQuery(async () => {
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

  const [sessionQueue, setSessionQueue] = useState<Card[]>([])
  
  const set = useLiveQuery(() => setId ? db.sets.get(setId) : undefined, [setId])
  const targetLang = set?.target_lang || 'en'
  const nativeLang = set?.native_lang || 'ru'

  useEffect(() => {
    if (initialCards && initialCards.length > 0) {
      setSessionQueue(initialCards)
    }
  }, [initialCards])

  const currentCard = sessionQueue[0]
  const cardDisplay = useMemo(() => {
    if (!currentCard) return { front: '', back: '', frontLang: 'en', backLang: 'ru', isCloze: false }
    
    if (currentCard.type === 'cloze') {
      // For cloze, always show the cloze sentence as "front"
      return { front: currentCard.front, back: '', frontLang: targetLang, backLang: nativeLang, isCloze: true }
    }

    let showFront = currentCard.front
    let showBack = currentCard.back || ''
    let frontLang = targetLang
    let backLang = nativeLang

    if (direction === 'native_to_target') {
      showFront = currentCard.back || ''
      showBack = currentCard.front
      frontLang = nativeLang
      backLang = targetLang
    } else if (direction === 'mixed') {
      const charCodeSum = currentCard.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
      if (charCodeSum % 2 === 0) {
        showFront = currentCard.back || ''
        showBack = currentCard.front
        frontLang = nativeLang
        backLang = targetLang
      }
    }

    return { front: showFront, back: showBack, frontLang, backLang, isCloze: false }
  }, [currentCard, direction, targetLang, nativeLang])

  // Helper to hide cloze text: {{c1::Paris}} -> [___]
  const renderClozeFront = (text: string) => {
    return text.replace(/\{\{c\d+::(.*?)\}\}/g, '[___]')
  }

  // Helper to reveal cloze text
  const renderClozeBack = (text: string) => {
    return text.replace(/\{\{c\d+::(.*?)\}\}/g, '$1')
  }

  if (initialCards === undefined) return <p>Loading cards...</p>
  
  const backTo = setId ? `/runner/${setId}` : '/cards'

  if (sessionQueue.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', marginTop: '4rem' }}>
        <h2>All done for now! 🎉</h2>
        <p style={{ color: '#94a3b8' }}>You've reviewed all cards in this session.</p>
        <Link to={backTo} style={{ display: 'inline-block', marginTop: '1rem', color: '#38bdf8' }}>← Go back</Link>
      </div>
    )
  }

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

    setSessionQueue(prevQueue => {
      const rest = prevQueue.slice(1)
      if (rating === 'again') {
        return [...rest, { ...currentCard, due: newDue, interval: newInterval, reps: currentCard.reps + 1 }]
      }
      return rest
    })
    
    setIsFlipped(false)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Link to={backTo} style={{ color: '#94a3b8', textDecoration: 'none' }}>← Quit Review</Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!cardDisplay.isCloze && (
            <span style={{ color: '#8b5cf6', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
              {direction.replace(/_/g, ' ')}
            </span>
          )}
          {cardDisplay.isCloze && (
             <span style={{ color: '#f59e0b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
               Cloze
             </span>
          )}
          <span style={{ color: '#94a3b8' }}>Queue: {sessionQueue.length}</span>
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
          <h2 style={{ fontSize: '2rem', margin: 0, color: '#e2e8f0', lineHeight: 1.2 }}>
            {cardDisplay.isCloze && !isFlipped ? renderClozeFront(cardDisplay.front) : cardDisplay.front}
          </h2>
          {ttsEnabled && !cardDisplay.isCloze && (
            <button onClick={(e) => { e.stopPropagation(); speak(cardDisplay.front, cardDisplay.frontLang) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', padding: 0 }}>🔊</button>
          )}
        </div>
        
        {isFlipped && cardDisplay.isCloze && (
          <>
            <hr style={{ width: '50%', borderColor: '#475569', margin: '2rem 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#38bdf8', lineHeight: 1.4 }}>
                {renderClozeBack(cardDisplay.front)}
              </h3>
              {ttsEnabled && (
                <button onClick={(e) => { e.stopPropagation(); speak(renderClozeBack(cardDisplay.front), cardDisplay.frontLang) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>🔊</button>
              )}
            </div>
          </>
        )}

        {isFlipped && !cardDisplay.isCloze && (
          <>
            <hr style={{ width: '50%', borderColor: '#475569', margin: '2rem 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#38bdf8', lineHeight: 1.4 }}>{cardDisplay.back}</h3>
              {ttsEnabled && (
                <button onClick={(e) => { e.stopPropagation(); speak(cardDisplay.back, cardDisplay.backLang) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>🔊</button>
              )}
            </div>
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
