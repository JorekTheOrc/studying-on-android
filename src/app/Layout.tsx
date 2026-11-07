import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Hide back button on home page
  const isHome = location.pathname === '/'

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <h2>Study</h2>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
          Home
        </NavLink>
        <NavLink to="/builder" className={({ isActive }) => (isActive ? 'active' : '')}>
          Builder
        </NavLink>
        <NavLink to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>
          Import
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          Settings
        </NavLink>
      </nav>
      
      <main className="content">
        {/* Global Back Button */}
        {!isHome && (
          <button 
            onClick={() => navigate(-1)} 
            style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}
          >
            ← Back
          </button>
        )}
        
        <Outlet />
      </main>
    </div>
  )
}
