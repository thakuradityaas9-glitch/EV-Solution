import { NavLink } from 'react-router-dom'

const links = [
  { to: '/operator', label: 'Dashboard' },
  { to: '/operator/live', label: 'Live' },
  { to: '/operator/chargers', label: 'Chargers' },
  { to: '/operator/analytics', label: 'Analytics' },
]

export default function OperatorNav() {
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `rounded-full border px-4 py-2 transition ${isActive ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
