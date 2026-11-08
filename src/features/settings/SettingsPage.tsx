import { useState } from 'react'
import { db } from '../../db'
import { useLiveQuery } from 'dexie-react-hooks'

export function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const ttsSetting = useLiveQuery(() => db.settings.get('tts_enabled'))
  const ttsEnabled = ttsSetting ? ttsSetting.value === true : true

  const toggleTts = async () => {
    await db.settings.put({ key: 'tts_enabled', value: !ttsEnabled })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = {
        folders: await db.folders.toArray(),
        sets: await db.sets.toArray(),
        exercises: await db.exercises.toArray(),
        cards: await db.cards.toArray(),
        progress: await db.progress.toArray(),
        settings: await db.settings.toArray(),
        exported_at: Date.now(),
        version: 1
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `langtrainer_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert("Export failed: " + e.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm("WARNING: This will OVERWRITE all current data with the backup. Are you sure?")) {
      e.target.value = ''
      return
    }

    setIsImporting(true)
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (!json.sets || !json.exercises) throw new Error("Invalid backup file format.")

        await db.transaction('rw', [db.folders, db.sets, db.exercises, db.cards, db.progress, db.settings], async () => {
          await db.folders.clear()
          await db.sets.clear()
          await db.exercises.clear()
          await db.cards.clear()
          await db.progress.clear()
          await db.settings.clear()

          if (json.folders?.length) await db.folders.bulkAdd(json.folders)
          if (json.sets?.length) await db.sets.bulkAdd(json.sets)
          if (json.exercises?.length) await db.exercises.bulkAdd(json.exercises)
          if (json.cards?.length) await db.cards.bulkAdd(json.cards)
          if (json.progress?.length) await db.progress.bulkAdd(json.progress)
          if (json.settings?.length) await db.settings.bulkAdd(json.settings)
        })

        alert("Backup restored successfully!")
        window.location.reload()
      } catch (err: any) {
        alert("Import failed: " + err.message)
      } finally {
        setIsImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1>Settings</h1>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0 }}>Preferences</h2>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '0.5rem 0' }}>
          <input 
            type="checkbox" 
            checked={ttsEnabled} 
            onChange={toggleTts} 
            style={{ width: '20px', height: '20px', accentColor: '#0ea5e9' }} 
          />
          <div>
            <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>Enable Text-to-Speech (🔊)</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Show speaker buttons across the app.</div>
          </div>
        </label>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ marginTop: 0 }}>Data Management</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Your data is stored locally. Export a backup to avoid losing progress.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleExport} disabled={isExporting} style={{ flex: 1, padding: '0.8rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: isExporting ? 'wait' : 'pointer', fontWeight: 'bold' }}>
            {isExporting ? 'Exporting...' : 'Export Backup (.json)'}
          </button>

          <div style={{ flex: 1, position: 'relative' }}>
            <input type="file" accept=".json" onChange={handleImport} disabled={isImporting} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            <button disabled={isImporting} style={{ width: '100%', padding: '0.8rem', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '4px', cursor: isImporting ? 'wait' : 'pointer', fontWeight: 'bold' }}>
              {isImporting ? 'Importing...' : 'Import Backup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
