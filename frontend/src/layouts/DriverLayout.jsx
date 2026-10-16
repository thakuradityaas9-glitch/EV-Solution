import { Outlet } from 'react-router-dom'
import DriverNav from '../components/driver/DriverNav.jsx'
import { BoltIcon } from '../components/driver/icons.jsx'

// The layout owns the viewport (h-dvh, no page scroll). Pages render inside a
// min-h-0 flex child so they can split the remaining height between a sticky
// map and an independently scrolling results column.
export default function DriverLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-100 text-slate-900">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
            <BoltIcon className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold">Driver Portal</h1>
            <p className="hidden text-xs text-slate-500 sm:block">Routes and charger recommendations</p>
          </div>
        </div>
        <DriverNav />
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
