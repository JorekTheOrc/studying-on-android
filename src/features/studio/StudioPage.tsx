import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { generatePrompt } from '../../utils/prompt'
import { validateImportedSet, type ValidationResult } from '../../utils/validator'
import { callAI, extractJSON } from '../../utils/ai'
import { db } from '../../db'
import { useModal } from '../../shared/ModalContext'
import { Button, Input } from '../../shared/ui'
import type { BuilderParams, ExerciseType, Template } from '../../types'

const EXERCISE_TYPES: { id: ExerciseType; label: string; desc: string }[] = [
  { id: 'multiple_choice', label: 'Multiple Choice', desc: 'Choose the correct option (A, B, C).' },
  { id: 'true_false', label: 'True / False', desc: 'Decide if the statement is true or false.' },
  { id: 'true_false_ng', label: 'True / False / Not Given', desc: 'Decide if the statement is true, false, or not mentioned.' },
  { id: 'sentence_completion', label: 'Sentence Completion', desc: 'Type 1-3 words to complete the sentence.' },
  { id: 'fill_blank', label: 'Fill in the Blanks', desc: 'Type the missing words (optionally from a word box).' },
  { id: 'matching', label: 'Matching', desc: 'Match items from two columns.' },
  { id: 'ordering', label: 'Ordering', desc: 'Put the words in the correct order.' },
  { id: 'short_answer', label: 'Short Answer', desc: 'Write a short open answer.' },
  { id: 'translation', label: 'Translation', desc: 'Translate the sentence into the target language.' }
]

const COUNT_OPTIONS = [0, 1, 2, 3, 4]
const ITEMS_OPTIONS = [3, 5, 7, 10, 15]

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.35rem 0.7rem',
  background: active ? '#0ea5e9' : '#0f172a',
  color: active ? '#fff' : '#94a3b8',
  border: `1px solid ${active ? '#0ea5e9' : '#475569'}`,
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  minWidth: '34px',
  fontWeight: active ? 'bold' : 'normal',
  transition: '0.15s',
})

const SHOW_MOCK = false // Set to true to enable Mock generator for UI testing

export function StudioPage() {
  const { alert, prompt, confirm } = useModal()
  const [activeTab, setActiveTab] = useState<'generate' | 'import'>('generate')
  const [isGenerating, setIsGenerating] = useState(false)

  const templates = useLiveQuery(() => db.templates.toArray(), [])

  const [params, setParams] = useState<BuilderParams>({
    targetLang: 'English', nativeLang: 'Russian', topic: '', level: 'B1',
    plans: [{ type: 'multiple_choice', count: 1, itemsPerExercise: 5 }],
    includeTheory: true, includeHints: true, includeTranslations: true, wordList: '',
  })
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [autoCopied, setAutoCopied] = useState(false)

  const aiProviderSetting = useLiveQuery(() => db.settings.get('ai_provider'))
  const aiProvider = aiProviderSetting?.value || 'none'
  const aiKeySetting = useLiveQuery(() => db.settings.get('ai_api_key'))
  const aiKey = aiKeySetting?.value || ''

  // --- TEMPLATES ---
  const handleSaveTemplate = async () => {
    const name = await prompt('Name for this template:', params.topic || 'Untitled', 'Save Template')
    if (!name || !name.trim()) return
    const cleanPlans = params.plans
      .filter(p => typeof p.count === 'number' && p.count > 0)
      .map(p => ({ type: p.type, count: p.count as number, itemsPerExercise: p.itemsPerExercise as number }))
    await db.templates.add({
      id: crypto.randomUUID(),
      name: name.trim(),
      topic: params.topic,
      targetLang: params.targetLang,
      nativeLang: params.nativeLang,
      level: params.level,
      plans: cleanPlans,
      includeTheory: params.includeTheory,
      includeHints: params.includeHints,
      includeTranslations: params.includeTranslations,
      wordList: params.wordList,
      createdAt: Date.now(),
    })
    await alert('Template saved!')
  }

  const handleLoadTemplate = (t: Template) => {
    setParams({
      targetLang: t.targetLang,
      nativeLang: t.nativeLang,
      topic: t.topic,
      level: t.level,
      plans: t.plans,
      includeTheory: t.includeTheory,
      includeHints: t.includeHints,
      includeTranslations: t.includeTranslations,
      wordList: t.wordList,
    })
  }

  const handleRenameTemplate = async (t: Template) => {
    const newName = await prompt('Rename template:', t.name, 'Rename')
    if (!newName || !newName.trim() || newName === t.name) return
    await db.templates.update(t.id, { name: newName.trim() })
  }

  const handleDeleteTemplate = async (t: Template) => {
    const ok = await confirm(`Delete template "${t.name}"?`, 'Delete Template')
    if (!ok) return
    await db.templates.delete(t.id)
  }

  // --- BUILDER ---
  const handleGenerate = async () => {
    const prompt = generatePrompt(params)
    setGeneratedPrompt(prompt)
    setCopied(false)
    try {
      await navigator.clipboard.writeText(prompt)
      setAutoCopied(true)
      setTimeout(() => setAutoCopied(false), 2500)
    } catch {
      // Clipboard unavailable — manual Copy button is always visible
    }
  }

  const handlePasteFromClipboard = async (auto: boolean) => {
    if (auto && jsonText.trim()) return
    try {
      const text = await navigator.clipboard.readText()
      const trimmed = text.trim()
      if (!trimmed) return
      if (auto && !trimmed.startsWith('{')) return
      setJsonText(trimmed)
      setSaved(false)
      const res = validateImportedSet(trimmed)
      setResult(res)
    } catch {
      // Clipboard read denied — user can paste manually
    }
  }

  const handleCopy = async () => {
    if (!generatedPrompt) return
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { console.error('Failed to copy', err) }
  }

  const handleMockGenerate = () => {
    const mockJson = JSON.stringify({
      schema_version: 1,
      set_id: "mock-" + Date.now(),
      title: "Mock Test (No API)",
      topic: "Present Simple",
      target_lang: "English",
      native_lang: "Russian",
      level: "A2",
      theory_md: "This is a mock theory.",
      exercises: [{
        id: "mock-ex1",
        type: "multiple_choice",
        title: "Mock Choice",
        tags: ["test"],
        items: [{
          id: "mock-i1",
          prompt: "He ___ to school.",
          options: [
            { id: "a", text: "go" },
            { id: "b", text: "goes" },
            { id: "c", text: "going" }
          ],
          answer: ["b"],
          hint: "3rd person singular"
        }]
      }]
    }, null, 2)
    setJsonText(mockJson)
    setActiveTab('import')
    const res = validateImportedSet(mockJson)
    setResult(res)
    setSaved(false)
  }

  const handleGenerateWithAI = async () => {
    if (!generatedPrompt) return
    setIsGenerating(true)
    try {
      const rawResponse = await callAI(generatedPrompt, aiProvider, aiKey)
      const cleanJson = extractJSON(rawResponse)
      setJsonText(cleanJson)
      setActiveTab('import')
      const res = validateImportedSet(cleanJson)
      setResult(res)
      setSaved(false)
    } catch (e: any) {
      await alert("AI Generation Failed: " + e.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const updatePlan = (type: ExerciseType, field: 'count' | 'itemsPerExercise', value: number) => {
    setParams(prev => {
      const existing = prev.plans.find(p => p.type === type) || { type, count: 0, itemsPerExercise: 5 }
      const newPlans = [...prev.plans]
      const index = newPlans.findIndex(p => p.type === type)
      if (index >= 0) {
        newPlans[index] = { ...newPlans[index], [field]: value }
      } else {
        newPlans.push({ ...existing, [field]: value })
      }
      return { ...prev, plans: newPlans }
    })
  }

  // --- IMPORT ---
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
        await db.exercises.where('set_id').equals(set.id).delete()
        await db.cards.where('set_id').equals(set.id).delete()
        await db.sets.put(set)
        await db.exercises.bulkPut(exercises)
        if (cards.length > 0) await db.cards.bulkPut(cards)
      })
      setSaved(true)
      setJsonText('')
      setResult(null)
    } catch (e: any) {
      await alert('Database error: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <h1 style={{ marginBottom: '0.3rem' }}>Studio</h1>
      <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '2rem' }}>Generate prompts for AI or import ready JSON.</p>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('generate')}
          style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'generate' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'generate' ? '#38bdf8' : '#94a3b8', fontSize: '1.05rem', cursor: 'pointer', fontWeight: 'bold' }}
        >
          1. Generate Prompt
        </button>
        <button
          onClick={() => setActiveTab('import')}
          style={{ padding: '0.8rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'import' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'import' ? '#38bdf8' : '#94a3b8', fontSize: '1.05rem', cursor: 'pointer', fontWeight: 'bold' }}
        >
          2. Import JSON
        </button>
      </div>

      {activeTab === 'generate' && (
        <div>
          {/* Templates row */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>Templates</h3>
              <Button size="sm" variant="primary" onClick={handleSaveTemplate}>+ Save current as template</Button>
            </div>
            {templates && templates.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {templates.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '16px', overflow: 'hidden' }}>
                    <button
                      onClick={() => handleLoadTemplate(t)}
                      style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }}
                      title="Load template"
                    >
                      {t.name}
                    </button>
                    <button onClick={() => handleRenameTemplate(t)} style={{ padding: '0.4rem 0.5rem', background: 'transparent', border: 'none', borderLeft: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }} title="Rename">✏️</button>
                    <button onClick={() => handleDeleteTemplate(t)} style={{ padding: '0.4rem 0.5rem', background: 'transparent', border: 'none', borderLeft: '1px solid #334155', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }} title="Delete">🗑️</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No templates yet. Fill the form below and click "Save current as template".
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}><Input label="Target Language" value={params.targetLang} onChange={v => setParams({...params, targetLang: v})} /></div>
              <div style={{ flex: 1 }}><Input label="Native Language" value={params.nativeLang} onChange={v => setParams({...params, nativeLang: v})} /></div>
            </div>
            <Input label="Topic" value={params.topic} onChange={v => setParams({...params, topic: v})} placeholder="e.g. Present Simple" />

            <div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Level</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                  <button
                    key={l}
                    onClick={() => setParams(prev => ({ ...prev, level: l }))}
                    style={{
                      padding: '0.5rem 1rem',
                      background: params.level === l ? '#0ea5e9' : '#1e293b',
                      color: params.level === l ? '#fff' : '#94a3b8',
                      border: `1px solid ${params.level === l ? '#0ea5e9' : '#475569'}`,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontWeight: params.level === l ? 'bold' : 'normal',
                      fontSize: '0.9rem',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#38bdf8', fontSize: '1rem' }}>Exercise Types</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {EXERCISE_TYPES.map(({ id, label, desc }) => {
                  const plan = params.plans.find(p => p.type === id) || { count: 0, itemsPerExercise: 5 }
                  const isActive = typeof plan.count === 'number' && plan.count > 0
                  return (
                    <div key={id} style={{ borderBottom: '1px solid #334155', paddingBottom: '0.9rem' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 'bold', color: isActive ? '#e2e8f0' : '#64748b', fontSize: '0.9rem' }}>{label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{desc}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Count</div>
                          <div style={{ display: 'flex', gap: '0.2rem' }}>
                            {COUNT_OPTIONS.map(c => (
                              <button key={c} onClick={() => updatePlan(id, 'count', c)} style={chipStyle(plan.count === c)}>
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Items per ex.</div>
                          <div style={{ display: 'flex', gap: '0.2rem' }}>
                            {ITEMS_OPTIONS.map(i => (
                              <button key={i} onClick={() => updatePlan(id, 'itemsPerExercise', i)} style={chipStyle(plan.itemsPerExercise === i)}>
                                {i}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', padding: '1rem', background: '#1e293b', borderRadius: '8px', flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={params.includeTheory} onChange={e => setParams({...params, includeTheory: e.target.checked})} /> Include Theory</label>
              <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={params.includeHints} onChange={e => setParams({...params, includeHints: e.target.checked})} /> Include Hints</label>
              <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={params.includeTranslations} onChange={e => setParams({...params, includeTranslations: e.target.checked})} /> Include Translations</label>
            </div>

            <label>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Word List (optional, comma-separated)</div>
              <textarea
                placeholder="e.g. apple, banana"
                value={params.wordList}
                onChange={e => setParams({...params, wordList: e.target.value})}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '8px', minHeight: '70px', fontFamily: 'inherit', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </label>

            <Button variant="primary" size="lg" fullWidth onClick={handleGenerate}>Generate Prompt</Button>
          </div>

          {generatedPrompt && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>Generated Prompt</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {SHOW_MOCK && (
                    <Button size="sm" variant="warning" onClick={handleMockGenerate}>🧪 Mock (Test UI)</Button>
                  )}
                  {aiProvider !== 'none' && (
                    <Button size="sm" variant="purple" onClick={handleGenerateWithAI} disabled={isGenerating}>
                      {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                    </Button>
                  )}
                  <Button size="sm" variant={copied ? 'success' : 'secondary'} onClick={handleCopy}>
                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                  </Button>
                </div>
              </div>
              <textarea readOnly value={generatedPrompt} style={{ width: '100%', height: '300px', padding: '1rem', background: '#0f172a', border: '1px solid #475569', color: '#94a3b8', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }} />

              {autoCopied && (
                <div style={{
                  position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                  background: '#22c55e', color: '#fff', padding: '0.7rem 1.5rem',
                  borderRadius: '8px', fontWeight: 'bold', zIndex: 10000,
                  boxShadow: '0 4px 20px rgba(34,197,94,0.5)',
                  animation: 'fadeIn 0.2s ease',
                }}>
                  ✓ Prompt copied to clipboard
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'import' && (
        <div>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Paste the JSON response from AI here to validate and save it.</p>

          <textarea
            placeholder="Paste JSON here... (or click and it auto-pastes from clipboard)"
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setResult(null); setSaved(false); }}
            onFocus={() => handlePasteFromClipboard(true)}
            style={{ width: '100%', height: '250px', background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => handlePasteFromClipboard(false)}>
              📋 Paste from Clipboard
            </Button>
            <Button variant="primary" onClick={handleValidate} disabled={!jsonText.trim()}>
              Validate JSON
            </Button>
          </div>

          {saved && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#166534', border: '1px solid #22c55e', borderRadius: '8px', color: '#dcfce7' }}>
              <strong>Success!</strong> Set has been saved. You can find it on the Home page.
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
              <div style={{ marginTop: '0.8rem' }}>
                <Button variant="success" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save to Database'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
