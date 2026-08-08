export default function StationMarker({ station, onClick, isRecommended = false }) {
  const availabilityPercentage =
    (station.availableChargers / station.totalChargers) * 100

  let markerColor = '#34D399'

  if (station.availableChargers === 0) {
    markerColor = '#EF4444'
  } else if (availabilityPercentage <= 35) {
    markerColor = '#FBBF24'
  }

  return (
    <button
      type="button"
      onClick={() => onClick(station)}
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: station.mapPosition?.x ?? '50%',
        top: station.mapPosition?.y ?? '50%',
      }}
      aria-label={`Open ${station.name}`}
    >
      {/* Marker */}
      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow-lg transition duration-200 group-hover:scale-110 ${
          isRecommended ? 'animate-pulse ring-4 ring-cyan-300 ring-offset-2' : ''
        }`}
        style={{ backgroundColor: markerColor }}
      >
        <span className="text-lg">⚡</span>

        {isRecommended && (
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-cyan-700 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
            ⭐ Recommended
          </span>
        )}
      </div>

      {/* Station name */}
      <div className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 opacity-0 shadow-md transition duration-200 group-hover:opacity-100">
        {station.name}
      </div>

      {/* Availability */}
      <div
        className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold text-white"
        style={{ backgroundColor: markerColor }}
      >
        {station.availableChargers}
      </div>
    </button>
  )
}