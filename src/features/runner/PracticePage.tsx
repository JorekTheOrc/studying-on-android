import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { generateUUID } from '../../utils'
import { speak } from '../../utils/tts'
import { useTtsEnabled } from '../../utils/useTtsEnabled'
import { useEscapeKey } from '../../shared/useEscapeKey'
import { InteractiveText } from '../../shared/InteractiveText'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function PracticePage() {
  const { setId, exerciseId } = useParams()
  const ttsEnabled = useTtsEnabled()
  
  const exercise = useLiveQuery(() => exerciseId ? db.exercises.get(exerciseId) : undefined, [exerciseId])
  const set = useLiveQuery(() => setId ? db.sets.get(setId) : undefined, [setId])
  
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (!exerciseId) return 0
    const saved = localStorage.getItem(`progress_${exerciseId}`)
    return saved ? JSON.parse(saved).currentIndex || 0 : 0
  })
  
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, { answer: any, isCorrect: boolean }>>(() => {
    if (!exerciseId) return {}
    const saved = localStorage.getItem(`progress_${exerciseId}`)
    return saved ? JSON.parse(saved).sessionAnswers || {} : {}
  })

  const [userAnswer, setUserAnswer] = useState<any>('')
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({})
  const [orderedTokens, setOrderedTokens] = useState<string[]>([])
  const [availableTokens, setAvailableTokens] = useState<string[]>([])
  const [viewedWords, setViewedWords] = useState<string[]>([])

  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [startTime, setStartTime] = useState(Date.now())
  const [showTheory, setShowTheory] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  useEscapeKey(showCardModal, () => setShowCardModal(false))
  useEscapeKey(showTheory, () => setShowTheory(false))
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [isFinished, setIsFinished] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)

  useEffect(() => {
    if (!exercise || isFinished) return
    const item = exercise.items[currentIndex]
    if (!item) return

    if (exercise.type === 'ordering' && item.tokens) {
      setAvailableTokens([...item.tokens].sort(() => Math.random() - 0.5))
      setOrderedTokens([])
    } else if (exercise.type === 'matching') {
      setMatchingSelections({})
    }
    
    setUserAnswer('')
    setViewedWords([])
    setStatus('idle')
    setShowHint(false)
  }, [currentIndex, exercise, isFinished])

  useEffect(() => {
    if (!exerciseId || isFinished) return
    localStorage.setItem(`progress_${exerciseId}`, JSON.stringify({ currentIndex, sessionAnswers }))
  }, [currentIndex, sessionAnswers, exerciseId, isFinished])

  useEffect(() => {
    if (!exerciseId || !exercise?.items.length) return
    db.progress.where('item_id').startsWith(exerciseId).count().then(c => {
      setAttemptCount(Math.floor(c / exercise.items.length))
    })
  }, [exerciseId, exercise?.items.length])

  const shuffledOptions = useMemo(() => {
    if (!exercise || exercise.type !== 'multiple_choice' || !exercise.items[currentIndex]) return []
    return [...(exercise.items[currentIndex].options || [])].sort(() => Math.random() - 0.5)
  }, [exercise, currentIndex])

  if (!exercise || !set) return <p>Loading exercise...</p>
  
  const item = exercise.items[currentIndex]
  const targetLang = set.target_lang || 'en'

  const openCardModal = () => {
    setSelectedWords(viewedWords)
    setShowCardModal(true)
  }

  const saveSelectedWords = async () => {
    if (selectedWords.length === 0) {
      setShowCardModal(false)
      return
    }

    const vocabMap = new Map<string, string>()
    item.vocabulary?.forEach(v => vocabMap.set(v.text, v.translation))
    item.options?.forEach(o => o.vocabulary?.forEach(v => vocabMap.set(v.text, v.translation)))

    const newCards = selectedWords.map(word => ({
      id: generateUUID(),
      set_id: setId!,
      front: word,
      back: vocabMap.get(word) || 'Translation missing',
      tags: [set?.topic || 'General'],
      due: Date.now(),
      interval: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0
    }))
    
    await db.cards.bulkAdd(newCards)
    setShowCardModal(false)
    setViewedWords([])
  }

  const handleWordClick = (word: string) => {
    if (!viewedWords.includes(word)) {
      setViewedWords(prev => [...prev, word])
    }
  }

  const checkAnswer = async () => {
    let isCorrect = false
    const correctAnswer = item.answer?.[0] || ''
    const normalize = (s: any) => String(s).toLowerCase().trim()
    let answerToSave = userAnswer

    if (exercise.type === 'multiple_choice' || exercise.type === 'true_false_ng' || exercise.type === 'true_false') {
      isCorrect = userAnswer === correctAnswer
    } 
    else if (['fill_blank', 'short_answer', 'sentence_completion'].includes(exercise.type)) {
      const validAnswers = [correctAnswer, ...(item.alternatives || [])].map(normalize)
      isCorrect = validAnswers.includes(normalize(userAnswer))
    }
    else if (exercise.type === 'matching') {
      let allMatch = true
      item.pairs?.forEach(p => {
        if (matchingSelections[p.left] !== p.right) allMatch = false
      })
      isCorrect = allMatch && Object.keys(matchingSelections).length === item.pairs?.length
      answerToSave = Object.entries(matchingSelections).map(([k, v]) => `${k} → ${v}`).join('; ')
    }
    else if (exercise.type === 'ordering') {
      isCorrect = orderedTokens.join(' ') === item.correct_order?.join(' ')
      answerToSave = orderedTokens.join(' ')
    }

    setStatus(isCorrect ? 'correct' : 'incorrect')
    
    setSessionAnswers(prev => ({
      ...prev,
      [item.id]: { answer: answerToSave, isCorrect }
    }))

    await db.progress.add({
      id: generateUUID(), set_id: setId!, item_id: item.id,
      correct: isCorrect, used_hint: showHint, used_translation: viewedWords.length > 0,
      viewed_vocabulary: viewedWords,
      timestamp: Date.now(), duration_ms: Date.now() - startTime
    })
  }

  const nextItem = () => {
    if (currentIndex === exercise.items.length - 1) {
      setIsFinished(true)
      localStorage.removeItem(`progress_${exerciseId}`)
    } else {
      setCurrentIndex(prev => prev + 1)
      setUserAnswer('')
      setStatus('idle')
      setStartTime(Date.now())
    }
  }

  const isAnswerProvided = () => {
    if (exercise.type === 'matching') return Object.keys(matchingSelections).length === item.pairs?.length
    if (exercise.type === 'ordering') return orderedTokens.length === item.tokens?.length
    return !!userAnswer
  }

  const renderCorrectAnswerText = () => {
    if (exercise.type === 'multiple_choice') {
      const opt = item.options?.find(o => o.id === item.answer[0])
      return opt ? opt.text : String(item.answer[0])
    }
    if (exercise.type === 'true_false_ng' || exercise.type === 'true_false') {
      return item.answer[0] === 'T' ? 'True' : item.answer[0] === 'F' ? 'False' : 'Not Given'
    }
    if (exercise.type === 'ordering') return item.correct_order?.join(' ')
    if (exercise.type === 'matching') return item.pairs?.map(p => `${p.left}→${p.right}`).join('; ')
    return String(item.answer[0])
  }

  if (isFinished) {
    const total = exercise.items.length
    const correctCount = Object.values(sessionAnswers).filter((a: any) => a.isCorrect).length
    
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1>Exercise Complete!</h1>
        <div style={{ padding: '2rem', background: '#1e293b', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: '#38bdf8', fontSize: '3rem', margin: '0 0 1rem 0' }}>{correctCount} / {total}</h2>
          <p style={{ color: '#94a3b8', margin: 0 }}>Correct answers</p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '1rem' }}>Completed {attemptCount + 1} times</p>
        </div>
        <h3>Review</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {exercise.items.map((it, idx) => {
             const ans = sessionAnswers[it.id]
             return (
               <div key={it.id} style={{ padding: '1rem', background: '#1e293b', borderLeft: `4px solid ${ans?.isCorrect ? '#22c55e' : '#ef4444'}`, borderRadius: '4px' }}>
                 <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{idx + 1}. {it.prompt || 'Matching/Ordering Task'}</div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                   <span style={{ color: ans?.isCorrect ? '#86efac' : '#fca5a5', maxWidth: '60%' }}>You: {String(ans?.answer || 'Skipped')}</span>
                   {!ans?.isCorrect && <span style={{ color: '#86efac', maxWidth: '40%' }}>Correct: {renderCorrectAnswerText()}</span>}
                 </div>
               </div>
             )
          })}
        </div>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button onClick={() => { setIsFinished(false); setCurrentIndex(0); setSessionAnswers({}); localStorage.removeItem(`progress_${exerciseId}`); }} style={{ flex: 1, padding: '1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Try Again</button>
          <Link to={`/runner/${setId}`} style={{ flex: 1, padding: '1rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>Back to Set</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to={`/runner/${setId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>← Quit</Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {item.hint && (
            <button onClick={() => setShowHint(!showHint)} style={{ padding: '0.4rem 1rem', background: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>Hint 💡</button>
          )}
          {set.theory_md && (
            <button onClick={() => setShowTheory(true)} style={{ padding: '0.4rem 1rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>Theory 📖</button>
          )}
          <span style={{ color: '#94a3b8' }}>Item {currentIndex + 1} of {exercise.items.length}</span>
        </div>
      </div>

      {showTheory && (
        <div onClick={() => setShowTheory(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} className="markdown-content" style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Theory</h2>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{set.theory_md}</ReactMarkdown>
            <button onClick={() => setShowTheory(false)} style={{ marginTop: '1.5rem', padding: '0.8rem 1.5rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>Close</button>
          </div>
        </div>
      )}

      {item.prompt && (
        <h2 style={{ fontSize: '1.8rem', lineHeight: 1.4, marginBottom: '2rem' }}>
          <InteractiveText text={item.prompt} vocabulary={item.vocabulary} onWordClick={handleWordClick} lang={targetLang} ttsEnabled={ttsEnabled} />
        </h2>
      )}

      {showHint && item.hint && (
        <div style={{ padding: '1rem', background: '#1e293b', borderLeft: '4px solid #eab308', borderRadius: '4px', marginBottom: '1.5rem', color: '#fef08a' }}>
          <strong>Hint:</strong> {item.hint}
        </div>
      )}

      {exercise.type === 'matching' && <h3 style={{ marginBottom: '1.5rem' }}>Match the items:</h3>}
      {exercise.type === 'ordering' && <h3 style={{ marginBottom: '1.5rem' }}>Put the words in the correct order:</h3>}

      {exercise.type === 'multiple_choice' && (
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1.5rem' }}>
          {shuffledOptions.map(opt => (
            <button key={opt.id} onClick={() => setUserAnswer(opt.id)} disabled={status !== 'idle'}
              style={{ padding: '1rem', textAlign: 'left', fontSize: '1.1rem', cursor: status === 'idle' ? 'pointer' : 'default',
                background: userAnswer === opt.id ? (status === 'correct' ? '#166534' : status === 'incorrect' ? '#7f1d1d' : '#334155') : '#1e293b',
                border: '1px solid ' + (userAnswer === opt.id ? '#38bdf8' : '#475569'), color: '#fff', borderRadius: '8px', transition: '0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ flex: 1 }}>
                <InteractiveText text={opt.text} vocabulary={opt.vocabulary} onWordClick={handleWordClick} lang={targetLang} ttsEnabled={ttsEnabled} />
              </div>
            </button>
          ))}
        </div>
      )}
      
      {(exercise.type === 'true_false_ng' || exercise.type === 'true_false') && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          {(exercise.type === 'true_false_ng' ? ['T', 'F', 'NG'] : ['T', 'F']).map(opt => (
            <button key={opt} onClick={() => setUserAnswer(opt)} disabled={status !== 'idle'}
              style={{ flex: 1, padding: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold', cursor: status === 'idle' ? 'pointer' : 'default',
                background: userAnswer === opt ? (status === 'correct' ? '#166534' : status === 'incorrect' ? '#7f1d1d' : '#334155') : '#1e293b',
                border: '1px solid ' + (userAnswer === opt ? '#38bdf8' : '#475569'), color: '#fff', borderRadius: '8px' }}
            >
              {opt === 'T' ? 'True' : opt === 'F' ? 'False' : 'Not Given'}
            </button>
          ))}
        </div>
      )}

      {['fill_blank', 'short_answer', 'sentence_completion'].includes(exercise.type) && (
        <div style={{ marginTop: '1.5rem' }}>
          <input type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)} disabled={status !== 'idle'} placeholder="Type your answer..."
            style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px' }}
            onKeyDown={e => { if (e.key === 'Enter' && status === 'idle') checkAnswer() }}
          />
        </div>
      )}

      {exercise.type === 'matching' && item.pairs && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {item.pairs.map(pair => (
            <div key={pair.left} style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.8rem', fontSize: '1.1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {pair.left}
                {ttsEnabled && <button onClick={() => speak(pair.left, targetLang)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>🔊</button>}
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {item.pairs?.map(p => (
                  <label key={p.right} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: status === 'idle' ? 'pointer' : 'default', padding: '0.6rem', background: matchingSelections[pair.left] === p.right ? '#334155' : '#0f172a', borderRadius: '6px', border: '1px solid ' + (matchingSelections[pair.left] === p.right ? '#38bdf8' : 'transparent') }}>
                    <input type="radio" name={`match-${pair.left}`} value={p.right} checked={matchingSelections[pair.left] === p.right}
                      onChange={() => setMatchingSelections(prev => ({ ...prev, [pair.left]: p.right }))} disabled={status !== 'idle'}
                      style={{ width: '20px', height: '20px', accentColor: '#0ea5e9' }} />
                    <span style={{ fontSize: '1rem', flex: 1 }}>{p.right}</span>
                    {ttsEnabled && <button onClick={(e) => { e.preventDefault(); speak(p.right, targetLang); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>🔊</button>}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {exercise.type === 'ordering' && item.tokens && (
        <div>
          <div style={{ minHeight: '60px', background: '#0f172a', border: '1px dashed #475569', borderRadius: '8px', padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignContent: 'flex-start' }}>
            {orderedTokens.length === 0 && <span style={{ color: '#64748b' }}>Click words below to build the sentence...</span>}
            {orderedTokens.map((token, i) => (
              <button key={`sel-${i}`} onClick={() => {
                if (status !== 'idle') return
                setOrderedTokens(prev => prev.filter((_, idx) => idx !== i))
                setAvailableTokens(prev => [...prev, token])
              }} style={{ padding: '0.5rem 1rem', background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: '4px', cursor: status === 'idle' ? 'pointer' : 'default', fontSize: '1rem' }}>{token}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableTokens.map((token, i) => (
              <button key={`av-${i}`} onClick={() => {
                if (status !== 'idle') return
                setOrderedTokens(prev => [...prev, token])
                setAvailableTokens(prev => prev.filter((_, idx) => idx !== i))
              }} style={{ padding: '0.5rem 1rem', background: '#334155', border: 'none', color: '#fff', borderRadius: '4px', cursor: status === 'idle' ? 'pointer' : 'default', fontSize: '1rem' }}>{token}</button>
            ))}
          </div>
        </div>
      )}

      {status !== 'idle' && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '8px', background: status === 'correct' ? '#14532d' : '#7f1d1d', border: '1px solid ' + (status === 'correct' ? '#22c55e' : '#ef4444') }}>
          <h3 style={{ marginTop: 0, color: status === 'correct' ? '#86efac' : '#fca5a5' }}>{status === 'correct' ? '✓ Correct!' : '✗ Incorrect'}</h3>
          {status === 'incorrect' && <p style={{ color: '#fecaca', margin: '0.5rem 0' }}>Correct answer: <strong>{renderCorrectAnswerText()}</strong></p>}
          
          {viewedWords.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #475569' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#cbd5e1' }}>You looked up: <strong>{viewedWords.join(', ')}</strong></p>
              <button onClick={openCardModal} style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
                + Add to Flashcards
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card Selection Modal */}
      {showCardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Select words to save</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Choose which looked-up words you want to add to your flashcards.</p>
            
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {viewedWords.map(word => (
                <label key={word} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#0f172a', padding: '0.8rem', borderRadius: '4px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedWords.includes(word)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedWords(prev => [...prev, word])
                      else setSelectedWords(prev => prev.filter(w => w !== word))
                    }}
                    style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }}
                  />
                  <span>{word}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowCardModal(false)} style={{ flex: 1, padding: '0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={saveSelectedWords} style={{ flex: 1, padding: '0.8rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Selected</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        {status === 'idle' ? (
          <button onClick={checkAnswer} disabled={!isAnswerProvided()} style={{ padding: '0.8rem 2rem', background: isAnswerProvided() ? '#0ea5e9' : '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: isAnswerProvided() ? 'pointer' : 'not-allowed' }}>Check</button>
        ) : (
          <button onClick={nextItem} style={{ padding: '0.8rem 2rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>{currentIndex === exercise.items.length - 1 ? 'Finish' : 'Next →'}</button>
        )}
      </div>
    </div>
  )
}
