import { useState, useEffect, useRef } from 'react'
import type { VocabItem } from '../types'
import { speak } from '../utils/tts'
import { findImage, prefetchImages } from '../utils/imageSearch'

interface Props {
  text: string
  vocabulary?: VocabItem[]
  onWordClick?: (word: string) => void
  style?: React.CSSProperties
  lang?: string
  ttsEnabled?: boolean
  imagesEnabled?: boolean
}

export function InteractiveText({ text, vocabulary, onWordClick, style, lang = 'en', ttsEnabled = true, imagesEnabled = true }: Props) {
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [showBelow, setShowBelow] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)

  // Prefetch all images for this text's vocab on mount
  const vocabKey = vocabulary?.map(v => v.text).join('|') || ''
  useEffect(() => {
    if (!imagesEnabled || !vocabulary || vocabulary.length === 0) return
    const timer = setTimeout(() => {
      prefetchImages(vocabulary.map(v => v.text), lang)
    }, 200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabKey, imagesEnabled])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveWord(null)
        setImageUrl(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!activeWord || !imagesEnabled) {
      setImageUrl(null)
      return
    }
    let cancelled = false
    setIsLoadingImage(true)
    const vocabItem = vocabulary?.find(v => v.text.toLowerCase() === activeWord.toLowerCase())
    const query = vocabItem ? vocabItem.text : activeWord
    findImage(query, lang).then(url => {
      if (!cancelled) {
        setImageUrl(url)
        setIsLoadingImage(false)
      }
    })
    return () => { cancelled = true }
  }, [activeWord, imagesEnabled, vocabulary])

  if (!vocabulary || vocabulary.length === 0) return <span style={style}>{text}</span>

  const sortedVocab = [...vocabulary].sort((a, b) => b.text.length - a.text.length)
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${sortedVocab.map(v => escapeRegExp(v.text)).join('|')})`, 'gi')
  const parts = text.split(regex)

  const handleWordClick = (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    // Show below if word is in the top 45% of viewport (no room above)
    setShowBelow(rect.top < window.innerHeight * 0.45)
    setActiveWord(activeWord === word ? null : word)
    if (onWordClick) onWordClick(word)
  }

  return (
    <span ref={containerRef} style={style}>
      {parts.map((part, i) => {
        const match = sortedVocab.find(v => v.text.toLowerCase() === part.toLowerCase())
        if (match) {
          const innerWords = vocabulary.filter(v => v.text !== match.text && match.text.toLowerCase().includes(v.text.toLowerCase()))
          const positionStyles = showBelow
            ? { top: '100%', marginTop: '0.5rem' }
            : { bottom: '100%', marginBottom: '0.5rem' }

          return (
            <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onClick={(e) => handleWordClick(e, match.text)}
                style={{ borderBottom: '1px dashed #38bdf8', cursor: 'pointer', color: '#e2e8f0' }}
              >
                {part}
              </span>
              
              {activeWord === match.text && (
                <span
                  style={{
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                    ...positionStyles,
                    background: '#1e293b', color: '#fff', padding: '0.6rem', borderRadius: '8px',
                    fontSize: '0.9rem', zIndex: 9999, border: '1px solid #475569',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column', gap: '0.4rem',
                    minWidth: '160px', maxWidth: '220px', whiteSpace: 'normal'
                  }}
                >
                  {imagesEnabled && imageUrl && (
                    <img
                      src={imageUrl}
                      alt={match.text}
                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                      onError={() => setImageUrl(null)}
                    />
                  )}
                  {imagesEnabled && isLoadingImage && !imageUrl && (
                    <div style={{ width: '100%', height: '100px', background: '#0f172a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                      Loading...
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <strong style={{ wordBreak: 'break-word' }}>{match.translation}</strong>
                    {ttsEnabled && (
                      <span 
                        onClick={(e) => { e.stopPropagation(); speak(match.text, lang); }} 
                        style={{ cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.2rem' }} 
                        title="Listen"
                      >
                        🔊
                      </span>
                    )}
                  </div>

                  {innerWords.length > 0 && (
                    <div style={{ marginTop: '0.2rem', paddingTop: '0.4rem', borderTop: '1px solid #334155', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {innerWords.map((iw, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.2rem 0' }}>
                          <span>{iw.text}: {iw.translation}</span>
                          {ttsEnabled && (
                            <span onClick={(e) => { e.stopPropagation(); speak(iw.text, lang); }} style={{ cursor: 'pointer' }}>🔊</span>
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
