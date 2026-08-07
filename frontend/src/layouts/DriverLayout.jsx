import { Outlet } from 'react-router-dom'
import DriverNav from '../components/driver/DriverNav.jsx'

export default function DriverLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Driver Portal</h1>
            <p className="text-sm text-slate-400">Routes for drivers and charger recommendations.</p>
          </div>
          <DriverNav />
        </div>
      </header>
      <Outlet />
    </div>
  )
}
