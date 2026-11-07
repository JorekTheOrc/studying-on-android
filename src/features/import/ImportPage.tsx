import { useState } from 'react'
import { validateImportedSet, type ValidationResult } from '../../utils/validator'
import { db } from '../../db'

export function ImportPage() {
  const [jsonText, setJsonText] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleValidate = () => {
    setResult(validateImportedSet(jsonText))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!result?.valid || !result.data) return
    setIsSaving(true)
    try {
      const { set, exercises, cards } = result.data
      await db.transaction('rw', [db.sets, db.exercises, db.cards], async () => {
        await db.sets.add(set)
        await db.exercises.bulkAdd(exercises)
        if (cards.length > 0) await db.cards.bulkAdd(cards)
      })
      setSaved(true)
      setJsonText('') // clear textarea
      setResult(null)
    } catch (e: any) {
      alert("Database error: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1>Import JSON</h1>
      <p>Paste the JSON response from AI here to validate and save it.</p>

      <textarea
        placeholder="Paste JSON here..."
        value={jsonText}
        onChange={e => { setJsonText(e.target.value); setResult(null); setSaved(false); }}
        style={{ width: '100%', height: '250px', marginTop: '1rem', background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '1rem', fontFamily: 'monospace' }}
      />

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={handleValidate} 
          disabled={!jsonText.trim()}
          style={{ padding: '0.8rem 1.5rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: jsonText.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
        >
          Validate JSON
        </button>
      </div>

      {saved && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#166534', border: '1px solid #22c55e', borderRadius: '8px', color: '#dcfce7' }}>
          <strong>Success!</strong> Set has been saved to the database. You can now find it on the Home page.
        </div>
      )}

      {result && !result.valid && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', color: '#fecaca' }}>
          <h3 style={{ marginTop: 0, color: '#fca5a5' }}>Validation Failed ({result.errors.length} errors)</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
            {result.errors.map((err, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{err}</li>)}
          </ul>
          <p style={{ fontSize: '0.85rem', marginBottom: 0, marginTop: '1rem', opacity: 0.8 }}>
            Copy these errors, send them back to the AI, and ask it to fix the JSON.
          </p>
        </div>
      )}

      {result && result.valid && result.data && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#14532d', border: '1px solid #22c55e', borderRadius: '8px', color: '#dcfce7' }}>
          <h3 style={{ marginTop: 0, color: '#86efac' }}>Validation Passed!</h3>
          <p>Title: <strong>{result.data.set.title}</strong></p>
          <p>Exercises: {result.data.exercises.length} | Cards: {result.data.cards.length}</p>
          
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ marginTop: '0.5rem', padding: '0.8rem 1.5rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: isSaving ? 'wait' : 'pointer', fontWeight: 'bold' }}
          >
            {isSaving ? 'Saving...' : 'Save to Database'}
          </button>
        </div>
      )}
    </div>
  )
}
