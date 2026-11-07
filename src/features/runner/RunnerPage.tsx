import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Exercise } from '../../types'

export function RunnerPage() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'theory' | 'exercises'>('exercises')
  
  const set = useLiveQuery(() => setId ? db.sets.get(setId) : undefined, [setId])
  const exercises = useLiveQuery(() => setId ? db.exercises.where('set_id').equals(setId).toArray() : [], [setId])

  // Exercise Edit State
  const [editingEx, setEditingEx] = useState<Exercise | null>(null)
  const [exTags, setExTags] = useState('')

  if (set === undefined || exercises === undefined) return <p>Loading...</p>
  if (!set) return <p>Set not found. <Link to="/" style={{color: '#38bdf8'}}>Go back</Link></p>

  const saveExTags = async () => {
    if (!editingEx) return
    const tagsArray = exTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    await db.exercises.update(editingEx.id, { tags: tagsArray })
    setEditingEx(null)
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to My Sets</Link>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: '0.2rem' }}>{set.title}</h1>
          <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '2rem' }}>
            Level: {set.level} | Lang: {set.target_lang} | Exercises: {exercises.length}
          </p>
        </div>
        
        <button 
          onClick={() => navigate(`/runner/${setId}/flashcards`)}
          style={{ padding: '0.8rem 1.5rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Review Flashcards
        </button>
      </div>

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
        <div className="markdown-content" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', lineHeight: 1.6 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{set.theory_md}</ReactMarkdown>
        </div>
      )}

      {activeTab === 'exercises' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {exercises.length === 0 && <p>No exercises in this set.</p>}
          {exercises.map((ex, index) => (
            <div key={ex.id} style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/runner/${setId}/practice/${ex.id}`)}>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Exercise {index + 1}</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>{ex.title}</h3>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{ex.items.length} items</div>
                {ex.tags && ex.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {ex.tags.map(t => <span key={t} style={{ fontSize: '0.75rem', background: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#cbd5e1' }}>#{t}</span>)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setEditingEx(ex); setExTags((ex.tags || []).join(', ')); }} style={{ padding: '0.6rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="Edit Exercise Tags">
                  ✏️
                </button>
                <button 
                  onClick={() => navigate(`/runner/${setId}/practice/${ex.id}`)}
                  style={{ padding: '0.8rem 1.5rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Start Practice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exercise Edit Modal */}
      {editingEx && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Tags: {editingEx.title}</h2>
            <label style={{ display: 'block', marginBottom: '1.5rem' }}>
              Tags (comma separated)
              <input type="text" value={exTags} onChange={e => setExTags(e.target.value)} placeholder="e.g. hard, listening, A2" style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEditingEx(null)} style={{ flex: 1, padding: '0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={saveExTags} style={{ flex: 1, padding: '0.8rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Tags</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
