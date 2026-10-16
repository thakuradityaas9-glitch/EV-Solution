import { NavLink } from 'react-router-dom'

const links = [{ to: '/driver', label: 'Home' }]

export default function DriverNav() {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          className={({ isActive }) =>
            `rounded-full px-3.5 py-1.5 font-medium transition ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
