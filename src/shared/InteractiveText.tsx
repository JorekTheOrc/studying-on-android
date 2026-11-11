import { useState, useEffect, useRef } from 'react'
import type { VocabItem } from '../types'
import { speak } from '../utils/tts'

interface Props {
  text: string
  vocabulary?: VocabItem[]
  onWordClick?: (word: string) => void
  style?: React.CSSProperties
  lang?: string
  ttsEnabled?: boolean
}

export function InteractiveText({ text, vocabulary, onWordClick, style, lang = 'en', ttsEnabled = true }: Props) {
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveWord(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!vocabulary || vocabulary.length === 0) return <span style={style}>{text}</span>

  const sortedVocab = [...vocabulary].sort((a, b) => b.text.length - a.text.length)
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${sortedVocab.map(v => escapeRegExp(v.text)).join('|')})`, 'gi')
  
  const parts = text.split(regex)

  return (
    <span ref={containerRef} style={style}>
      {parts.map((part, i) => {
        const match = sortedVocab.find(v => v.text.toLowerCase() === part.toLowerCase())
        if (match) {
          const innerWords = vocabulary.filter(v => v.text !== match.text && match.text.toLowerCase().includes(v.text.toLowerCase()))

          return (
            <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveWord(activeWord === match.text ? null : match.text)
                  if (onWordClick) onWordClick(match.text)
                }}
                style={{ borderBottom: '1px dashed #38bdf8', cursor: 'pointer', color: '#e2e8f0' }}
              >
                {part}
              </span>
              
              {activeWord === match.text && (
                <span
                  style={{
                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                    background: '#1e293b', color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px',
                    fontSize: '0.9rem', zIndex: 9999, border: '1px solid #475569',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)', marginBottom: '0.5rem',
                    display: 'flex', flexDirection: 'column', gap: '0.3rem', whiteSpace: 'normal',
                    maxWidth: 'min(320px, 90vw)', wordBreak: 'break-word'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                    <strong>{match.translation}</strong>
                    {ttsEnabled && (
                      <button onClick={(e) => { e.stopPropagation(); speak(match.text, lang); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }} title="Listen">🔊</button>
                    )}
                  </div>
                  {innerWords.length > 0 && (
                    <div style={{ marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px solid #334155', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {innerWords.map((iw, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                          <span>{iw.text}: {iw.translation}</span>
                          {ttsEnabled && (
                            <button onClick={(e) => { e.stopPropagation(); speak(iw.text, lang); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }} title="Listen">🔊</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </span>
              )}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
