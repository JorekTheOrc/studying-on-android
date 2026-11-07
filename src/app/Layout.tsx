import { Outlet, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'

export function Layout() {
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (window.innerWidth <= 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
          setHidden(true)
        } else {
          setHidden(false)
        }
      }
      setLastScrollY(currentScrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <div className="app-layout">
      <nav className={`sidebar ${hidden ? 'hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <h2>Study</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <NavLink replace to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>Home</NavLink>
            <NavLink replace to="/builder" className={({ isActive }) => (isActive ? 'active' : '')}>Builder</NavLink>
            <NavLink replace to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>Import</NavLink>
            <NavLink replace to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>Settings</NavLink>
          </div>
        </div>
        
        {/* Exit App Button */}
        <button 
          onClick={() => window.close()} 
          style={{ marginTop: 'auto', padding: '0.75rem 1rem', background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
        >
          🚪 Exit App
        </button>
      </nav>
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
