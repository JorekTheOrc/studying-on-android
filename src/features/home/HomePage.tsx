import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useNavigate } from 'react-router-dom'
import type { Set } from '../../types'
import { generateUUID } from '../../utils'

export function HomePage() {
  const navigate = useNavigate()
  const sets = useLiveQuery(() => db.sets.toArray().then(arr => arr.sort((a, b) => b.created_at - a.created_at)), [])
  const folders = useLiveQuery(() => db.folders.toArray(), [])
  
  const [selectedFolder, setSelectedFolder] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')
  const [editingSet, setEditingSet] = useState<Set | null>(null)

  // Edit form state
  const [editFolder, setEditFolder] = useState('')
  const [editTags, setEditTags] = useState('')

  if (!sets || !folders) return <p>Loading database...</p>

  const filteredSets = sets.filter(s => {
    const matchesFolder = selectedFolder === 'all' || s.folder_id === selectedFolder || (selectedFolder === 'null' && !s.folder_id)
    const q = search.toLowerCase()
    const matchesSearch = s.title.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))
    return matchesFolder && matchesSearch
  })

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
    setEditFolder(newFolder.id) // Auto-select the newly created folder
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      
      {/* Sidebar: Folders */}
      <div style={{ width: '220px', background: '#1e293b', borderRadius: '8px', padding: '1rem', border: '1px solid #334155', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#e2e8f0' }}>Folders</h3>
          <button onClick={createFolder} style={{ background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.5rem', fontWeight: 'bold' }}>+</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button onClick={() => setSelectedFolder('all')} style={{ textAlign: 'left', background: selectedFolder === 'all' ? '#334155' : 'transparent', color: selectedFolder === 'all' ? '#38bdf8' : '#94a3b8', border: 'none', padding: '0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>All Sets</button>
          <button onClick={() => setSelectedFolder('null')} style={{ textAlign: 'left', background: selectedFolder === 'null' ? '#334155' : 'transparent', color: selectedFolder === 'null' ? '#38bdf8' : '#94a3b8', border: 'none', padding: '0.6rem', borderRadius: '4px', cursor: 'pointer' }}>Uncategorized</button>
          {folders.filter(f => f.parent_id === null).map(f => (
            <button key={f.id} onClick={() => setSelectedFolder(f.id)} style={{ textAlign: 'left', background: selectedFolder === f.id ? '#334155' : 'transparent', color: selectedFolder === f.id ? '#38bdf8' : '#94a3b8', border: 'none', padding: '0.6rem', borderRadius: '4px', cursor: 'pointer' }}>
              {f.icon} {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>My Sets</h1>
          <input 
            type="text" placeholder="Search sets or tags..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.6rem 1rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px', width: '250px' }}
          />
        </div>

        {filteredSets.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
            <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>No sets found</h2>
            <p>Create a prompt in Builder or Import a JSON.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredSets.map(set => (
              <div key={set.id} style={{ padding: '1.5rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>{set.title}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Topic: {set.topic || 'N/A'} | Level: {set.level || 'N/A'}
                  </div>
                  {set.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {set.tags.map(t => <span key={t} style={{ fontSize: '0.75rem', background: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#cbd5e1' }}>#{t}</span>)}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => openEditModal(set)} style={{ padding: '0.5rem 1rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
                  <button onClick={() => navigate(`/runner/${set.id}`)} style={{ padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Open</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Set Modal */}
      {editingSet && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Set: {editingSet.title}</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Select Folder</span>
                <button onClick={createFolder} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>+ New Folder</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button 
                  onClick={() => setEditFolder('null')}
                  style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid ' + (editFolder === 'null' ? '#38bdf8' : '#475569'), background: editFolder === 'null' ? '#0ea5e9' : '#0f172a', color: '#fff', cursor: 'pointer', transition: '0.2s' }}
                >
                  Uncategorized
                </button>
                {folders.filter(f => f.parent_id === null).map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setEditFolder(f.id)}
                    style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid ' + (editFolder === f.id ? '#38bdf8' : '#475569'), background: editFolder === f.id ? '#0ea5e9' : '#0f172a', color: '#fff', cursor: 'pointer', transition: '0.2s' }}
                  >
                    {f.icon} {f.name}
                  </button>
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
    </div>
  )
}
