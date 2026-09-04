import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { CV_POLL_INTERVAL_MS, CV_SERVICE_URL } from '../../lib/config.js'
import {
  bumpStationTraffic,
  fetchStationById,
  fetchStationTrafficToday,
  saveStationCalibration,
  uploadStationFootage,
} from '../../services/stations.js'
import StationCalibrator from '../../components/operator/StationCalibrator.jsx'

function fractionRoisToPixels(rois, width, height) {
  return rois.map((r) => ({
    slot_label: r.slot_label,
    x1: Math.round(r.x1 * width),
    y1: Math.round(r.y1 * height),
    x2: Math.round(r.x2 * width),
    y2: Math.round(r.y2 * height),
  }))
}

function captureVideoFrameDataUrl(video) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.9)
}

function captureVideoFrameBlob(video) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
  })
}

export default function StationDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [station, setStation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [calibrationFrame, setCalibrationFrame] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [pollError, setPollError] = useState(null)
  const [telemetry, setTelemetry] = useState(null) // { slots, occupiedCount, availableCount, queueLength, predictedWaitMin, updatedAt }
  const [carsToday, setCarsToday] = useState(0)

  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const prevOccupiedRef = useRef({}) // slot_label -> bool, across polls

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStationById(id)
      setStation(data)
      const today = await fetchStationTrafficToday(id).catch(() => 0)
      setCarsToday(today)
    } catch (err) {
      setError(err?.message || 'Unable to load this station.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const isOwner = station && user && station.ownerId === user.id

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const updated = await uploadStationFootage(id, file)
      setStation(updated)
    } catch (err) {
      setError(err?.message || 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function openCalibrator() {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      setError('Wait for the footage to load before calibrating.')
      return
    }
    setCalibrationFrame(captureVideoFrameDataUrl(video))
    setCalibrating(true)
  }

  async function handleCalibrationSave({ chargerRois, queueRois, frameWidth, frameHeight }) {
    try {
      const updated = await saveStationCalibration(id, { chargerRois, queueRois, frameWidth, frameHeight })
      setStation(updated)
      setCalibrating(false)
      prevOccupiedRef.current = {}
      setTelemetry(null)
    } catch (err) {
      setError(err?.message || 'Could not save calibration.')
    }
  }

  const pollOnce = useCallback(async () => {
    const video = videoRef.current
    if (!video || !station?.chargerRois?.length) return

    try {
      const blob = await captureVideoFrameBlob(video)
      if (!blob) return

      const chargerRoisPx = fractionRoisToPixels(station.chargerRois, video.videoWidth, video.videoHeight)
      const queueRoisPx = fractionRoisToPixels(station.queueRois || [], video.videoWidth, video.videoHeight)

      const form = new FormData()
      form.append('file', blob, 'frame.jpg')
      form.append('station_id', station.id)
      form.append('total_chargers', String(station.totalChargers))
      form.append('charger_rois', JSON.stringify(chargerRoisPx))
      form.append('queue_rois', JSON.stringify(queueRoisPx))
      form.append('persist', 'true')

      const res = await fetch(`${CV_SERVICE_URL}/analyze/frame`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`cv-service responded ${res.status}`)
      const result = await res.json()

      const prevOccupied = prevOccupiedRef.current
      let newlyOccupied = 0
      const nextOccupied = {}
      for (const slot of result.slots || []) {
        nextOccupied[slot.slot_label] = slot.occupied
        if (slot.occupied && !prevOccupied[slot.slot_label]) newlyOccupied += 1
      }
      prevOccupiedRef.current = nextOccupied

      setTelemetry({
        slots: result.slots || [],
        occupiedCount: result.occupied_count,
        availableCount: result.available_count,
        queueLength: result.queue_length,
        predictedWaitMin: result.predicted_wait_min,
        updatedAt: new Date().toISOString(),
      })
      setPollError(null)

      if (newlyOccupied > 0) {
        bumpStationTraffic(station.id, newlyOccupied)
          .then((total) => setCarsToday(total))
          .catch(() => {})
      }
    } catch (err) {
      setPollError(err?.message || 'Frame analysis failed.')
    }
  }, [station])

  function startMonitoring() {
    const video = videoRef.current
    if (video) {
      video.muted = true
      video.play().catch(() => {})
    }
    setMonitoring(true)
    pollOnce()
    pollIntervalRef.current = setInterval(pollOnce, CV_POLL_INTERVAL_MS)
  }

  function stopMonitoring() {
    setMonitoring(false)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-950 px-6 py-10">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-10 w-72 rounded-full bg-slate-800" />
          <div className="h-80 rounded-3xl bg-slate-900" />
        </div>
      </section>
    )
  }

  if (error && !station) {
    return (
      <section className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-800 bg-rose-950/40 p-8">
          <h2 className="text-xl font-semibold text-rose-300">Couldn't load this station</h2>
          <p className="mt-2 text-slate-300">{error}</p>
          <Link to="/operator/chargers" className="mt-6 inline-block text-sm font-semibold text-cyan-400">
            ← Back to My Stations
          </Link>
        </div>
      </section>
    )
  }

  const isCalibrated = station.chargerRois?.length > 0
  const hasFootage = Boolean(station.cctvVideoUrl)

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <Link to="/operator/chargers" className="text-sm font-semibold text-cyan-400">
            ← Back to My Stations
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">{station.name}</h1>
              <p className="mt-1 text-slate-400">{station.address || `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`}</p>
            </div>
            <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
              <span className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-300">
                {station.totalChargers} chargers
              </span>
              <span
                className={`rounded-full px-3 py-1.5 ${
                  isCalibrated ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isCalibrated ? 'Calibrated' : 'Not calibrated'}
              </span>
            </div>
          </div>
        </div>

        {!isOwner && (
          <div className="rounded-2xl border border-amber-800 bg-amber-950/30 px-5 py-3 text-sm text-amber-200">
            You're viewing a station you don't own — uploads and calibration are disabled.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/30 px-5 py-3 text-sm text-rose-200">{error}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Footage panel */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Live footage</p>
              {hasFootage && isOwner && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  Replace clip
                </button>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-black">
              {hasFootage ? (
                <video
                  ref={videoRef}
                  src={station.cctvVideoUrl}
                  crossOrigin="anonymous"
                  loop
                  playsInline
                  className="aspect-video w-full object-contain"
                />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-slate-500">
                  <p className="text-sm">No footage uploaded yet</p>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {uploading ? 'Uploading…' : 'Upload CCTV clip'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {isOwner && (
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleUpload}
                className="hidden"
              />
            )}

            {hasFootage && isOwner && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openCalibrator}
                  className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  {isCalibrated ? 'Re-calibrate boxes' : 'Calibrate boxes'}
                </button>

                {isCalibrated && (
                  <button
                    type="button"
                    onClick={monitoring ? stopMonitoring : startMonitoring}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                      monitoring
                        ? 'bg-rose-600 text-white hover:bg-rose-500'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {monitoring ? 'Stop monitoring' : 'Start monitoring'}
                  </button>
                )}

                {!isCalibrated && (
                  <p className="text-xs text-slate-500">Calibrate charger &amp; queue boxes before monitoring.</p>
                )}
              </div>
            )}

            {monitoring && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Polling every {Math.round(CV_POLL_INTERVAL_MS / 1000)}s
                {pollError && <span className="text-rose-400">— {pollError}</span>}
              </div>
            )}
          </div>

          {/* Stats panel */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Right now</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Charging now</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {telemetry ? telemetry.occupiedCount : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Available</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {telemetry ? telemetry.availableCount : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">In queue</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {telemetry ? telemetry.queueLength : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Predicted wait</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {telemetry ? `${telemetry.predictedWaitMin}m` : '—'}
                  </p>
                </div>
              </div>
              {telemetry && (
                <p className="mt-3 text-xs text-slate-500">
                  Last updated {new Date(telemetry.updatedAt).toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Today</p>
              <p className="mt-4 text-4xl font-semibold">{carsToday}</p>
              <p className="mt-1 text-sm text-slate-500">cars seen at this station today</p>
            </div>

            {telemetry?.slots?.length > 0 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Per-bay status</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {telemetry.slots.map((s) => (
                    <div
                      key={s.slot_label}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                        s.occupied
                          ? 'border-rose-800 bg-rose-950/40 text-rose-300'
                          : 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                      }`}
                    >
                      {s.slot_label}
                      <span className="ml-2 font-normal opacity-70">{s.occupied ? 'occupied' : 'free'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {calibrating && (
        <StationCalibrator
          frameSrc={calibrationFrame}
          totalChargers={station.totalChargers}
          initialChargerRois={station.chargerRois}
          initialQueueRois={station.queueRois}
          onSave={handleCalibrationSave}
          onCancel={() => setCalibrating(false)}
        />
      )}
    </section>
  )
}
