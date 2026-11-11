import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Exercise } from '../../types'
import { ReviewModal } from '../../shared/ReviewModal'
import { useEscapeKey } from '../../shared/useEscapeKey'
import { useModal } from '../../shared/ModalContext'
import { Button, Input } from '../../shared/ui'

export function RunnerPage() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'theory' | 'exercises'>('exercises')
  
  const set = useLiveQuery(() => setId ? db.sets.get(setId) : undefined, [setId])
  const exercises = useLiveQuery(() => setId ? db.exercises.where('set_id').equals(setId).toArray() : [], [setId])
  const allSets = useLiveQuery(() => db.sets.toArray(), [])

  const [editingEx, setEditingEx] = useState<Exercise | null>(null)
  useEscapeKey(!!editingEx, () => setEditingEx(null))
  const [exTags, setExTags] = useState('')

  const [isMoveMode, setIsMoveMode] = useState(false)
  const [selectedExs, setSelectedExs] = useState<string[]>([])

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const { confirm } = useModal()

  if (set === undefined || exercises === undefined || !allSets) return <p>Loading...</p>
  if (!set) return <p>Set not found. <Link to="/" style={{color: '#38bdf8'}}>Go back</Link></p>

  const saveExTags = async () => {
    if (!editingEx) return
    const tagsArray = exTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    await db.exercises.update(editingEx.id, { tags: tagsArray })
    setEditingEx(null)
  }

  const toggleExSelection = (id: string) => {
    setSelectedExs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleMoveExs = async (targetSetId: string) => {
    if (selectedExs.length === 0 || !targetSetId || !setId) return
    await db.exercises.where('id').anyOf(selectedExs).modify({ set_id: targetSetId })
    setSelectedExs([])
    setIsMoveMode(false)
  }

  const deleteExerciseAndProgress = async (exId: string) => {
    await db.transaction('rw', [db.exercises, db.progress], async () => {
      // Delete progress for this exercise's items
      const ex = await db.exercises.get(exId)
      if (ex) {
        for (const item of ex.items) {
          await db.progress.where('item_id').equals(item.id).delete()
        }
      }
      await db.exercises.delete(exId)
    })
  }

  const handleBulkDeleteExs = async () => {
    if (selectedExs.length === 0) return
    const ok = await confirm(
      `Delete ${selectedExs.length} exercise(s) and all related progress? This cannot be undone.`,
      'Delete Exercises'
    )
    if (!ok) return
    for (const id of selectedExs) {
      await deleteExerciseAndProgress(id)
    }
    setSelectedExs([])
    setIsMoveMode(false)
  }

  const handleDeleteSingleEx = async (ex: Exercise) => {
    const ok = await confirm(
      `Delete exercise "${ex.title}"? This cannot be undone.`,
      'Delete Exercise'
    )
    if (!ok) return
    await deleteExerciseAndProgress(ex.id)
    setEditingEx(null)
  }

  const handleStartReview = (direction: string) => {
    navigate(`/review?setId=${setId}&direction=${direction}`)
  }

  return (
    <div style={{ maxWidth: '800px', paddingBottom: selectedExs.length > 0 ? '80px' : '0' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to My Sets</Link>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.2rem', marginTop: 0 }}>{set.title}</h1>
          <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: 0 }}>
            Level: {set.level} | Lang: {set.target_lang} | Exercises: {exercises.length}
          </p>
        </div>
        
        <Button variant="purple" onClick={() => setIsReviewModalOpen(true)}>
          Review Flashcards
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('exercises')} style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'exercises' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'exercises' ? '#38bdf8' : '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>Exercises</button>
        {set.theory_md && (
          <button onClick={() => setActiveTab('theory')} style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'theory' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'theory' ? '#38bdf8' : '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>Theory</button>
        )}
      </div>

      {activeTab === 'theory' && set.theory_md && (
        <div className="markdown-content" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', lineHeight: 1.6 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{set.theory_md}</ReactMarkdown>
        </div>
      )}

      {activeTab === 'exercises' && (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" variant={isMoveMode ? 'danger' : 'secondary'} onClick={() => { setIsMoveMode(!isMoveMode); setSelectedExs([]); }}>
              {isMoveMode ? 'Done' : 'Edit exercises'}
            </Button>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {exercises.length === 0 && <p>No exercises in this set.</p>}
            {exercises.map((ex, index) => {
              const isSelected = selectedExs.includes(ex.id)
              return (
                <div 
                  key={ex.id} 
                  onClick={() => isMoveMode ? toggleExSelection(ex.id) : navigate(`/runner/${setId}/practice/${ex.id}`)}
                  style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid ' + (isSelected ? '#0ea5e9' : '#334155'), display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', transition: '0.2s', flexWrap: 'wrap' }}
                >
                  {isMoveMode && (
                    <input type="checkbox" checked={isSelected} onChange={() => toggleExSelection(ex.id)} onClick={e => e.stopPropagation()} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0ea5e9' }} />
                  )}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Exercise {index + 1}</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>{ex.title}</h3>
                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{ex.items.length} items</div>
                    {ex.tags && ex.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {ex.tags.map(t => <span key={t} style={{ fontSize: '0.75rem', background: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#cbd5e1' }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" onClick={() => { setEditingEx(ex); setExTags((ex.tags || []).join(', ')); }} title="Edit Tags">✏️</Button>
                    <Button variant="primary" onClick={() => navigate(`/runner/${setId}/practice/${ex.id}`)}>Start Practice</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {selectedExs.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1e293b', borderTop: '1px solid #334155', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', zIndex: 900, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.1)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{selectedExs.length} selected</span>
          <select 
            onChange={(e) => handleMoveExs(e.target.value)}
            defaultValue=""
            style={{ padding: '0.6rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer', flex: 1, minWidth: '150px' }}
          >
            <option value="" disabled>Move to set...</option>
            {allSets.filter(s => s.id !== setId).map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => setSelectedExs([])}>Clear</Button>
          <Button variant="danger" size="sm" onClick={handleBulkDeleteExs}>Delete Selected</Button>
        </div>
      )}

      {editingEx && (
        <div onClick={() => setEditingEx(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Tags: {editingEx.title}</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <Input label="Tags (comma separated)" value={exTags} onChange={setExTags} placeholder="e.g. hard, listening, A2" />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button variant="secondary" fullWidth onClick={() => setEditingEx(null)}>Cancel</Button>
              <Button variant="primary" fullWidth onClick={saveExTags}>Save Tags</Button>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <Button variant="danger" fullWidth onClick={() => handleDeleteSingleEx(editingEx!)}>Delete This Exercise</Button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} onSelect={handleStartReview} />
    </div>
  )
}
