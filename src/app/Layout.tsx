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
      <nav className={`sidebar ${hidden ? 'hidden' : ''}`}>
        <h2>Study</h2>
        <NavLink replace to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>Home</NavLink>
        <NavLink replace to="/stats" className={({ isActive }) => (isActive ? 'active' : '')}>Stats</NavLink>
        <NavLink replace to="/cards" className={({ isActive }) => (isActive ? 'active' : '')}>Cards</NavLink>
        <NavLink replace to="/studio" className={({ isActive }) => (isActive ? 'active' : '')}>Studio</NavLink>
        <NavLink replace to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>Settings</NavLink>
      </nav>
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
