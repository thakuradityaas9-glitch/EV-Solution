const OCM_BASE = 'https://api.openchargemap.io/v3/poi/'
const KEY = import.meta.env.VITE_OPENCHARGEMAP_API_KEY

export async function fetchOCMStations({
  lat,
  lng,
  distanceKm = 25,
  maxResults = 50,
}) {
  const url = new URL(OCM_BASE)

  url.searchParams.set('output', 'json')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lng)
  url.searchParams.set('distance', distanceKm)
  url.searchParams.set('distanceunit', 'KM')
  url.searchParams.set('maxresults', maxResults)
  url.searchParams.set('compact', 'true')
  url.searchParams.set('verbose', 'false')

  if (KEY) {
    url.searchParams.set('key', KEY)
  }

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Open Charge Map request failed')
  }

  const data = await res.json()

  return data.map(mapOCMPoi)
}

function mapOCMPoi(poi) {
  const conn = poi.Connections?.[0] || {}

  return {
    id: `ocm-${poi.ID}`,
    name: poi.AddressInfo?.Title || 'Charging Station',

    type: 'Fast Charging Hub',
    stationType: 'commercial',
    verification: 'verified',

    latitude: poi.AddressInfo?.Latitude,
    longitude: poi.AddressInfo?.Longitude,

    address: [
      poi.AddressInfo?.AddressLine1,
      poi.AddressInfo?.Town,
    ]
      .filter(Boolean)
      .join(', '),

    openingHours:
      poi.AddressInfo?.AccessComments || 'Hours not listed',

    totalChargers: poi.NumberOfPoints || 1,

    speedKW: conn.PowerKW || 0,

    connectorType:
      conn.ConnectionType?.Title || 'Unknown',

    pricePerKwh: null,

    amenities: [],

    rating: 0,
    reviews: 0,

    cctvEnabled: false,

    liveAvailableChargers: null,
    livePredictedWaitMin: null,
    liveQueueLength: null,
    liveUpdatedAt: null,

    source: 'openchargemap',
  }
}