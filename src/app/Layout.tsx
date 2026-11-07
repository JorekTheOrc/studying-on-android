import { Outlet, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'

export function Layout() {
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      // Only auto-hide on mobile (width < 768)
      if (window.innerWidth <= 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
          setHidden(true) // scrolling down
        } else {
          setHidden(false) // scrolling up
        }
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <div className="app-layout">
      <nav className={`sidebar ${hidden ? 'hidden' : ''}`}>
        <h2>Study</h2>
        <NavLink replace to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>Home</NavLink>
        <NavLink replace to="/builder" className={({ isActive }) => (isActive ? 'active' : '')}>Builder</NavLink>
        <NavLink replace to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>Import</NavLink>
        <NavLink replace to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>Settings</NavLink>
      </nav>
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
