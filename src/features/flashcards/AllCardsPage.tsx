import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useNavigate } from 'react-router-dom'
import type { Card } from '../../types'
import { ReviewModal } from '../../shared/ReviewModal'
import { getFolderColor } from '../../utils'
import { useModal } from '../../shared/ModalContext'
import { Button, Input } from '../../shared/ui'
import { useEscapeKey } from '../../shared/useEscapeKey'

export function AllCardsPage() {
  const navigate = useNavigate()
  const { prompt } = useModal()
  const [search, setSearch] = useState('')
  const [filterFolder, setFilterFolder] = useState('all')
  const [filterSet, setFilterSet] = useState('all')
  const [filterTags, setFilterTags] = useState<string[]>([])
  
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  const folders = useLiveQuery(() => db.folders.toArray(), [])
  
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  useEscapeKey(!!editingCard, () => setEditingCard(null))
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [editTags, setEditTags] = useState('')

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewBaseUrl, setReviewBaseUrl] = useState('')

  const [editMode, setEditMode] = useState<'none' | 'folder' | 'set' | 'tag'>('none')

  if (!cards || !sets || !folders) return <p>Loading cards...</p>

  const setMap = new Map(sets.map(s => [s.id, s]))
  const allTags = Array.from(new Set(cards.flatMap(c => c.tags))).sort()

  const filteredCards = cards.filter(c => {
    const set = setMap.get(c.set_id)
    if (!set) return false
    
    if (filterFolder !== 'all') {
      if (filterFolder === 'null' && set.folder_id !== null) return false
      if (filterFolder !== 'null' && set.folder_id !== filterFolder) return false
    }
    if (filterSet !== 'all' && c.set_id !== filterSet) return false
    if (filterTags.length > 0 && !filterTags.some(t => c.tags.includes(t))) return false
    const q = search.toLowerCase()
    if (q && !c.front.toLowerCase().includes(q) && !(c.back || '').toLowerCase().includes(q)) return false
    
    return true
  }).sort((a, b) => b.due - a.due)

  const dueCount = filteredCards.filter(c => c.due <= Date.now()).length
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

  const openReviewModal = () => {
    const params = new URLSearchParams()
    if (filterFolder !== 'all') {
      if (filterFolder === 'null') params.set('uncategorized', 'true')
      else params.set('folderId', filterFolder)
    }
    if (filterSet !== 'all') params.set('setId', filterSet)
    if (filterTags.length > 0) params.set('tags', filterTags.join(','))
    setReviewBaseUrl(params.toString())
    setIsReviewModalOpen(true)
  }

  const handleStartReview = (direction: string) => {
    const params = new URLSearchParams(reviewBaseUrl)
    params.set('direction', direction)
    navigate(`/review?${params.toString()}`)
  }

  const openEdit = (card: Card) => {
    setEditingCard(card)
    setEditFront(card.front)
    setEditBack(card.back || '')
    setEditTags(card.tags.join(', '))
  }

  const saveEdit = async () => {
    if (!editingCard) return
    const tagsArray = editTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    await db.cards.update(editingCard.id, { front: editFront, back: editBack, tags: tagsArray })
    setEditingCard(null)
  }

  const handleFolderPillClick = async (id: string, currentName: string) => {
    if (editMode === 'folder') {
      const newName = await prompt("Rename folder:", currentName, "Rename Folder")
      if (newName && newName.trim() !== '' && newName !== currentName) await db.folders.update(id, { name: newName.trim() })
    } else {
      setFilterFolder(id); setFilterSet('all')
    }
  }

  const handleSetPillClick = async (id: string, currentTitle: string) => {
    if (editMode === 'set') {
      const newTitle = await prompt("Rename set:", currentTitle, "Rename Set")
      if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) await db.sets.update(id, { title: newTitle.trim() })
    } else {
      setFilterSet(id)
    }
  }

  const handleTagPillClick = async (tag: string) => {
    if (editMode === 'tag') {
      const newTag = await prompt("Rename tag (remove # if any):", tag, "Rename Tag")
      if (newTag && newTag.trim() !== '' && newTag !== tag) {
        const cleanNewTag = newTag.trim().replace(/^#/, '')
        await db.sets.toCollection().modify(s => { if (s.tags.includes(tag)) s.tags = s.tags.map(t => t === tag ? cleanNewTag : t) })
        await db.cards.toCollection().modify(c => { if (c.tags.includes(tag)) c.tags = c.tags.map(t => t === tag ? cleanNewTag : t) })
        await db.exercises.toCollection().modify(e => { if (e.tags && e.tags.includes(tag)) e.tags = e.tags.map(t => t === tag ? cleanNewTag : t) })
      }
    } else {
      setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    }
  }

  const setsForFolder = filterFolder === 'all' ? sets : sets.filter(s => {
    if (filterFolder === 'null') return s.folder_id === null
    return s.folder_id === filterFolder
  })

  const Pill = ({ active, onClick, children, color, isEditing }: any) => (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.8rem', borderRadius: '16px',
        background: active ? (color || '#0ea5e9') : '#1e293b',
        border: `1px solid ${active ? (color || '#0ea5e9') : (isEditing ? '#f59e0b' : '#475569')}`,
        color: active ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? 'bold' : 'normal',
        transition: '0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem'
      }}
    >
      {isEditing && '✏️ '}
      {children}
    </button>
  )

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>All Flashcards</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Input value={search} onChange={setSearch} placeholder="Search words..." style={{ width: '200px' }} />
          <Button variant="purple" onClick={openReviewModal} disabled={dueCount === 0}>
            🎴 Start Review ({dueCount})
          </Button>
        </div>
      </div>

      <div style={{ background: '#1e293b', padding: '1.2rem', borderRadius: '8px', border: '1px solid #334155', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Filter by Folder:</div>
            <button onClick={() => setEditMode(editMode === 'folder' ? 'none' : 'folder')} style={{ background: editMode === 'folder' ? '#ef4444' : 'transparent', border: 'none', color: editMode === 'folder' ? '#fff' : '#38bdf8', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              {editMode === 'folder' ? 'Done' : '✏️ Edit'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <Pill active={filterFolder === 'all'} onClick={() => handleFolderPillClick('all', '')} isEditing={editMode === 'folder' && filterFolder !== 'all'}>All Folders</Pill>
            <Pill active={filterFolder === 'null'} onClick={() => handleFolderPillClick('null', '')} isEditing={editMode === 'folder' && filterFolder !== 'null'}>Uncategorized</Pill>
            {folders.filter(f => f.parent_id === null).map(f => (
              <Pill key={f.id} active={filterFolder === f.id} onClick={() => handleFolderPillClick(f.id, f.name)} color={getFolderColor(f.id)} isEditing={editMode === 'folder'}>
                {f.name}
              </Pill>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Filter by Set:</div>
            <button onClick={() => setEditMode(editMode === 'set' ? 'none' : 'set')} style={{ background: editMode === 'set' ? '#ef4444' : 'transparent', border: 'none', color: editMode === 'set' ? '#fff' : '#38bdf8', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              {editMode === 'set' ? 'Done' : '✏️ Edit'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <Pill active={filterSet === 'all'} onClick={() => setFilterSet('all')}>All Sets</Pill>
            {setsForFolder.map(s => (
              <Pill key={s.id} active={filterSet === s.id} onClick={() => handleSetPillClick(s.id, s.title)} isEditing={editMode === 'set'}>
                {s.title}
              </Pill>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Filter by Tags:</div>
              <button onClick={() => setEditMode(editMode === 'tag' ? 'none' : 'tag')} style={{ background: editMode === 'tag' ? '#ef4444' : 'transparent', border: 'none', color: editMode === 'tag' ? '#fff' : '#38bdf8', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                {editMode === 'tag' ? 'Done' : '✏️ Edit'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {allTags.map(tag => {
                const isActive = filterTags.includes(tag)
                return (
                  <Pill key={tag} active={isActive} onClick={() => handleTagPillClick(tag)} color="#0ea5e9" isEditing={editMode === 'tag'}>
                    #{tag}
                  </Pill>
                )
              })}
              {filterTags.length > 0 && (
                <button onClick={() => setFilterTags([])} style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px dashed #64748b', color: '#94a3b8', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem' }}>Clear tags</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>Showing {filteredCards.length} cards ({dueCount} due now)</div>

      {filteredCards.length === 0 ? (
        <div style={{ padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>No cards found</h2>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredCards.map(card => {
            const isDue = card.due <= Date.now()
            const set = setMap.get(card.set_id)
            return (
              <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '1.2rem', borderRadius: '8px', borderLeft: `4px solid ${isDue ? '#ef4444' : '#22c55e'}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.3rem' }}>{card.front}</div>
                  <div style={{ color: '#38bdf8', fontSize: '1rem', marginBottom: '0.8rem' }}>{card.back}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Set: <strong>{set?.title || 'Unknown'}</strong></span>
                    {card.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {card.tags.map(t => <span key={t} style={{ background: '#334155', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8', minWidth: '120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div>
                    <div style={{ marginBottom: '0.3rem', color: isDue ? '#fca5a5' : '#86efac', fontWeight: 'bold' }}>{isDue ? 'Due Now' : `Due: ${formatDate(card.due)}`}</div>
                    <div>Reviews: {card.reps}</div>
                    <div>Interval: {card.interval} days</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(card)}>Edit</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingCard && (
        <div onClick={() => setEditingCard(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Card</h2>
            <div style={{ marginBottom: '1rem' }}>
              <Input label="Front" value={editFront} onChange={setEditFront} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <Input label="Back" value={editBack} onChange={setEditBack} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <Input label="Tags (comma separated)" value={editTags} onChange={setEditTags} placeholder="e.g. noun, verb, hard" />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button variant="secondary" fullWidth onClick={() => setEditingCard(null)}>Cancel</Button>
              <Button variant="primary" fullWidth onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} onSelect={handleStartReview} />
    </div>
  )
}
