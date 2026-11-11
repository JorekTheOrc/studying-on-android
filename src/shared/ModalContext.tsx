import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type ModalType = 'alert' | 'confirm' | 'prompt' | null

interface ModalOptions {
  type: ModalType
  title?: string
  message: string
  defaultValue?: string
  resolve?: (val: any) => void
}

interface ModalContextType {
  alert: (message: string, title?: string) => Promise<void>
  confirm: (message: string, title?: string) => Promise<boolean>
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null)
  const [inputValue, setInputValue] = useState('')

  const alert = (message: string, title?: string) => {
    return new Promise<void>((resolve) => {
      setModal({ type: 'alert', message, title, resolve })
    })
  }

  const confirm = (message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      setModal({ type: 'confirm', message, title, resolve })
    })
  }

  const prompt = (message: string, defaultValue = '', title?: string) => {
    setInputValue(defaultValue)
    return new Promise<string | null>((resolve) => {
      setModal({ type: 'prompt', message, title, defaultValue, resolve })
    })
  }

  const handleClose = (value: any) => {
    if (modal?.resolve) {
      modal.resolve(value)
      setModal(null)
    }
  }

  return (
    <ModalContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      
      {modal && (
        <div onClick={() => modal.type !== 'alert' && handleClose(modal.type === 'confirm' ? false : null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#38bdf8', fontSize: '1.2rem' }}>
              {modal.title || (modal.type === 'prompt' ? 'Input' : modal.type === 'confirm' ? 'Confirm' : 'Notice')}
            </h3>
            
            <p style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap', marginBottom: '1.5rem', fontSize: '1rem', lineHeight: 1.5 }}>
              {modal.message}
            </p>
            
            {modal.type === 'prompt' && (
              <input 
                autoFocus
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter') handleClose(inputValue) }}
                style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', marginBottom: '1.5rem', boxSizing: 'border-box', fontSize: '1rem' }} 
              />
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {modal.type !== 'alert' && (
                <button onClick={() => handleClose(null)} style={{ padding: '0.6rem 1.2rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
                  Cancel
                </button>
              )}
              <button onClick={() => handleClose(modal.type === 'confirm' ? true : modal.type === 'prompt' ? inputValue : undefined)} style={{ padding: '0.6rem 1.2rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
