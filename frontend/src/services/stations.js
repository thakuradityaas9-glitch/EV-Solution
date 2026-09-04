import supabase from '../lib/supabase'
import { fetchOCMStations } from './openChargeMap'
export async function fetchAllStations({ lat, lng }) {
  const [supabaseStations, ocmStations] = await Promise.all([
    fetchStations(),

    lat != null && lng != null
      ? fetchOCMStations({ lat, lng }).catch(() => [])
      : [],
  ])

  return [...supabaseStations, ...ocmStations]
}

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
    ownerId: row.owner_id,
    cctvVideoUrl: row.cctv_video_url,
    chargerRois: row.charger_rois || [],
    queueRois: row.queue_rois || [],
    roiFrameWidth: row.roi_frame_width,
    roiFrameHeight: row.roi_frame_height,
    calibratedAt: row.calibrated_at,
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

/**
 * Stations owned by the signed-in operator — used by "My Stations"
 * and the station detail / calibration screen. Unlike fetchStations,
 * this deliberately includes 'rejected' stations too (an operator
 * should still be able to see and manage their own rejected station).
 */
export async function fetchOperatorStations(ownerId) {
  if (!ownerId) return []
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapStationRow)
}

export async function fetchStationById(stationId) {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('id', stationId)
    .single()

  if (error) throw error
  return mapStationRow(data)
}

/**
 * Creates a new station owned by the current operator. Starts
 * unverified/uncalibrated/CCTV-disabled — the operator turns CCTV on
 * implicitly by uploading footage and calibrating (see
 * saveStationCalibration).
 */
export async function createStation(ownerId, station) {
  const { data, error } = await supabase
    .from('stations')
    .insert({
      owner_id: ownerId,
      name: station.name,
      type: station.type || 'commercial',
      latitude: station.latitude,
      longitude: station.longitude,
      address: station.address || null,
      contact: station.contact || null,
      total_chargers: station.totalChargers,
      charging_speed_kw: station.speedKW || null,
      connector_type: station.connectorType || null,
      price_per_kwh: station.pricePerKwh || null,
      operating_hours: station.openingHours || null,
    })
    .select()
    .single()

  if (error) throw error
  return mapStationRow(data)
}

/**
 * Uploads a CCTV clip for a station to Supabase Storage and points
 * the station at it. Does NOT enable cctv_enabled or touch the ROI
 * columns — that happens once calibration is actually saved, so a
 * station never claims to have live monitoring with un-calibrated (or
 * default-grid) ROIs.
 */
export async function uploadStationFootage(stationId, file) {
  const ext = file.name.split('.').pop() || 'mp4'
  const path = `${stationId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('station-footage')
    .upload(path, file, { upsert: true, contentType: file.type || 'video/mp4' })

  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase.storage.from('station-footage').getPublicUrl(path)
  const videoUrl = publicUrlData.publicUrl

  const { data, error } = await supabase
    .from('stations')
    .update({ cctv_video_url: videoUrl })
    .eq('id', stationId)
    .select()
    .single()

  if (error) throw error
  return mapStationRow(data)
}

/**
 * Saves calibrated ROIs (fractions of frame width/height, see
 * 04_operator_console.sql) and flips cctv_enabled on — this is the
 * point at which a station is considered "ready for monitoring".
 */
export async function saveStationCalibration(stationId, { chargerRois, queueRois, frameWidth, frameHeight }) {
  const { data, error } = await supabase
    .from('stations')
    .update({
      charger_rois: chargerRois,
      queue_rois: queueRois,
      roi_frame_width: frameWidth,
      roi_frame_height: frameHeight,
      calibrated_at: new Date().toISOString(),
      cctv_enabled: true,
    })
    .eq('id', stationId)
    .select()
    .single()

  if (error) throw error
  return mapStationRow(data)
}

export async function fetchStationTrafficToday(stationId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('station_daily_traffic')
    .select('car_count')
    .eq('station_id', stationId)
    .eq('traffic_date', today)
    .maybeSingle()

  if (error) throw error
  return data?.car_count || 0
}

/**
 * Atomically bumps today's traffic counter for a station by `amount`
 * (default 1) and returns the new total. Call this once per newly
 * *occupied* charger slot detected in a poll, not once per poll.
 */
export async function bumpStationTraffic(stationId, amount = 1) {
  const { data, error } = await supabase.rpc('bump_station_daily_traffic', {
    p_station_id: stationId,
    p_amount: amount,
  })

  if (error) throw error
  return data
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
