import { useState, useEffect, useRef } from 'react'
import type { VocabItem, ImageResult } from '../types'
import { speak } from '../utils/tts'
import { getCachedImage, searchImages, saveChosenImage, clearImage } from '../utils/imageSearch'

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
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ImageResult[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [currentTitle, setCurrentTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showBelow, setShowBelow] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)

  // Load image when active word changes
  useEffect(() => {
    // Reset everything first so previous word's image doesn't flash
    setCurrentImage(null)
    setCandidates([])
    setCurrentIdx(0)
    setCurrentTitle('')

    if (!activeWord || !imagesEnabled) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    getCachedImage(activeWord, lang).then(async cached => {
      if (cancelled) return

      // Show cached image immediately (if exists)
      if (cached && cached.url) {
        setCurrentImage(cached.url)
        setCandidates(cached.candidates || [])
        setCurrentIdx(cached.currentIndex || 0)
        setCurrentTitle(cached.candidates?.[cached.currentIndex || 0]?.title || '')
      }

      // Fetch candidates in background if we don't have them
      if (!cached || !cached.candidates || cached.candidates.length === 0) {
        try {
          const results = await searchImages(activeWord, lang)
          if (cancelled) return

          if (results.length > 0) {
            setCandidates(results)
            let finalIdx = 0
            if (cached && cached.url) {
              const idx = results.findIndex(r => r.thumbnail === cached.url || r.url === cached.url)
              if (idx >= 0) finalIdx = idx
            }
            setCurrentIdx(finalIdx)
            setCurrentImage(results[finalIdx].thumbnail)
            setCurrentTitle(results[finalIdx].title)
            await saveChosenImage(activeWord, lang, results[finalIdx].url, results, finalIdx)
          }
        } catch {
          // silent
        }
      }

      if (!cancelled) setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [activeWord, imagesEnabled, lang])

  // Close popup when clicking outside
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

  const handleWordClick = (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setShowBelow(rect.top < window.innerHeight * 0.45)
    setActiveWord(activeWord === word ? null : word)
    if (onWordClick) onWordClick(word)
  }

  const goToIndex = async (newIdx: number) => {
    if (!activeWord || candidates.length === 0) return
    if (newIdx < 0 || newIdx >= candidates.length) return
    const target = candidates[newIdx]
    setCurrentIdx(newIdx)
    setCurrentImage(target.thumbnail)
    setCurrentTitle(target.title)
    await saveChosenImage(activeWord, lang, target.url, candidates, newIdx)
  }

  const handleClearImage = async () => {
    if (!activeWord) return
    await clearImage(activeWord, lang)
    setCurrentImage(null)
    setCandidates([])
    setCurrentIdx(0)
    setCurrentTitle('')
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
                    minWidth: '180px', maxWidth: '240px', whiteSpace: 'normal'
                  }}
                >
                  {/* IMAGE (if we have one) */}
                  {imagesEnabled && currentImage && (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={currentImage}
                        alt={match.text}
                        style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px', display: 'block' }}
                        onError={() => setCurrentImage(null)}
                      />

                      {/* Arrows (always visible if we have any candidates) */}
                      {candidates.length > 0 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); goToIndex(currentIdx - 1) }}
                            disabled={currentIdx === 0}
                            style={{
                              position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                              borderRadius: '50%', width: '26px', height: '26px',
                              cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                              opacity: currentIdx === 0 ? 0.4 : 1, fontSize: '0.8rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ◀
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); goToIndex(currentIdx + 1) }}
                            disabled={currentIdx === candidates.length - 1}
                            style={{
                              position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                              borderRadius: '50%', width: '26px', height: '26px',
                              cursor: currentIdx === candidates.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: currentIdx === candidates.length - 1 ? 0.4 : 1, fontSize: '0.8rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ▶
                          </button>
                        </>
                      )}

                      {/* Title of Wikipedia article */}
                      {currentTitle && (
                        <span style={{
                          position: 'absolute', bottom: '4px', right: '4px',
                          background: 'rgba(0,0,0,0.75)', padding: '1px 5px', borderRadius: '4px',
                          fontSize: '0.6rem', color: '#cbd5e1', maxWidth: '60%',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {currentTitle}
                        </span>
                      )}

                      {/* Counter 1/N */}
                      {candidates.length > 0 && (
                        <span style={{
                          position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)',
                          background: 'rgba(0,0,0,0.7)', padding: '1px 6px', borderRadius: '8px',
                          fontSize: '0.65rem', color: '#cbd5e1'
                        }}>
                          {currentIdx + 1} / {candidates.length}
                        </span>
                      )}

                      {/* Delete image button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClearImage() }}
                        style={{
                          position: 'absolute', top: '4px', right: '4px',
                          background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                          borderRadius: '4px', padding: '2px 6px', cursor: 'pointer',
                          fontSize: '0.7rem',
                        }}
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Loading indicator (only if no image yet) */}
                  {imagesEnabled && !currentImage && isLoading && (
                    <div style={{
                      padding: '0.4rem', background: '#0f172a', border: '1px dashed #334155',
                      color: '#64748b', borderRadius: '4px', fontSize: '0.7rem', textAlign: 'center',
                    }}>
                      Looking up...
                    </div>
                  )}


                  {/* TRANSLATION + SPEAKER */}
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
