import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useState } from 'react'

export function RunnerPage() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'theory' | 'exercises'>('exercises')
  
  const set = useLiveQuery(() => setId ? db.sets.get(setId) : undefined, [setId])
  const exercises = useLiveQuery(() => setId ? db.exercises.where('set_id').equals(setId).toArray() : [], [setId])

  if (set === undefined || exercises === undefined) return <p>Loading...</p>
  if (!set) return <p>Set not found. <Link to="/" style={{color: '#38bdf8'}}>Go back</Link></p>

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to My Sets</Link>
      </div>
      
      <h1 style={{ marginBottom: '0.2rem' }}>{set.title}</h1>
      <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '2rem' }}>
        Level: {set.level} | Lang: {set.target_lang} | Exercises: {exercises.length}
      </p>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('exercises')}
          style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'exercises' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'exercises' ? '#38bdf8' : '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Exercises
        </button>
        {set.theory_md && (
          <button 
            onClick={() => setActiveTab('theory')}
            style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'theory' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'theory' ? '#38bdf8' : '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Theory
          </button>
        )}
      </div>

      {activeTab === 'theory' && set.theory_md && (
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {set.theory_md}
        </div>
      )}

      {activeTab === 'exercises' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {exercises.length === 0 && <p>No exercises in this set.</p>}
          {exercises.map((ex, index) => (
            <div key={ex.id} style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Exercise {index + 1}</div>
                <h3 style={{ margin: 0, color: '#e2e8f0' }}>{ex.title}</h3>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem' }}>{ex.items.length} items</div>
              </div>
              <button 
                onClick={() => navigate(`/runner/${setId}/practice/${ex.id}`)}
                style={{ padding: '0.8rem 1.5rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Start Practice
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
