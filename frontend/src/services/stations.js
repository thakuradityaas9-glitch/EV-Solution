import supabase from '../lib/supabase'

const AMENITY_LABELS = {
  cafe: 'Café',
  restroom: 'Restroom',
  parking: 'Parking',
  wifi: 'Wi-Fi',
  security: 'Security',
  'ev shop': 'EV Shop',
  '24/7 support': '24/7 Support',
}

function prettifyAmenity(key) {
  return (
    AMENITY_LABELS[key] ||
    key.replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

/**
 * Maps a raw `stations` row (snake_case, as stored in Postgres) to the
 * camelCase shape StationCard / StationDetailsModal / DriverMap already
 * expect (they were built against the old driverStations.js mock data
 * — keeping that shape means those components didn't need to change).
 */
export function mapStationRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type === 'community' ? 'Community Charger' : 'Fast Charging Hub',
    stationType: row.type, // raw 'commercial' | 'community', for logic that needs it
    verification: row.verification,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address || '',
    openingHours: row.operating_hours || 'Hours not listed',
    totalChargers: row.total_chargers,
    speedKW: row.charging_speed_kw || 0,
    connectorType: row.connector_type,
    pricePerKwh: row.price_per_kwh,
    amenities: (row.amenities || []).map(prettifyAmenity),
    rating: row.rating || 0,
    reviews: 0, // real per-station review counts are a follow-up (see reviews table)
    cctvEnabled: row.cctv_enabled,
    liveAvailableChargers: row.live_available_chargers,
    livePredictedWaitMin: row.live_predicted_wait_min,
    liveQueueLength: row.live_queue_length,
    liveUpdatedAt: row.live_updated_at,
  }
}

export async function fetchStations() {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .neq('verification', 'rejected')

  if (error) throw error
  return (data || []).map(mapStationRow)
}

export async function fetchVehicle(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    model: data.model,
    batteryPercent: data.battery_percent,
    estimatedRangeKm: data.estimated_range_km,
    maxChargingKw: data.max_charging_kw,
    connectorType: data.connector_type,
  }
}

export async function upsertVehicle(userId, vehicle) {
  const { data, error } = await supabase
    .from('vehicles')
    .upsert(
      {
        owner_id: userId,
        model: vehicle.model,
        battery_percent: vehicle.batteryPercent,
        estimated_range_km: vehicle.estimatedRangeKm,
        max_charging_kw: vehicle.maxChargingKw,
        connector_type: vehicle.connectorType,
      },
      { onConflict: 'owner_id' }
    )
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    model: data.model,
    batteryPercent: data.battery_percent,
    estimatedRangeKm: data.estimated_range_km,
    maxChargingKw: data.max_charging_kw,
    connectorType: data.connector_type,
  }
}
