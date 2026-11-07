import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useNavigate } from 'react-router-dom'
import type { Set } from '../../types'
import { generateUUID, getFolderColor } from '../../utils'
import { ReviewModal } from '../../shared/ReviewModal'

export function HomePage() {
  const navigate = useNavigate()
  const sets = useLiveQuery(() => db.sets.toArray().then(arr => arr.sort((a, b) => b.created_at - a.created_at)), [])
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
  })

  const toggleSelection = (id: string) => {
    setSelectedSets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBulkMove = async (folderId: string | null) => {
    if (selectedSets.length === 0) return
    await db.sets.where('id').anyOf(selectedSets).modify({ folder_id: folderId })
    setSelectedSets([])
    setIsSelectionMode(false)
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
    const name = prompt("Enter folder name (e.g., Spanish, Math):")
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
      const newName = prompt("Rename folder:", currentName)
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

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap', paddingBottom: selectedSets.length > 0 ? '80px' : '0' }}>
      
      {/* Sidebar: Folders */}
      <div style={{ width: '220px', background: '#1e293b', borderRadius: '8px', padding: '1rem', border: '1px solid #334155', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#e2e8f0' }}>Folders</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setIsEditingFolders(!isEditingFolders)} style={{ background: isEditingFolders ? '#ef4444' : '#334155', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }} title="Rename folders">
              {isEditingFolders ? 'Done' : '✏️'}
            </button>
            <button onClick={createFolder} style={{ background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.5rem', fontWeight: 'bold' }}>+</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button onClick={() => !isEditingFolders && setSelectedFolder('all')} style={{ textAlign: 'left', background: selectedFolder === 'all' ? '#334155' : 'transparent', color: selectedFolder === 'all' ? '#38bdf8' : '#94a3b8', border: 'none', padding: '0.6rem', borderRadius: '4px', cursor: isEditingFolders ? 'default' : 'pointer', fontWeight: 'bold' }}>All Sets</button>
          <button onClick={() => !isEditingFolders && setSelectedFolder('null')} style={{ textAlign: 'left', background: selectedFolder === 'null' ? '#334155' : 'transparent', color: selectedFolder === 'null' ? '#38bdf8' : '#94a3b8', border: 'none', padding: '0.6rem', borderRadius: '4px', cursor: isEditingFolders ? 'default' : 'pointer' }}>Uncategorized</button>
          
          {folders.filter(f => f.parent_id === null).map(f => {
            const color = getFolderColor(f.id)
            return (
              <button 
                key={f.id} 
                onClick={() => handleFolderClick(f.id, f.name)} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', 
                  background: selectedFolder === f.id ? '#334155' : (isEditingFolders ? '#2a3547' : 'transparent'), 
                  color: selectedFolder === f.id ? '#fff' : '#94a3b8', 
                  border: isEditingFolders ? '1px dashed #f59e0b' : '1px solid transparent', 
                  padding: '0.6rem', borderRadius: '4px', cursor: isEditingFolders ? 'text' : 'pointer', transition: '0.2s' 
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }}></div>
                {isEditingFolders && <span style={{ fontSize: '0.8rem' }}>✏️</span>}
                {f.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>My Sets</h1>
            <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedSets([]); }} style={{ padding: '0.4rem 1rem', background: isSelectionMode ? '#ef4444' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>{isSelectionMode ? 'Cancel' : 'Move set(s)'}</button>
            <button onClick={openReviewModal} style={{ padding: '0.4rem 1rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>🎴 Review {currentFolderName} Cards</button>
          </div>
          <input type="text" placeholder="Search sets or tags..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.6rem 1rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px', width: '250px' }} />
        </div>

        {filteredSets.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
            <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>No sets found</h2>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredSets.map(set => {
              const folderColor = getFolderColor(set.folder_id)
              const isSelected = selectedSets.includes(set.id)
              return (
                <div key={set.id} onClick={() => isSelectionMode ? toggleSelection(set.id) : navigate(`/runner/${set.id}`)} style={{ padding: '1.5rem', background: '#1e293b', border: '1px solid ' + (isSelected ? '#0ea5e9' : '#334155'), borderLeft: `6px solid ${folderColor}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', transition: '0.2s', cursor: 'pointer' }}>
                  {isSelectionMode && (
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(set.id)} onClick={e => e.stopPropagation()} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0ea5e9' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>{set.title}</h3>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Topic: {set.topic || 'N/A'} | Level: {set.level || 'N/A'}</div>
                    {set.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {set.tags.map(t => <span key={t} style={{ fontSize: '0.75rem', background: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#cbd5e1' }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditModal(set)} style={{ padding: '0.5rem 1rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
                    <button onClick={() => navigate(`/runner/${set.id}`)} style={{ padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Open</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedSets.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1e293b', borderTop: '1px solid #334155', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', zIndex: 900, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.1)' }}>
          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{selectedSets.length} selected</span>
          <select onChange={(e) => handleBulkMove(e.target.value === 'null' ? null : e.target.value)} defaultValue="" style={{ padding: '0.6rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer' }}>
            <option value="" disabled>Move to folder...</option>
            <option value="null">Uncategorized</option>
            {folders.filter(f => f.parent_id === null).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button onClick={() => setSelectedSets([])} style={{ padding: '0.6rem 1rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {editingSet && (
        <div onClick={() => setEditingSet(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Set: {editingSet.title}</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Select Folder</span>
                <button onClick={createFolder} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>+ New Folder</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button onClick={() => setEditFolder('null')} style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid ' + (editFolder === 'null' ? '#38bdf8' : '#475569'), background: editFolder === 'null' ? '#0ea5e9' : '#0f172a', color: '#fff', cursor: 'pointer' }}>Uncategorized</button>
                {folders.filter(f => f.parent_id === null).map(f => (
                  <button key={f.id} onClick={() => setEditFolder(f.id)} style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid ' + (editFolder === f.id ? '#38bdf8' : '#475569'), background: editFolder === f.id ? '#0ea5e9' : '#0f172a', color: '#fff', cursor: 'pointer' }}>{f.icon} {f.name}</button>
                ))}
              </div>
            </div>
            <label style={{ display: 'block', marginBottom: '1.5rem' }}>
              Tags (comma separated)
              <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. grammar, A2, listening" style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', marginTop: '0.5rem' }} />
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEditingSet(null)} style={{ flex: 1, padding: '0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '0.8rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} onSelect={handleStartReview} />
    </div>
  )
}
