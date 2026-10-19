import supabase from '../lib/supabase.js'

const MODEL_COLUMNS =
  'id, make, model, variant, battery_capacity_kwh, reference_range_km, connector_type, max_charging_power_kw'
const VEHICLE_COLUMNS = `id, vehicle_model_id, nickname, current_battery_percent, custom_range_km, is_default, created_at, updated_at, vehicle_model:vehicle_models(${MODEL_COLUMNS})`

function requireUserId(userId) {
  if (!userId) throw new Error('Sign in to manage your vehicles.')
}

function normalizeModel(model) {
  if (!model) return null
  return {
    ...model,
    battery_capacity_kwh: model.battery_capacity_kwh == null ? null : Number(model.battery_capacity_kwh),
    reference_range_km: model.reference_range_km == null ? null : Number(model.reference_range_km),
    max_charging_power_kw: model.max_charging_power_kw == null ? null : Number(model.max_charging_power_kw),
  }
}

function normalizeVehicle(vehicle) {
  return {
    ...vehicle,
    custom_range_km: vehicle.custom_range_km == null ? null : Number(vehicle.custom_range_km),
    vehicle_model: normalizeModel(vehicle.vehicle_model),
  }
}

export async function fetchVehicleModels() {
  const { data, error } = await supabase
    .from('vehicle_models')
    .select(MODEL_COLUMNS)
    .order('make')
    .order('model')
    .order('variant')

  if (error) throw error
  return (data || []).map(normalizeModel)
}

export async function fetchDriverVehicles(userId) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('driver_vehicles')
    .select(VEHICLE_COLUMNS)
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map(normalizeVehicle)
}

export async function createDriverVehicle(userId, vehicle) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('driver_vehicles')
    .insert({
      owner_id: userId,
      vehicle_model_id: vehicle.vehicle_model_id,
      nickname: vehicle.nickname,
      current_battery_percent: vehicle.current_battery_percent,
      custom_range_km: vehicle.custom_range_km,
      is_default: false,
    })
    .select(VEHICLE_COLUMNS)
    .single()

  if (error) throw error
  return normalizeVehicle(data)
}

export async function updateDriverVehicle(userId, vehicleId, changes) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('driver_vehicles')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', vehicleId)
    .eq('owner_id', userId)
    .select(VEHICLE_COLUMNS)
    .single()

  if (error) throw error
  return normalizeVehicle(data)
}

export async function deleteDriverVehicle(userId, vehicleId) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('driver_vehicles')
    .delete()
    .eq('id', vehicleId)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Vehicle was not found or is no longer available.')
}

export async function setDefaultDriverVehicle(userId, vehicleId, previousDefaultId) {
  requireUserId(userId)
  const { error: clearError } = await supabase
    .from('driver_vehicles')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('owner_id', userId)
    .eq('is_default', true)
    .neq('id', vehicleId)

  if (clearError) throw clearError

  const { data, error } = await supabase
    .from('driver_vehicles')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', vehicleId)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    if (previousDefaultId) {
      await supabase
        .from('driver_vehicles')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', previousDefaultId)
        .eq('owner_id', userId)
    }
    if (error) throw error
    throw new Error('Vehicle was not found or is no longer available.')
  }
}
