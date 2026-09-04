import { useEffect, useRef, useState } from 'react'

/**
 * Draws charger/queue ROI boxes over a still frame. Mirrors
 * cv-service/calibration_tool.html's interaction model (pick a mode,
 * click-drag a box, edit the label, remove) but keeps everything in
 * fractions of the frame's natural size instead of raw pixels, and
 * hands the result back to the caller instead of a copy-paste JSON
 * blob — see stations.js: saveStationCalibration.
 *
 * `initialChargerRois` / `initialQueueRois` are fractions (0..1), same
 * shape stored in the DB — pass the station's existing calibration in
 * to let an operator re-calibrate instead of starting from scratch.
 */
export default function StationCalibrator({
  frameSrc,
  totalChargers,
  initialChargerRois = [],
  initialQueueRois = [],
  onSave,
  onCancel,
}) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [naturalSize, setNaturalSize] = useState(null)
  const [scale, setScale] = useState(1)
  const [mode, setMode] = useState('charger')
  const [rois, setRois] = useState([])
  const [drawing, setDrawing] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const [dragCurrent, setDragCurrent] = useState(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      const maxW = Math.min(window.innerWidth - 120, 900)
      const s = Math.min(1, maxW / img.naturalWidth)
      setScale(s)
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })

      const toPixelRois = (fractionRois, kind) =>
        fractionRois.map((r, i) => ({
          label: r.slot_label || (kind === 'queue' ? `Queue ${i + 1}` : `Charger ${String(i + 1).padStart(2, '0')}`),
          kind,
          x1: Math.round(r.x1 * img.naturalWidth),
          y1: Math.round(r.y1 * img.naturalHeight),
          x2: Math.round(r.x2 * img.naturalWidth),
          y2: Math.round(r.y2 * img.naturalHeight),
        }))

      setRois([
        ...toPixelRois(initialChargerRois, 'charger'),
        ...toPixelRois(initialQueueRois, 'queue'),
      ])
    }
    img.src = frameSrc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameSrc])

  useEffect(() => {
    render()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rois, dragCurrent, naturalSize, scale])

  function render() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !naturalSize) return
    canvas.width = naturalSize.width * scale
    canvas.height = naturalSize.height * scale
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    rois.forEach((r) => {
      ctx.strokeStyle = r.kind === 'queue' ? '#f59e0b' : '#10b981'
      ctx.lineWidth = 2
      ctx.strokeRect(r.x1 * scale, r.y1 * scale, (r.x2 - r.x1) * scale, (r.y2 - r.y1) * scale)
      ctx.fillStyle = r.kind === 'queue' ? '#f59e0b' : '#10b981'
      ctx.font = '13px system-ui'
      ctx.fillText(r.label, r.x1 * scale + 4, r.y1 * scale + 16)
    })

    if (drawing && dragCurrent) {
      const { x: startX, y: startY } = dragStart.current
      ctx.strokeStyle = mode === 'queue' ? '#fbbf24' : '#34d399'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(
        startX * scale,
        startY * scale,
        (dragCurrent.x - startX) * scale,
        (dragCurrent.y - startY) * scale,
      )
      ctx.setLineDash([])
    }
  }

  function canvasPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    }
  }

  function handleMouseDown(e) {
    if (!naturalSize) return
    dragStart.current = canvasPoint(e)
    setDrawing(true)
  }

  function handleMouseMove(e) {
    if (!drawing) return
    setDragCurrent(canvasPoint(e))
  }

  function handleMouseUp(e) {
    if (!drawing) return
    setDrawing(false)
    const end = canvasPoint(e)
    const { x: startX, y: startY } = dragStart.current

    const x1 = Math.round(Math.min(startX, end.x))
    const y1 = Math.round(Math.min(startY, end.y))
    const x2 = Math.round(Math.max(startX, end.x))
    const y2 = Math.round(Math.max(startY, end.y))
    setDragCurrent(null)

    if (x2 - x1 < 5 || y2 - y1 < 5) return // ignore accidental clicks

    setRois((prev) => {
      const sameKindCount = prev.filter((r) => r.kind === mode).length
      const label =
        mode === 'queue'
          ? sameKindCount === 0
            ? 'Queue'
            : `Queue ${sameKindCount + 1}`
          : `Charger ${String(sameKindCount + 1).padStart(2, '0')}`
      return [...prev, { label, kind: mode, x1, y1, x2, y2 }]
    })
  }

  function updateLabel(index, label) {
    setRois((prev) => prev.map((r, i) => (i === index ? { ...r, label } : r)))
  }

  function removeRoi(index) {
    setRois((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    if (!naturalSize) return
    const toFractionShape = (kind) =>
      rois
        .filter((r) => r.kind === kind)
        .map((r) => ({
          slot_label: r.label,
          x1: r.x1 / naturalSize.width,
          y1: r.y1 / naturalSize.height,
          x2: r.x2 / naturalSize.width,
          y2: r.y2 / naturalSize.height,
        }))

    onSave({
      chargerRois: toFractionShape('charger'),
      queueRois: toFractionShape('queue'),
      frameWidth: naturalSize.width,
      frameHeight: naturalSize.height,
    })
  }

  const chargerCount = rois.filter((r) => r.kind === 'charger').length
  const queueCount = rois.filter((r) => r.kind === 'queue').length

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Calibrate charger & queue boxes</h2>
            <p className="mt-1 text-sm text-slate-400">
              Draw one box per charging bay (you have {totalChargers} chargers), then switch to Queue
              mode and box the waiting area. Boxes never need to touch.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-slate-700 p-1">
            <button
              type="button"
              onClick={() => setMode('charger')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                mode === 'charger' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Charger
            </button>
            <button
              type="button"
              onClick={() => setMode('queue')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                mode === 'queue' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Queue
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-6">
          <div className="overflow-hidden rounded-2xl border border-slate-700">
            {!naturalSize ? (
              <div className="flex h-64 w-96 items-center justify-center text-sm text-slate-500">
                Loading frame…
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setDrawing(false)}
              />
            )}
          </div>

          <div className="min-w-[260px] flex-1 space-y-4">
            <p className="text-sm text-slate-400">
              {chargerCount} charger box{chargerCount === 1 ? '' : 'es'} · {queueCount} queue box
              {queueCount === 1 ? '' : 'es'}
            </p>
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {rois.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2"
                >
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      r.kind === 'queue' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {r.kind}
                  </span>
                  <input
                    value={r.label}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeRoi(i)}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {rois.length === 0 && (
                <li className="rounded-xl border border-dashed border-slate-700 px-3 py-4 text-center text-sm text-slate-500">
                  No boxes yet — click and drag on the frame.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={chargerCount === 0}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save calibration
          </button>
        </div>
      </div>
    </div>
  )
}
