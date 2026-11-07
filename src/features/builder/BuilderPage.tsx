import { useState } from 'react'
import { generatePrompt } from '../../utils/prompt'
import type { BuilderParams, ExerciseType } from '../../types'

const EXERCISE_TYPES: { id: ExerciseType; label: string; desc: string }[] = [
  { id: 'multiple_choice', label: 'Multiple Choice', desc: 'Choose the correct option (A, B, C).' },
  { id: 'true_false_ng', label: 'True / False / Not Given', desc: 'Decide if the statement is true, false, or not mentioned.' },
  { id: 'sentence_completion', label: 'Sentence Completion', desc: 'Type 1-3 words to complete the sentence.' },
  { id: 'fill_blank', label: 'Fill in the Blanks', desc: 'Type the missing words (optionally from a word box).' },
  { id: 'matching', label: 'Matching', desc: 'Match items from two columns.' },
  { id: 'ordering', label: 'Ordering', desc: 'Put the words in the correct order.' },
  { id: 'short_answer', label: 'Short Answer', desc: 'Write a short open answer.' },
  { id: 'translation', label: 'Translation', desc: 'Translate the sentence into the target language.' }
]

export function BuilderPage() {
  const [params, setParams] = useState<BuilderParams>({
    targetLang: 'English', nativeLang: 'Russian', topic: '', level: 'B1',
    plans: [{ type: 'multiple_choice', count: 1, itemsPerExercise: 5 }],
    includeTheory: true, includeHints: true, includeTranslations: true, wordList: '',
  })

  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    setGeneratedPrompt(generatePrompt(params))
    setCopied(false)
  }

  const handleCopy = async () => {
    if (!generatedPrompt) return
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { console.error('Failed to copy', err) }
  }

  // FIX: Allow empty strings for input fields
  const updatePlan = (type: ExerciseType, field: 'count' | 'itemsPerExercise', value: string) => {
    setParams(prev => {
      const existing = prev.plans.find(p => p.type === type) || { type, count: 0, itemsPerExercise: 5 }
      const parsedValue = value === '' ? '' : parseInt(value)
      
      let newPlans = [...prev.plans]
      const index = newPlans.findIndex(p => p.type === type)
      
      if (index >= 0) {
        newPlans[index] = { ...newPlans[index], [field]: parsedValue }
      } else {
        newPlans.push({ ...existing, [field]: parsedValue } as any)
      }
      return { ...prev, plans: newPlans }
    })
  }

  const inputStyle = { width: '100%', padding: '0.5rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '4px' }
  const numInputStyle = { width: '60px', background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.2rem', borderRadius: '4px' }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1>Instruction Builder</h1>
      <p>Configure the exercises you want the AI to generate.</p>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label style={{ flex: 1 }}>Target Language<br/><input type="text" value={params.targetLang} onChange={e => setParams({...params, targetLang: e.target.value})} style={inputStyle} /></label>
          <label style={{ flex: 1 }}>Native Language<br/><input type="text" value={params.nativeLang} onChange={e => setParams({...params, nativeLang: e.target.value})} style={inputStyle} /></label>
        </div>
        <label>Topic<br/><input type="text" placeholder="e.g. Present Simple" value={params.topic} onChange={e => setParams({...params, topic: e.target.value})} style={inputStyle} /></label>
        <label>Level (A1-C2)<br/><select value={params.level} onChange={e => setParams({...params, level: e.target.value})} style={inputStyle}>{['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}</select></label>

        <div style={{ padding: '1.5rem', background: '#1e293b', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#38bdf8' }}>Exercise Types</h3>
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            {EXERCISE_TYPES.map(({ id, label, desc }) => {
              const plan = params.plans.find(p => p.type === id) || { count: 0, itemsPerExercise: 5 }
              return (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                  <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.2rem' }}>{label}</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.3 }}>{desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', alignItems: 'center' }}>Count
                      <input type="number" min="0" max="10" value={plan.count} onChange={e => updatePlan(id, 'count', e.target.value)} style={numInputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', alignItems: 'center' }}>Items
                      <input type="number" min="1" max="20" value={plan.itemsPerExercise} onChange={e => updatePlan(id, 'itemsPerExercise', e.target.value)} style={numInputStyle} />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', padding: '1rem', background: '#1e293b', borderRadius: '8px' }}>
          <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={params.includeTheory} onChange={e => setParams({...params, includeTheory: e.target.checked})} /> Include Theory</label>
          <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={params.includeHints} onChange={e => setParams({...params, includeHints: e.target.checked})} /> Include Hints</label>
          <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={params.includeTranslations} onChange={e => setParams({...params, includeTranslations: e.target.checked})} /> Include Translations</label>
        </div>

        <label>Word List (optional, comma-separated)<br/><textarea placeholder="e.g. apple, banana" value={params.wordList} onChange={e => setParams({...params, wordList: e.target.value})} style={{ ...inputStyle, height: '80px' }} /></label>
        <button onClick={handleGenerate} style={{ padding: '1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>Generate Prompt</button>
      </div>

      {generatedPrompt && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Generated Prompt</h2>
            <button onClick={handleCopy} style={{ padding: '0.5rem 1rem', background: copied ? '#22c55e' : '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{copied ? '✓ Copied!' : 'Copy to Clipboard'}</button>
          </div>
          <textarea readOnly value={generatedPrompt} style={{ width: '100%', height: '300px', padding: '1rem', background: '#0f172a', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', fontFamily: 'monospace' }} />
        </div>
      )}
    </div>
  )
}
