import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useNavigate } from 'react-router-dom'
import type { Set } from '../../types'
import { generateUUID, getFolderColor } from '../../utils'
import { ReviewModal } from '../../shared/ReviewModal'
import { useModal } from '../../shared/ModalContext'
import { Button, Input, Card } from '../../shared/ui'

export function HomePage() {
  const navigate = useNavigate()
  const { prompt, confirm } = useModal()
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  const folders = useLiveQuery(() => db.folders.toArray(), [])
  
  const [selectedFolder, setSelectedFolder] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')
  
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedSets, setSelectedSets] = useState<string[]>([])
  
  const [isEditingFolders, setIsEditingFolders] = useState(false)

  const [editingSet, setEditingSet] = useState<Set | null>(null)
  const [editFolder, setEditFolder] = useState('')
  const [editTags, setEditTags] = useState('')

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewBaseUrl, setReviewBaseUrl] = useState('')

  if (!sets || !folders) return <p>Loading database...</p>

  const filteredSets = sets.filter(s => {
    const matchesFolder = selectedFolder === 'all' || s.folder_id === selectedFolder || (selectedFolder === 'null' && !s.folder_id)
    const q = search.toLowerCase()
    const matchesSearch = s.title.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))
    return matchesFolder && matchesSearch
  }).sort((a, b) => b.created_at - a.created_at)

  const toggleSelection = (id: string) => {
    setSelectedSets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBulkMove = async (folderId: string | null) => {
    if (selectedSets.length === 0) return
    await db.sets.where('id').anyOf(selectedSets).modify({ folder_id: folderId })
    setSelectedSets([])
    setIsSelectionMode(false)
  }

  const deleteSetCompletely = async (setId: string) => {
    await db.transaction('rw', [db.sets, db.exercises, db.cards, db.progress], async () => {
      await db.exercises.where('set_id').equals(setId).delete()
      await db.cards.where('set_id').equals(setId).delete()
      await db.progress.where('set_id').equals(setId).delete()
      await db.sets.delete(setId)
    })
  }

  const handleBulkDelete = async () => {
    if (selectedSets.length === 0) return
    const ok = await confirm(
      `Delete ${selectedSets.length} set(s) and ALL their exercises, cards, and progress? This cannot be undone.`,
      'Delete Sets'
    )
    if (!ok) return
    for (const id of selectedSets) {
      await deleteSetCompletely(id)
    }
    setSelectedSets([])
    setIsSelectionMode(false)
  }

  const handleDeleteSingle = async (set: Set) => {
    const ok = await confirm(
      `Delete "${set.title}" and all its exercises, cards, and progress? This cannot be undone.`,
      'Delete Set'
    )
    if (!ok) return
    await deleteSetCompletely(set.id)
    setEditingSet(null)
  }

  const openReviewModal = () => {
    const params = new URLSearchParams()
    if (selectedFolder !== 'all') {
      if (selectedFolder === 'null') params.set('uncategorized', 'true')
      else params.set('folderId', selectedFolder)
    }
    setReviewBaseUrl(params.toString())
    setIsReviewModalOpen(true)
  }

  const handleStartReview = (direction: string) => {
    const params = new URLSearchParams(reviewBaseUrl)
    params.set('direction', direction)
    navigate(`/review?${params.toString()}`)
  }

  const openEditModal = (set: Set) => {
    setEditingSet(set)
    setEditFolder(set.folder_id || 'null')
    setEditTags(set.tags.join(', '))
  }

  const saveEdit = async () => {
    if (!editingSet) return
    const tagsArray = editTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    const newFolderId = editFolder === 'null' ? null : editFolder
    await db.sets.update(editingSet.id, { folder_id: newFolderId, tags: tagsArray })
    setEditingSet(null)
  }

  const createFolder = async () => {
    const name = await prompt("Enter folder name (e.g., Spanish, Math):", '', "New Folder")
    if (!name) return
    const newFolder = {
      id: generateUUID(), name, parent_id: null, kind: 'custom' as const, icon: '📁',
      created_at: Date.now(), updated_at: Date.now()
    }
    await db.folders.add(newFolder)
    setEditFolder(newFolder.id)
  }

  const handleFolderClick = async (id: string, currentName: string) => {
    if (isEditingFolders) {
      const newName = await prompt("Rename folder:", currentName, "Rename")
      if (newName && newName.trim() !== '' && newName !== currentName) {
        await db.folders.update(id, { name: newName.trim() })
      }
    } else {
      setSelectedFolder(id)
    }
  }

  const currentFolderName = selectedFolder === 'all' ? 'All' :
    selectedFolder === 'null' ? 'Uncategorized' :
    folders.find(f => f.id === selectedFolder)?.name || ''

  const visibleFolders = folders.filter(f => f.parent_id === null)

  return (
    <div className="home-layout">
      
      {/* Folders Panel */}
      <div className="folders-panel">
        <div className="folder-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem' }}>Folders</h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Button size="sm" variant={isEditingFolders ? 'danger' : 'secondary'} onClick={() => setIsEditingFolders(!isEditingFolders)} title="Rename folders">
              {isEditingFolders ? 'Done' : '✏️'}
            </Button>
            <Button size="sm" variant="primary" onClick={createFolder}>+</Button>
          </div>
        </div>
        
        <div className="folders-list">
          <button
            onClick={() => !isEditingFolders && setSelectedFolder('all')}
            className={`folder-btn ${selectedFolder === 'all' ? 'active' : ''}`}
            style={{ cursor: isEditingFolders ? 'default' : 'pointer' }}
          >
            All Sets
          </button>
          <button
            onClick={() => !isEditingFolders && setSelectedFolder('null')}
            className={`folder-btn ${selectedFolder === 'null' ? 'active' : ''}`}
            style={{ cursor: isEditingFolders ? 'default' : 'pointer' }}
          >
            Uncategorized
          </button>
          
          {visibleFolders.map(f => {
            const color = getFolderColor(f.id)
            const isActive = selectedFolder === f.id
            return (
              <button 
                key={f.id} 
                onClick={() => handleFolderClick(f.id, f.name)} 
                className={`folder-btn ${isActive ? 'active' : ''} ${isEditingFolders ? 'editing' : ''}`}
              >
                <span className="folder-dot" style={{ background: color }}></span>
                {isEditingFolders && <span style={{ fontSize: '0.75rem' }}>✏️</span>}
                <span className="folder-name">{f.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="home-content">
        <div className="home-header">
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>My Sets</h1>
          
          <div className="home-actions">
            <Input
              value={search}
              onChange={setSearch}
              placeholder="Search sets or tags..."
              style={{ minWidth: '200px' }}
            />
            <Button 
              variant={isSelectionMode ? 'danger' : 'secondary'} 
              onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedSets([]); }}
            >
              {isSelectionMode ? 'Done' : 'Edit sets'}
            </Button>
            <Button variant="purple" onClick={openReviewModal}>
              🎴 Review {currentFolderName}
            </Button>
          </div>
        </div>

        {filteredSets.length === 0 ? (
          <div style={{ 
            padding: '3rem 1rem', 
            border: '1px dashed #475569', 
            borderRadius: '12px', 
            textAlign: 'center', 
            color: '#94a3b8',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <div style={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '0.5rem' }}>No sets found</div>
            <div style={{ fontSize: '0.9rem' }}>Try a different folder or create a new set in Studio.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredSets.map(set => {
              const folderColor = getFolderColor(set.folder_id)
              const isSelected = selectedSets.includes(set.id)
              return (
                <Card
                  key={set.id}
                  onClick={() => isSelectionMode ? toggleSelection(set.id) : navigate(`/runner/${set.id}`)}
                  accent={folderColor}
                  highlight={isSelected}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isSelectionMode && (
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => toggleSelection(set.id)} 
                        onClick={e => e.stopPropagation()} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0ea5e9', flexShrink: 0 }} 
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.4rem 0', color: '#38bdf8', fontSize: '1.15rem' }}>{set.title}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                        {set.topic || 'General'} · {set.level || 'N/A'}
                      </div>
                      {set.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {set.tags.map(t => (
                            <span key={t} style={{ fontSize: '0.72rem', background: '#0f172a', padding: '0.2rem 0.55rem', borderRadius: '12px', color: '#cbd5e1', border: '1px solid #334155' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(set)}>Edit</Button>
                      <Button size="sm" variant="primary" onClick={() => navigate(`/runner/${set.id}`)}>Open</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Bulk Move Bar */}
      {selectedSets.length > 0 && (
        <div style={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          background: '#1e293b', borderTop: '1px solid #334155', 
          padding: '1rem', 
          zIndex: 900, boxShadow: '0 -4px 20px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{selectedSets.length} selected</span>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Move to:</span>
            <div style={{ flex: 1 }} />
            <Button variant="secondary" size="sm" onClick={() => setSelectedSets([])}>Clear</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>Delete Selected</Button>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.25rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            <button 
              onClick={() => handleBulkMove(null)} 
              className="folder-btn" 
              style={{ padding: '0.5rem 0.9rem', borderRadius: '16px', width: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Uncategorized
            </button>
            {visibleFolders.map(f => (
              <button 
                key={f.id} 
                onClick={() => handleBulkMove(f.id)}
                className="folder-btn"
                style={{ padding: '0.5rem 0.9rem', borderRadius: '16px', width: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <span className="folder-dot" style={{ background: getFolderColor(f.id) }}></span>
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Set Modal */}
      {editingSet && (
        <div onClick={() => setEditingSet(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Edit Set</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Folder</span>
                <Button size="sm" variant="ghost" onClick={createFolder}>+ New Folder</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button onClick={() => setEditFolder('null')} className={`folder-btn ${editFolder === 'null' ? 'active' : ''}`} style={{ padding: '0.5rem 0.9rem', borderRadius: '16px' }}>
                  Uncategorized
                </button>
                {visibleFolders.map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setEditFolder(f.id)} 
                    className={`folder-btn ${editFolder === f.id ? 'active' : ''}`}
                    style={{ padding: '0.5rem 0.9rem', borderRadius: '16px' }}
                  >
                    <span className="folder-dot" style={{ background: getFolderColor(f.id) }}></span>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
            <Input 
              label="Tags (comma separated)" 
              value={editTags} 
              onChange={setEditTags} 
              placeholder="grammar, A2, listening" 
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button variant="secondary" fullWidth onClick={() => setEditingSet(null)}>Cancel</Button>
              <Button variant="primary" fullWidth onClick={saveEdit}>Save Changes</Button>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <Button variant="danger" fullWidth onClick={() => handleDeleteSingle(editingSet!)}>Delete This Set</Button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} onSelect={handleStartReview} />
    </div>
  )
}
