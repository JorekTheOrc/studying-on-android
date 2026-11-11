import { useState } from 'react'
import { db } from '../../db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useModal } from '../../shared/ModalContext'
import { Button, Input } from '../../shared/ui'

export function SettingsPage() {
  const { alert, confirm } = useModal()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const ttsSetting = useLiveQuery(() => db.settings.get('tts_enabled'))
  const ttsEnabled = ttsSetting ? ttsSetting.value === true : true
  
  const aiProviderSetting = useLiveQuery(() => db.settings.get('ai_provider'))
  const aiProvider = aiProviderSetting?.value || 'none'
  
  const aiKeySetting = useLiveQuery(() => db.settings.get('ai_api_key'))
  const aiKey = aiKeySetting?.value || ''

  const toggleTts = async () => {
    await db.settings.put({ key: 'tts_enabled', value: !ttsEnabled })
  }

  const updateAiProvider = async (val: string) => {
    await db.settings.put({ key: 'ai_provider', value: val })
  }

  const updateAiKey = async (val: string) => {
    await db.settings.put({ key: 'ai_api_key', value: val })
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
      await alert("Export failed: " + e.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!(await confirm("WARNING: This will OVERWRITE all current data with the backup. Are you sure?", "Restore Backup"))) {
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

        await alert("Backup restored successfully!")
        window.location.reload()
      } catch (err: any) {
        await alert("Import failed: " + err.message)
      } finally {
        setIsImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleExportAnki = async () => {
    try {
      const cards = await db.cards.toArray()
      if (cards.length === 0) {
        await alert("No flashcards found to export.")
        return
      }

      const escapeCsv = (str: string) => {
        if (!str) return '""'
        return `"${str.replace(/"/g, '""')}"`
      }

      const rows = cards.map(c => {
        const front = escapeCsv(c.front)
        const back = escapeCsv(c.back || '')
        const tags = escapeCsv(c.tags.join(' '))
        return `${front},${back},${tags}`
      })

      const csvContent = rows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `anki_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      await alert("Anki Export failed: " + e.message)
    }
  }

  const sectionStyle = { padding: '1.5rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', marginBottom: '1.5rem' }

  return (
    <div style={{ maxWidth: '700px' }}>
      <h1 style={{ marginBottom: '0.3rem' }}>Settings</h1>
      <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '2rem' }}>Configure your app and manage your data.</p>
      
      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>Preferences</h2>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '0.5rem 0' }}>
          <input 
            type="checkbox" 
            checked={ttsEnabled} 
            onChange={toggleTts} 
            style={{ width: '20px', height: '20px', accentColor: '#0ea5e9', cursor: 'pointer' }} 
          />
          <div>
            <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>Enable Text-to-Speech (🔊)</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Show speaker buttons across the app.</div>
          </div>
        </label>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>AI Integration (Optional)</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Add an API key to generate JSON directly from Studio without copy-pasting.
        </p>

        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Provider</div>
          <select 
            value={aiProvider} 
            onChange={e => updateAiProvider(e.target.value)} 
            style={{ width: '100%', padding: '0.7rem 0.9rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer' }}
          >
            <option value="none">None (Manual Copy-Paste)</option>
            <option value="gemini">Google Gemini (Free tier)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>

        {aiProvider !== 'none' && (
          <div style={{ marginBottom: '1rem' }}>
            <Input
              label="API Key"
              value={aiKey}
              onChange={updateAiKey}
              type="password"
              placeholder="Paste your API key here..."
            />
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
              Stored locally on your device. Only sent to your chosen AI provider.
            </div>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>Backup & Restore</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Your data is stored locally. Export a backup to avoid losing progress.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary" fullWidth onClick={handleExport} disabled={isExporting} style={{ minWidth: '200px' }}>
            {isExporting ? 'Exporting...' : 'Export Backup (.json)'}
          </Button>

          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              disabled={isImporting} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} 
            />
            <Button variant="secondary" fullWidth disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Import Backup'}
            </Button>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>Export to Anki</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Export all your flashcards to a .csv file that you can import into Anki.
        </p>
        <Button variant="purple" fullWidth onClick={handleExportAnki}>
          Export to Anki (.csv)
        </Button>
      </div>
    </div>
  )
}
