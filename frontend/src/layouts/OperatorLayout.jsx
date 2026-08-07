import { Outlet } from 'react-router-dom'
import OperatorNav from '../components/operator/OperatorNav.jsx'

export default function OperatorLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Operator Portal</h1>
            <p className="text-sm text-slate-400">Routes for operations, chargers, and analytics.</p>
          </div>
          <OperatorNav />
        </div>
      </header>
      <Outlet />
    </div>
  )
}
