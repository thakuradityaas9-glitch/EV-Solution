import { useEffect, useState } from 'react'
import { useDriverVehicles } from '../../context/driverVehicleStore.js'
import { fetchVehicleModels } from '../../services/driverVehicles.js'

const EMPTY_FORM = {
  vehicleModelId: '',
  nickname: '',
  batteryPercent: '',
  customRangeKm: '',
}

function modelName(model) {
  return [model?.make, model?.model, model?.variant].filter(Boolean).join(' ')
}

function vehicleName(vehicle) {
  return vehicle.nickname?.trim() || modelName(vehicle.vehicle_model) || 'Vehicle'
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function Vehicles() {
  const {
    vehicles,
    activeVehicleId,
    loading: vehiclesLoading,
    error: vehiclesError,
    addVehicle,
    editVehicle,
    removeVehicle,
    selectActiveVehicle,
    makeDefaultVehicle,
  } = useDriverVehicles()
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState(null)
  const [formMode, setFormMode] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let mounted = true
    fetchVehicleModels()
      .then((catalogue) => {
        if (mounted) setModels(catalogue)
      })
      .catch((error) => {
        if (mounted) setModelsError(error.message || 'Could not load vehicle models.')
      })
      .finally(() => {
        if (mounted) setModelsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  function beginAdd() {
    setForm(EMPTY_FORM)
    setFormMode('add')
    setActionError(null)
    setNotice(null)
  }

  function beginEdit(vehicle) {
    setForm({
      vehicleModelId: vehicle.vehicle_model_id,
      nickname: vehicle.nickname || '',
      batteryPercent: String(vehicle.current_battery_percent ?? ''),
      customRangeKm: vehicle.custom_range_km == null ? '' : String(vehicle.custom_range_km),
    })
    setFormMode(vehicle.id)
    setActionError(null)
    setNotice(null)
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setActionError(null)
    setNotice(null)

    const batteryPercent = Number(form.batteryPercent)
    const customRangeKm = form.customRangeKm.trim() === '' ? null : Number(form.customRangeKm)

    if (formMode === 'add' && !form.vehicleModelId) {
      setActionError('Choose a vehicle model from the catalogue.')
      return
    }
    if (!Number.isInteger(batteryPercent) || batteryPercent < 0 || batteryPercent > 100) {
      setActionError('Battery percentage must be a whole number from 0 to 100.')
      return
    }
    if (customRangeKm !== null && (!Number.isFinite(customRangeKm) || customRangeKm <= 0)) {
      setActionError('Custom full-charge range must be a number greater than 0 km.')
      return
    }
    if (form.nickname.trim().length > 80) {
      setActionError('Nickname must be 80 characters or fewer.')
      return
    }

    setSaving(true)
    try {
      if (formMode === 'add') {
        await addVehicle({
          vehicle_model_id: form.vehicleModelId,
          nickname: form.nickname.trim() || null,
          current_battery_percent: batteryPercent,
          custom_range_km: customRangeKm,
        })
        setNotice('Vehicle added and selected as active.')
      } else {
        await editVehicle(formMode, {
          nickname: form.nickname.trim() || null,
          current_battery_percent: batteryPercent,
          custom_range_km: customRangeKm,
        })
        setNotice('Vehicle updated.')
      }
      setFormMode(null)
    } catch (error) {
      setActionError(error.message || 'Could not save this vehicle.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vehicle) {
    if (!window.confirm(`Delete ${vehicleName(vehicle)} from your vehicles?`)) return
    setActionError(null)
    setNotice(null)
    try {
      await removeVehicle(vehicle.id)
      if (formMode === vehicle.id) setFormMode(null)
      setNotice('Vehicle deleted.')
    } catch (error) {
      setActionError(error.message || 'Could not delete this vehicle.')
    }
  }

  async function handleSetDefault(vehicle) {
    setActionError(null)
    setNotice(null)
    try {
      await makeDefaultVehicle(vehicle.id)
      setNotice(`${vehicleName(vehicle)} is now your default vehicle.`)
    } catch (error) {
      setActionError(error.message || 'Could not update your default vehicle.')
    }
  }

  const editingVehicle = vehicles.find((vehicle) => vehicle.id === formMode)

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-slate-100 px-4 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5 pb-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Your vehicles</h2>
            <p className="mt-1 text-sm text-slate-600">Manage saved vehicles and choose the one used for route estimates.</p>
          </div>
          <button
            type="button"
            onClick={beginAdd}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Add vehicle
          </button>
        </header>

        {(vehiclesError || modelsError || actionError) && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError || vehiclesError || modelsError}
          </p>
        )}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        {formMode && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{formMode === 'add' ? 'Add a vehicle' : `Edit ${vehicleName(editingVehicle || {})}`}</h3>
                {formMode !== 'add' && <p className="mt-1 text-sm text-slate-500">Model details come from the catalogue and cannot be changed here.</p>}
              </div>
              <button type="button" onClick={() => setFormMode(null)} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {formMode === 'add' && (
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Vehicle model</span>
                  <select
                    required
                    value={form.vehicleModelId}
                    onChange={(event) => updateForm('vehicleModelId', event.target.value)}
                    disabled={modelsLoading || models.length === 0}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">{modelsLoading ? 'Loading catalogue…' : 'Select a model'}</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>{modelName(model)}</option>
                    ))}
                  </select>
                  {!modelsLoading && models.length === 0 && !modelsError && <span className="mt-1 block text-xs text-amber-700">No vehicle models are available in the catalogue yet.</span>}
                </label>
              )}

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nickname <span className="font-normal text-slate-500">(optional)</span></span>
                <input
                  value={form.nickname}
                  onChange={(event) => updateForm('nickname', event.target.value)}
                  maxLength={80}
                  placeholder="e.g. City car"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Current battery (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  value={form.batteryPercent}
                  onChange={(event) => updateForm('batteryPercent', event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Custom full-charge range in km <span className="font-normal text-slate-500">(optional)</span></span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={form.customRangeKm}
                  onChange={(event) => updateForm('customRangeKm', event.target.value)}
                  placeholder="Use catalogue range when blank"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || (formMode === 'add' && (modelsLoading || models.length === 0))}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : formMode === 'add' ? 'Save vehicle' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

        {vehiclesLoading ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">Loading your vehicles…</div>
        ) : vehicles.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <h3 className="text-base font-semibold">No vehicles saved yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Add a vehicle to use its battery, connector, and range in charging recommendations.</p>
            <button type="button" onClick={beginAdd} className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add your first vehicle</button>
          </section>
        ) : (
          <section aria-label="Saved vehicles" className="space-y-3">
            {vehicles.map((vehicle) => {
              const model = vehicle.vehicle_model
              const fullRange = vehicle.custom_range_km ?? model?.reference_range_km
              const remainingRange = fullRange == null
                ? null
                : Math.round(Number(fullRange) * vehicle.current_battery_percent / 100)
              const isActive = activeVehicleId === vehicle.id
              const isEditing = formMode === vehicle.id

              return (
                <article key={vehicle.id} className={`rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${isActive ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{vehicleName(vehicle)}</h3>
                        {vehicle.is_default && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Default</span>}
                        {isActive && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Active</span>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{modelName(model) || 'Catalogue model unavailable'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isActive && <button type="button" onClick={() => selectActiveVehicle(vehicle.id)} className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Set active</button>}
                      {!vehicle.is_default && <button type="button" onClick={() => handleSetDefault(vehicle)} className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Set default</button>}
                      <button type="button" onClick={() => isEditing ? setFormMode(null) : beginEdit(vehicle)} className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{isEditing ? 'Close edit' : 'Edit'}</button>
                      <button type="button" onClick={() => handleDelete(vehicle)} className="rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                    <div><dt className="text-xs text-slate-500">Battery</dt><dd className="mt-0.5 text-sm font-semibold">{vehicle.current_battery_percent}%</dd></div>
                    <div><dt className="text-xs text-slate-500">Capacity</dt><dd className="mt-0.5 text-sm font-semibold">{model?.battery_capacity_kwh == null ? 'Not listed' : `${formatNumber(model.battery_capacity_kwh)} kWh`}</dd></div>
                    <div><dt className="text-xs text-slate-500">Connector</dt><dd className="mt-0.5 text-sm font-semibold">{model?.connector_type || 'Not listed'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Max charging</dt><dd className="mt-0.5 text-sm font-semibold">{model?.max_charging_power_kw == null ? 'Not listed' : `${formatNumber(model.max_charging_power_kw)} kW`}</dd></div>
                    <div><dt className="text-xs text-slate-500">Full-charge range</dt><dd className="mt-0.5 text-sm font-semibold">{fullRange == null ? 'Not listed' : `${formatNumber(fullRange)} km`}{vehicle.custom_range_km != null && <span className="ml-1 text-xs font-normal text-slate-500">custom</span>}</dd></div>
                    <div><dt className="text-xs text-slate-500">Estimated remaining</dt><dd className="mt-0.5 text-sm font-semibold">{remainingRange == null ? 'Not available' : `${formatNumber(remainingRange)} km`}</dd></div>
                  </dl>
                  <p className="mt-3 text-xs text-slate-500">Range is an estimate based on the saved battery percentage, not live vehicle telemetry.</p>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
