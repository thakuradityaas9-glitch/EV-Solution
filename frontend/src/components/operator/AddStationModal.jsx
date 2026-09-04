import { useState } from 'react'

const CONNECTOR_OPTIONS = ['CCS2', 'Type 2', 'CHAdeMO', 'GB/T']

export default function AddStationModal({ onCreate, onClose }) {
  const [form, setForm] = useState({
    name: '',
    type: 'commercial',
    address: '',
    latitude: '',
    longitude: '',
    totalChargers: '2',
    connectorType: 'CCS2',
    speedKW: '',
    pricePerKwh: '',
    openingHours: '24/7',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const latitude = parseFloat(form.latitude)
    const longitude = parseFloat(form.longitude)
    const totalChargers = parseInt(form.totalChargers, 10)

    if (!form.name.trim()) return setError('Station name is required.')
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return setError('Latitude and longitude must be numbers.')
    if (!Number.isInteger(totalChargers) || totalChargers < 1) return setError('Total chargers must be at least 1.')

    setSaving(true)
    try {
      await onCreate({
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim(),
        latitude,
        longitude,
        totalChargers,
        connectorType: form.connectorType,
        speedKW: form.speedKW ? parseInt(form.speedKW, 10) : null,
        pricePerKwh: form.pricePerKwh ? parseFloat(form.pricePerKwh) : null,
        openingHours: form.openingHours.trim(),
      })
    } catch (err) {
      setError(err?.message || 'Could not create the station.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-10 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl rounded-4xl bg-white p-8 text-slate-950 shadow-2xl shadow-slate-950/20"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Operator Portal</p>
            <h2 className="mt-2 text-2xl font-semibold">Add a charging station</h2>
            <p className="mt-2 text-sm text-slate-600">
              You can upload CCTV footage and calibrate detection boxes right after.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-600">Station name</span>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Type</span>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="commercial">Fast Charging Hub (commercial)</option>
              <option value="community">Community Charger</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Total chargers</span>
            <input
              type="number"
              min="1"
              value={form.totalChargers}
              onChange={(e) => update('totalChargers', e.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-600">Address</span>
            <input
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Latitude</span>
            <input
              value={form.latitude}
              onChange={(e) => update('latitude', e.target.value)}
              placeholder="30.3398"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Longitude</span>
            <input
              value={form.longitude}
              onChange={(e) => update('longitude', e.target.value)}
              placeholder="76.3869"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Connector type</span>
            <select
              value={form.connectorType}
              onChange={(e) => update('connectorType', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              {CONNECTOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Charging speed (kW)</span>
            <input
              type="number"
              value={form.speedKW}
              onChange={(e) => update('speedKW', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Price / kWh (₹)</span>
            <input
              type="number"
              step="0.1"
              value={form.pricePerKwh}
              onChange={(e) => update('pricePerKwh', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-600">Operating hours</span>
            <input
              value={form.openingHours}
              onChange={(e) => update('openingHours', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create station'}
          </button>
        </div>
      </form>
    </div>
  )
}
