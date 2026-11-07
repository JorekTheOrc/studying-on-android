import { Outlet, NavLink } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <h2>Study</h2>
        {/* replace prevents history stacking on mobile */}
        <NavLink replace to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
          Home
        </NavLink>
        <NavLink replace to="/builder" className={({ isActive }) => (isActive ? 'active' : '')}>
          Builder
        </NavLink>
        <NavLink replace to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>
          Import
        </NavLink>
        <NavLink replace to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          Settings
        </NavLink>
      </nav>
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
