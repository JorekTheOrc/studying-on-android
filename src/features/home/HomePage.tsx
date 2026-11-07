import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { Link, useNavigate } from 'react-router-dom'

export function HomePage() {
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  const loading = sets === undefined
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: '900px' }}>
      <h1>My Sets</h1>
      
      {loading && <p>Loading database...</p>}

      {!loading && sets.length === 0 && (
        <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>No sets yet</h2>
          <p>Go to <Link to="/builder" style={{ color: '#38bdf8' }}>Builder</Link> to create a prompt for AI, or <Link to="/import" style={{ color: '#38bdf8' }}>Import</Link> a JSON you already have.</p>
        </div>
      )}

      {!loading && sets.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
          {sets.map(set => (
            <div key={set.id} style={{ padding: '1.5rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>{set.title}</h3>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                  Topic: {set.topic || 'N/A'} | Level: {set.level || 'N/A'} | Lang: {set.target_lang}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => navigate(`/runner/${set.id}`)}
                  style={{ padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
