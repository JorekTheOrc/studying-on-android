import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { generateUUID } from '../../utils'
import type { Item, Exercise } from '../../types'

export function PracticePage() {
  const { setId, exerciseId } = useParams()
  const navigate = useNavigate()
  
  const exercise = useLiveQuery(() => exerciseId ? db.exercises.get(exerciseId) : undefined, [exerciseId])
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState<any>('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [startTime] = useState(Date.now())

  // Reset state when item changes
  useEffect(() => {
    setUserAnswer('')
    setStatus('idle')
  }, [currentIndex])

  if (!exercise) return <p>Loading exercise...</p>
  const item = exercise.items[currentIndex]
  if (!item) return <p>No items in this exercise.</p>

  const isLastItem = currentIndex === exercise.items.length - 1

  const checkAnswer = async () => {
    let isCorrect = false
    const correctAnswer = item.answer[0]

    // Normalize strings for comparison (lowercase, trim)
    const normalize = (s: any) => String(s).toLowerCase().trim()

    if (exercise.type === 'multiple_choice' || exercise.type === 'true_false_ng') {
      isCorrect = userAnswer === correctAnswer
    } 
    else if (exercise.type === 'fill_blank' || exercise.type === 'short_answer' || exercise.type === 'sentence_completion') {
      const validAnswers = [correctAnswer, ...(item.alternatives || [])].map(normalize)
      isCorrect = validAnswers.includes(normalize(userAnswer))
    }
    // TODO: Add matching, ordering logic here

    setStatus(isCorrect ? 'correct' : 'incorrect')

    // Save progress to DB
    await db.progress.add({
      id: generateUUID(),
      set_id: setId!,
      item_id: item.id,
      correct: isCorrect,
      used_hint: false,
      used_translation: false,
      timestamp: Date.now(),
      duration_ms: Date.now() - startTime
    })
  }

  const nextItem = () => {
    if (isLastItem) {
      navigate(`/runner/${setId}`)
      alert("Exercise completed!")
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  // --- Renderers for specific types ---

  const renderMultipleChoice = () => (
    <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1.5rem' }}>
      {item.options?.map(opt => (
        <button
          key={opt.id}
          onClick={() => setUserAnswer(opt.id)}
          disabled={status !== 'idle'}
          style={{
            padding: '1rem', textAlign: 'left', fontSize: '1.1rem', cursor: status === 'idle' ? 'pointer' : 'default',
            background: userAnswer === opt.id ? (status === 'correct' ? '#166534' : status === 'incorrect' ? '#7f1d1d' : '#334155') : '#1e293b',
            border: '1px solid ' + (userAnswer === opt.id ? '#38bdf8' : '#475569'),
            color: '#fff', borderRadius: '8px', transition: '0.2s'
          }}
        >
          {opt.id.toUpperCase()}) {opt.text}
        </button>
      ))}
    </div>
  )

  const renderTrueFalse = () => (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
      {['T', 'F', 'NG'].map(opt => (
        <button
          key={opt}
          onClick={() => setUserAnswer(opt)}
          disabled={status !== 'idle'}
          style={{
            flex: 1, padding: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold', cursor: status === 'idle' ? 'pointer' : 'default',
            background: userAnswer === opt ? (status === 'correct' ? '#166534' : status === 'incorrect' ? '#7f1d1d' : '#334155') : '#1e293b',
            border: '1px solid ' + (userAnswer === opt ? '#38bdf8' : '#475569'),
            color: '#fff', borderRadius: '8px'
          }}
        >
          {opt === 'T' ? 'True' : opt === 'F' ? 'False' : 'Not Given'}
        </button>
      ))}
    </div>
  )

  const renderTextInput = () => (
    <div style={{ marginTop: '1.5rem' }}>
      <input
        type="text"
        value={userAnswer}
        onChange={e => setUserAnswer(e.target.value)}
        disabled={status !== 'idle'}
        placeholder="Type your answer here..."
        style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px' }}
        onKeyDown={e => { if (e.key === 'Enter' && status === 'idle') checkAnswer() }}
      />
    </div>
  )

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Link to={`/runner/${setId}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>← Quit Practice</Link>
        <span style={{ color: '#94a3b8' }}>Item {currentIndex + 1} of {exercise.items.length}</span>
      </div>

      <h2 style={{ fontSize: '1.8rem', lineHeight: 1.4, marginBottom: '2rem' }}>{item.prompt}</h2>

      {exercise.type === 'multiple_choice' && renderMultipleChoice()}
      {exercise.type === 'true_false_ng' && renderTrueFalse()}
      {(exercise.type === 'fill_blank' || exercise.type === 'short_answer' || exercise.type === 'sentence_completion') && renderTextInput()}
      
      {/* Placeholder for Matching / Ordering */}
      {(exercise.type === 'matching' || exercise.type === 'ordering') && (
        <p style={{ color: '#ef4444' }}>This exercise type is coming in the next update!</p>
      )}

      {/* Feedback Area */}
      {status !== 'idle' && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '8px', background: status === 'correct' ? '#14532d' : '#7f1d1d', border: '1px solid ' + (status === 'correct' ? '#22c55e' : '#ef4444') }}>
          <h3 style={{ marginTop: 0, color: status === 'correct' ? '#86efac' : '#fca5a5' }}>
            {status === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
          </h3>
          {status === 'incorrect' && (
            <p style={{ color: '#fecaca', margin: '0.5rem 0' }}>
              Correct answer: <strong>{item.answer[0]}</strong>
            </p>
          )}
          {item.explanation && <p style={{ color: '#e2e8f0', fontStyle: 'italic', marginBottom: 0 }}>💡 {item.explanation}</p>}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        {status === 'idle' && (
          <button 
            onClick={checkAnswer} 
            disabled={!userAnswer}
            style={{ padding: '0.8rem 2rem', background: userAnswer ? '#0ea5e9' : '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: userAnswer ? 'pointer' : 'not-allowed' }}
          >
            Check
          </button>
        )}
        {status !== 'idle' && (
          <button 
            onClick={nextItem}
            style={{ padding: '0.8rem 2rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isLastItem ? 'Finish Exercise' : 'Next Item →'}
          </button>
        )}
      </div>
    </div>
  )
}
