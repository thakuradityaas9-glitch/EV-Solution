import { useState } from 'react'
import { driverStations } from '../../data/driverStations.js'
import StationMarker from './StationMarker.jsx'

export default function DriverMap({ onStationSelect }) {
  const [zoom, setZoom] = useState(1)
  const [showRoute, setShowRoute] = useState(false)

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[#e8f0e4] shadow-sm shadow-slate-200/40">
      
      {/* MAP AREA */}
      <div
        className="relative h-[520px] w-full transition-transform duration-300"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center',
        }}
      >
        {/* Background roads */}
        <div className="absolute inset-0">
          {/* Horizontal roads */}
          <div className="absolute left-[-10%] top-[22%] h-5 w-[120%] rotate-[7deg] bg-white/80" />
          <div className="absolute left-[-10%] top-[48%] h-6 w-[120%] rotate-[-8deg] bg-white/80" />
          <div className="absolute left-[-10%] top-[72%] h-5 w-[120%] rotate-[5deg] bg-white/80" />

          {/* Vertical roads */}
          <div className="absolute left-[28%] top-[-20%] h-[140%] w-6 rotate-[18deg] bg-white/80" />
          <div className="absolute left-[65%] top-[-20%] h-[140%] w-5 rotate-[-12deg] bg-white/80" />
        </div>

        {/* Parks */}
        <div className="absolute left-[7%] top-[8%] h-28 w-32 rounded-[45%] bg-green-200/70" />
        <div className="absolute bottom-[10%] right-[10%] h-32 w-40 rounded-[45%] bg-green-200/70" />

        {/* Water */}
        <div className="absolute right-[-10%] top-[-10%] h-[130%] w-28 rotate-[18deg] bg-cyan-100/70" />

        {/* Route */}
        {showRoute && (
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            viewBox="0 0 900 520"
            preserveAspectRatio="none"
          >
            <polyline
              points="
                120,410
                190,365
                260,350
                335,295
                420,275
                510,235
                600,210
                685,175
                770,135
              "
              fill="none"
              stroke="#2563eb"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.2"
            />

            <polyline
              points="
                120,410
                190,365
                260,350
                335,295
                420,275
                510,235
                600,210
                685,175
                770,135
              "
              fill="none"
              stroke="#2563eb"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 6"
            />

            {/* Starting point */}
            <circle
              cx="120"
              cy="410"
              r="10"
              fill="#16a34a"
              stroke="white"
              strokeWidth="4"
            />

            {/* Destination */}
            <circle
              cx="770"
              cy="135"
              r="10"
              fill="#dc2626"
              stroke="white"
              strokeWidth="4"
            />
          </svg>
        )}

        {/* Current location */}
        <div
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: '13%',
            top: '79%',
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-blue-500 opacity-30" />

            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-lg">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          </div>

          <div className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-md">
            You
          </div>
        </div>

        {/* Charging station markers */}
        {driverStations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            onClick={onStationSelect}
          />
        ))}
      </div>

      {/* MAP CONTROLS */}
      <div className="absolute right-4 top-4 z-40 flex flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.min(current + 0.1, 1.4))
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-lg transition hover:bg-slate-50"
        >
          +
        </button>

        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.max(current - 0.1, 0.8))
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-lg transition hover:bg-slate-50"
        >
          −
        </button>

        <button
          type="button"
          onClick={() => setZoom(1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50"
          title="Reset zoom"
        >
          ⌂
        </button>

        <button
          type="button"
          onClick={() => setShowRoute((current) => !current)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold shadow-lg transition ${
            showRoute
              ? 'bg-cyan-700 text-white'
              : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
          title="Show route"
        >
          ➜
        </button>
      </div>

      {/* LEGEND */}
      <div className="absolute bottom-4 left-4 z-40 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Station availability
        </p>

        <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            Available
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            Limited
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            Full
          </div>
        </div>
      </div>

      {/* MAP LABEL */}
      <div className="absolute left-4 top-4 z-40 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
          Live Charging Network
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {driverStations.length} stations nearby
        </p>
      </div>
    </div>
  )
}