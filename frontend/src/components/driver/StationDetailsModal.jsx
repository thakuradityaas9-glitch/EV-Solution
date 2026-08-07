export default function StationDetailsModal({ station, onClose }) {
  if (!station) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 px-4 py-6 sm:items-center sm:px-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl shadow-slate-900/30">
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Why this station</p>
              <ul className="mt-4 space-y-3 text-slate-700">
                <li>✓ Low waiting time</li>
                <li>✓ Small route deviation</li>
                <li>✓ High-speed charging</li>
                <li>✓ {station.availableChargers} chargers currently available</li>
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
