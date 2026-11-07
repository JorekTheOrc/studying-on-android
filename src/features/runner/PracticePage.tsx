import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { generateUUID } from '../../utils'

export function PracticePage() {
  const { setId, exerciseId } = useParams()
  
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
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [startTime, setStartTime] = useState(Date.now())
  
  const [showTheory, setShowTheory] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)

  // Save progress to localStorage
  useEffect(() => {
    if (!exerciseId || isFinished) return
    localStorage.setItem(`progress_${exerciseId}`, JSON.stringify({ currentIndex, sessionAnswers }))
  }, [currentIndex, sessionAnswers, exerciseId, isFinished])

  // Count attempts from DB
  useEffect(() => {
    if (!exerciseId) return
    db.progress.where('item_id').startsWith(exerciseId).count().then(c => {
      // rough estimate: divide by number of items
      if (exercise?.items.length) setAttemptCount(Math.floor(c / exercise.items.length))
    })
  }, [exerciseId, exercise?.items.length])

  if (!exercise || !set) return <p>Loading exercise...</p>
  
  const item = exercise.items[currentIndex]

  const checkAnswer = async () => {
    let isCorrect = false
    const correctAnswer = item.answer[0]
    const normalize = (s: any) => String(s).toLowerCase().trim()

    if (exercise.type === 'multiple_choice' || exercise.type === 'true_false_ng') {
      isCorrect = userAnswer === correctAnswer
    } else if (['fill_blank', 'short_answer', 'sentence_completion'].includes(exercise.type)) {
      const validAnswers = [correctAnswer, ...(item.alternatives || [])].map(normalize)
      isCorrect = validAnswers.includes(normalize(userAnswer))
    }

    setStatus(isCorrect ? 'correct' : 'incorrect')
    
    // Save session state
    setSessionAnswers(prev => ({
      ...prev,
      [item.id]: { answer: userAnswer, isCorrect }
    }))

    // Save to Dexie
    await db.progress.add({
      id: generateUUID(), set_id: setId!, item_id: item.id,
      correct: isCorrect, used_hint: false, used_translation: false,
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

  // --- RENDER: RESULTS SCREEN ---
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
                 <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{idx + 1}. {it.prompt}</div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                   <span style={{ color: ans?.isCorrect ? '#86efac' : '#fca5a5' }}>Your answer: {String(ans?.answer || 'Skipped')}</span>
                   {!ans?.isCorrect && <span style={{ color: '#86efac' }}>Correct: {String(it.answer[0])}</span>}
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

  // --- RENDER: QUESTION SCREEN ---
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      {/* Header with Theory Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to={`/runner/${setId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>← Quit</Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {set.theory_md && (
            <button onClick={() => setShowTheory(true)} style={{ padding: '0.4rem 1rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>Theory 💡</button>
          )}
          <span style={{ color: '#94a3b8' }}>Item {currentIndex + 1} of {exercise.items.length}</span>
        </div>
      </div>

      {/* Theory Modal */}
      {showTheory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Theory</h2>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{set.theory_md}</div>
            <button onClick={() => setShowTheory(false)} style={{ marginTop: '1.5rem', padding: '0.8rem 1.5rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>Close</button>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '1.8rem', lineHeight: 1.4, marginBottom: '2rem' }}>{item.prompt}</h2>

      {/* Renderers */}
      {exercise.type === 'multiple_choice' && (
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1.5rem' }}>
          {item.options?.map(opt => (
            <button key={opt.id} onClick={() => setUserAnswer(opt.id)} disabled={status !== 'idle'}
              style={{ padding: '1rem', textAlign: 'left', fontSize: '1.1rem', cursor: status === 'idle' ? 'pointer' : 'default',
                background: userAnswer === opt.id ? (status === 'correct' ? '#166534' : status === 'incorrect' ? '#7f1d1d' : '#334155') : '#1e293b',
                border: '1px solid ' + (userAnswer === opt.id ? '#38bdf8' : '#475569'), color: '#fff', borderRadius: '8px', transition: '0.2s' }}
            >
              {opt.id.toUpperCase()}) {opt.text}
            </button>
          ))}
        </div>
      )}
      
      {exercise.type === 'true_false_ng' && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          {['T', 'F', 'NG'].map(opt => (
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

      {status !== 'idle' && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '8px', background: status === 'correct' ? '#14532d' : '#7f1d1d', border: '1px solid ' + (status === 'correct' ? '#22c55e' : '#ef4444') }}>
          <h3 style={{ marginTop: 0, color: status === 'correct' ? '#86efac' : '#fca5a5' }}>{status === 'correct' ? '✓ Correct!' : '✗ Incorrect'}</h3>
          {status === 'incorrect' && <p style={{ color: '#fecaca', margin: '0.5rem 0' }}>Correct answer: <strong>{String(item.answer[0])}</strong></p>}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        {status === 'idle' ? (
          <button onClick={checkAnswer} disabled={!userAnswer} style={{ padding: '0.8rem 2rem', background: userAnswer ? '#0ea5e9' : '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: userAnswer ? 'pointer' : 'not-allowed' }}>Check</button>
        ) : (
          <button onClick={nextItem} style={{ padding: '0.8rem 2rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>{currentIndex === exercise.items.length - 1 ? 'Finish' : 'Next →'}</button>
        )}
      </div>
    </div>
  )
}
