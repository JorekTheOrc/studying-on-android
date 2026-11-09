import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'

export function StatisticsPage() {
  const progress = useLiveQuery(() => db.progress.toArray(), [])
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  const cards = useLiveQuery(() => db.cards.toArray(), [])

  if (!progress || !sets || !cards) return <p>Loading statistics...</p>

  const totalAnswers = progress.length
  const totalCorrect = progress.filter(p => p.correct).length
  const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0
  const dueCardsCount = cards.filter(c => c.due <= Date.now()).length
  const totalCardsCount = cards.length

  const uniqueDates = Array.from(new Set(progress.map(p => new Date(p.timestamp).toDateString())))
  uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  
  let streak = 0
  if (uniqueDates.length > 0) {
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)
    if (!uniqueDates.includes(checkDate.toDateString())) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    while (uniqueDates.includes(checkDate.toDateString())) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }
  }

  const setStats = sets.map(set => {
    const setProgress = progress.filter(p => p.set_id === set.id)
    const correct = setProgress.filter(p => p.correct).length
    return {
      id: set.id,
      title: set.title,
      total: setProgress.length,
      correct,
      percentage: setProgress.length > 0 ? Math.round((correct / setProgress.length) * 100) : 0
    }
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total)

  const wordCount: Record<string, number> = {}
  progress.forEach(p => {
    p.viewed_vocabulary?.forEach(w => {
      wordCount[w] = (wordCount[w] || 0) + 1
    })
  })
  const topWords = Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  return (
    <div style={{ maxWidth: '900px' }}>
      <h1>Statistics</h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Track your progress and find weak spots.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#38bdf8', lineHeight: 1 }}>{streak}</div>
          <div style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Day Streak 🔥</div>
        </div>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#22c55e', lineHeight: 1 }}>{accuracy}%</div>
          <div style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Avg. Accuracy ({totalAnswers} answers)</div>
        </div>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', lineHeight: 1 }}>{totalCardsCount}</div>
          <div style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Total Cards ({dueCardsCount} due)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0', fontSize: '1.2rem' }}>Progress by Set</h2>
          {setStats.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No exercises completed yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {setStats.map(stat => (
                <div key={stat.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{stat.title}</span>
                    <span style={{ color: stat.percentage >= 80 ? '#86efac' : stat.percentage >= 50 ? '#fde047' : '#fca5a5' }}>
                      {stat.percentage}% ({stat.correct}/{stat.total})
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${stat.percentage}%`, height: '100%', background: stat.percentage >= 80 ? '#22c55e' : stat.percentage >= 50 ? '#eab308' : '#ef4444' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0', fontSize: '1.2rem' }}>Needs Review (Looked up)</h2>
          {topWords.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>You haven't looked up any words yet.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {topWords.map(([word, count]) => (
                <div key={word} style={{ background: '#0f172a', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#e2e8f0' }}>{word}</span>
                  <span style={{ fontSize: '0.75rem', background: '#334155', color: '#94a3b8', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
