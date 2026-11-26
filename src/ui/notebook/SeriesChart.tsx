import { useId, useState } from 'react'
import { formatElapsed, type Series } from '../../core'

const W = 320
const H = 140
const PAD = { l: 40, r: 12, t: 10, b: 24 }

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) return [min]
  const step0 = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0)!
  const out = []
  for (let v = Math.floor(min / step) * step; v < max + step - 1e-9; v += step) out.push(+v.toFixed(10))
  return out
}

/** One measured quantity over session time. Line + markers, hover (or tap) readout, table toggle. */
export function SeriesChart({ series }: { series: Series }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const titleId = useId()
  const pts = series.points
  const unit = series.unit ? ` ${series.unit}` : ''
  const name = `${series.quantity[0].toUpperCase()}${series.quantity.slice(1)}`
  const title = series.unit ? `${name} (${series.unit})` : name

  const vals = pts.map((p) => p.value)
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (lo === hi) [lo, hi] = [lo - 1, hi + 1]
  const yt = niceTicks(lo, hi)
  lo = Math.min(lo, yt[0])
  hi = Math.max(hi, yt.at(-1)!)
  const tMax = Math.max(pts.at(-1)!.t, 1)
  const x = (t: number) => PAD.l + (t / tMax) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - ((v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${y(p.value)}`).join('')

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * W
    let best = 0
    pts.forEach((p, i) => {
      if (Math.abs(x(p.t) - sx) < Math.abs(x(pts[best].t) - sx)) best = i
    })
    setHover(best)
  }
  const h = hover === null ? null : pts[hover]

  return (
    <figure className="series" aria-labelledby={titleId}>
      <figcaption>
        <span id={titleId}>
          {title} <span className="muted">· {series.instrument}</span>
        </span>
        <button className="link" onClick={() => setTable((v) => !v)}>
          {table ? 'Chart' : 'Table'}
        </button>
      </figcaption>
      {table ? (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>
                {series.quantity}
                {series.unit && ` (${series.unit})`}
              </th>
            </tr>
          </thead>
          <tbody>
            {pts.map((p, i) => (
              <tr key={i}>
                <td>{formatElapsed(p.t)}</td>
                <td>{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}, ${series.instrument}: ${pts.length} readings`}>
            {yt.map((v) => (
              <g key={v}>
                <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
                <text className="tick" x={PAD.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
                  {v}
                </text>
              </g>
            ))}
            <text className="tick" x={PAD.l} y={H - 6}>00:00</text>
            <text className="tick" x={W - PAD.r} y={H - 6} textAnchor="end">{formatElapsed(tMax)}</text>
            {h && <line className="crosshair" x1={x(h.t)} x2={x(h.t)} y1={PAD.t} y2={H - PAD.b} />}
            <path className="line" d={path} />
            {pts.map((p, i) => (
              <circle key={i} className="dot" cx={x(p.t)} cy={y(p.value)} r={i === hover ? 5 : 4} />
            ))}
            {/* A mouse reads by hovering; a finger reads by tapping (or sliding), and the reading stays until the next tap. */}
            <rect x={PAD.l} y={0} width={W - PAD.l - PAD.r} height={H} fill="transparent"
              onPointerDown={onMove} onPointerMove={onMove} onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)} />
          </svg>
          {h && (
            <div className="tip" style={{ left: `${(x(h.t) / W) * 100}%` }}>
              <b>{h.value}{unit}</b> at {formatElapsed(h.t)}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
