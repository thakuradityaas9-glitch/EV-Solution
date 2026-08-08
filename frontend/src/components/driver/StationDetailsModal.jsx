export default function StationDetailsModal({ station, onClose }) {
  if (!station) return null

  const score = station.calculatedScore ?? station.recommendationScore

  const scoreLabel =
    score >= 80
      ? 'Excellent choice'
      : score >= 60
        ? 'Good choice'
        : score >= 40
          ? 'Fair choice'
          : 'Poor choice'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 px-4 py-6 sm:items-center sm:px-6">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-900/30">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Station details</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">{station.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{station.address}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-700">Close</button>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Distance</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{station.distanceKm} km</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ETA</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{station.etaMin} min</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Waiting time</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{station.waitMin} min</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Available chargers</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{station.availableChargers}/{station.totalChargers}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Charging speed</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{station.speedKW} kW</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rating</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">⭐ {station.rating} ({station.reviews} reviews)</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-[22px] border border-cyan-100 bg-cyan-50/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-700">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Based on current station conditions
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold text-cyan-700">
                    {score}
                  </p>

                  <p className="text-xs font-medium text-slate-500">
                    / 100
                  </p>

                  <p className="text-xs font-semibold text-cyan-700">
                    {scoreLabel}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-cyan-100">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all"
                  style={{
                    width: `${score}%`,
                  }}
                />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Why this station?
              </p>

              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {station.waitMin <= 5 && (
                  <li>✓ Low waiting time ({station.waitMin} min)</li>
                )}

                {station.availableChargers > 0 && (
                  <li>
                    ✓ {station.availableChargers} charger
                    {station.availableChargers > 1 ? 's' : ''} available
                  </li>
                )}

                {station.speedKW >= 120 && (
                  <li>✓ High-speed charging ({station.speedKW} kW)</li>
                )}

                {station.rating >= 4.5 && (
                  <li>✓ Highly rated ({station.rating}/5)</li>
                )}

                {station.deviationKm <= 1 && (
                  <li>✓ Small route deviation ({station.deviationKm} km)</li>
                )}
              </ul>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Opening hours</p>
              <p className="mt-3 text-base text-slate-700">{station.openingHours}</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Amenities</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-700">
                {station.amenities.map(amenity => (
                  <span key={amenity} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1">{amenity}</span>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Customer reviews</p>
              <p className="mt-3 text-base text-slate-700">Highly rated for fast charging and convenient access.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-6">
          <button className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50">Call Station</button>
          <button className="rounded-full border border-cyan-600 bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700">Get Directions</button>
          <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Start Trip</button>
        </div>
      </div>
    </div>
  )
}
