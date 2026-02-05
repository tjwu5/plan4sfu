import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { label: 'Dashboard', to: '/dashboard', colorClass: 'tab-yellow' },
  { label: 'Progress', to: '/progress', colorClass: 'tab-blue' },
  { label: 'Plan', to: '/plan', colorClass: 'tab-green' },
  { label: 'Browse', to: '/browse', colorClass: 'tab-pink' },
  { label: 'Settings', to: '/settings', colorClass: 'tab-pink' },
]

export default function BinderLayout() {
  return (
    <div className="binder-shell">
      <aside className="binder-spine">
        <div className="binder-rings">
          <span className="ring" />
          <span className="ring" />
          <span className="ring" />
        </div>
        <nav className="binder-tabs">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className="binder-tab">
              {({ isActive }) => (
                <span
                  className={`tab-label ${tab.colorClass} ${
                    isActive ? 'active' : ''
                  }`}
                >
                  {tab.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/setup" className="binder-setup-link">
          Setup
        </NavLink>
      </aside>
      <main className="paper-surface">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
