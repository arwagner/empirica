import { useId } from 'react'
import { solutionColor, visibleSolid } from '../appearance'
import type { Vessel } from '../engine'
import { VESSEL_KINDS, volumeMl } from '../engine'
import { SPECIES } from '../species'
import type { VesselKind } from '../schemas'

/** Geometry per vessel kind in a 120×180 box; the liquid fills the interior from `bottom` up to `top`. */
const SHAPES: Record<VesselKind, { outline: string; interior: string; top: number; bottom: number; left: number; right: number }> = {
  'beaker-250': { outline: 'M14 22 H22 V150 Q22 162 34 162 H86 Q98 162 98 150 V22 H104', interior: 'M24 24 V150 Q24 160 34 160 H86 Q96 160 96 150 V24 Z', top: 40, bottom: 160, left: 26, right: 94 },
  'beaker-100': { outline: 'M28 70 H34 V152 Q34 162 44 162 H76 Q86 162 86 152 V70 H92', interior: 'M36 72 V152 Q36 160 44 160 H76 Q84 160 84 152 V72 Z', top: 84, bottom: 160, left: 38, right: 82 },
  'flask-250': { outline: 'M50 14 H48 M50 14 V62 L16 150 Q12 162 26 162 H94 Q108 162 104 150 L70 62 V14 M70 14 H72', interior: 'M52 16 V63 L18 151 Q15 160 26 160 H94 Q105 160 102 151 L68 63 V16 Z', top: 70, bottom: 160, left: 24, right: 96 },
  'test-tube': { outline: 'M46 16 H50 V146 A10 10 0 0 0 70 146 V16 H74', interior: 'M52 18 V146 A8 8 0 0 0 68 146 V18 Z', top: 30, bottom: 154, left: 53, right: 67 },
  'boiling-tube': { outline: 'M40 16 H44 V142 A16 16 0 0 0 76 142 V16 H80', interior: 'M46 18 V142 A14 14 0 0 0 74 142 V18 Z', top: 30, bottom: 156, left: 48, right: 72 },
  calorimeter: { outline: 'M18 40 H102 L90 162 H30 Z', interior: 'M22 44 H98 L87 158 H33 Z', top: 54, bottom: 158, left: 35, right: 85 },
  crucible: { outline: 'M26 118 H94 L84 160 Q82 164 76 164 H44 Q38 164 36 160 Z', interior: 'M29 121 H91 L82 158 Q80 161 75 161 H45 Q40 161 38 158 Z', top: 124, bottom: 160, left: 41, right: 79 },
}

/** Deterministic scatter so particles don't jump around between renders. */
function scatter(seed: number, n: number) {
  const out: [number, number][] = []
  let s = seed * 9301 + 49297
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    const a = s / 233280
    s = (s * 9301 + 49297) % 233280
    out.push([a, s / 233280])
  }
  return out
}

interface Props {
  vessel: Vessel
  selected: boolean
  fizzing: boolean
  flame: string | null
  onSelect: () => void
}

export function Glassware({ vessel, selected, fizzing, flame, onSelect }: Props) {
  const clip = useId()
  const shape = SHAPES[vessel.kind]
  const cap = VESSEL_KINDS[vessel.kind].capacityMl
  const vol = volumeMl(vessel)
  const frac = Math.min(1, vol / cap)
  const level = shape.bottom - frac * (shape.bottom - shape.top)
  const col = solutionColor(vessel.contents)
  const solids = Object.entries(vessel.contents).filter(([id, n]) => SPECIES[id]?.phase === 's' && visibleSolid(n, vessel.contents))
  const wet = vol > 0.05
  const litres = Math.max(vol / 1000, 1e-6)
  const span = shape.right - shape.left
  const boiling = !!vessel.boiling
  const heat = Math.min(1, vessel.heaterW / 1000)
  const label = `${vessel.id}: ${vol >= 0.5 ? `${Math.round(vol)} mL` : solids.length ? 'solid' : 'empty'}, ${vessel.tempC.toFixed(0)} °C${col.name !== 'colorless' && vol > 0.5 ? `, ${col.name}` : ''}`

  return (
    <button className={`glassware ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected} aria-label={label} title={label}>
      <svg viewBox="0 0 120 190" aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <path d={shape.interior} />
          </clipPath>
        </defs>
        {flame && (
          <g className="flame">
            <path d="M60 4 C48 22 52 34 60 40 C68 34 72 22 60 4 Z" fill={flame} opacity="0.9" />
          </g>
        )}
        {boiling && (
          <g className="steam" fill="none" stroke="var(--glass-line)" strokeWidth="2" strokeLinecap="round">
            <path d="M48 20 q-6 -8 0 -14" />
            <path d="M60 18 q6 -8 0 -14" />
            <path d="M72 20 q-6 -8 0 -14" />
          </g>
        )}
        <g clipPath={`url(#${clip})`}>
          {wet && (
            <>
              <rect x="0" y={level} width="120" height={200} fill="var(--water)" opacity="0.7" />
              <rect x="0" y={level} width="120" height={200} fill={col.hex} opacity={col.alpha * 0.9} />
              <rect x="0" y={level} width="120" height="2" fill="#fff" opacity="0.35" />
            </>
          )}
          {solids.map(([id, n], k) => {
            const s = SPECIES[id]
            const hex = s.color?.hex ?? '#ddd'
            if (s.metal || !wet) {
              // pieces of metal, or a dry powder heap
              const count = Math.max(3, Math.min(40, Math.round(4 + Math.log10(n / 5e-6) * 6)))
              return scatter(k + id.length * 7, count).map(([a, b], i) => (
                <circle key={`${id}${i}`} cx={shape.left + 3 + a * (span - 6)} cy={shape.bottom - 3 - b * (s.metal ? 5 : 8)} r={s.metal ? 3.2 : 2.2}
                  fill={hex} stroke="#0003" strokeWidth="0.6" />
              ))
            }
            // a precipitate clouds the liquid and settles in a layer at the bottom
            const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
            const pale = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.8 // white/cream solids need more body to read as milky
            const cloud = Math.min(pale ? 0.9 : 0.75, Math.max(pale ? 0.6 : 0.2, (pale ? 0.5 : 0.25) + 0.12 * Math.log10(n / litres / 3e-4)))
            const band = Math.min(10, Math.max(2, 2 + Math.log10(n / 5e-6) * 2.5))
            return (
              <g key={id}>
                <rect x="0" y={level} width="120" height={200} fill={hex} opacity={cloud} />
                <rect x="0" y={shape.bottom - band - 1} width="120" height={band + 4} fill={hex} stroke={pale ? '#0005' : '#0002'} />
              </g>
            )
          })}
          {(fizzing || boiling) && wet &&
            scatter(vessel.id.length + 3, boiling ? 16 : 10).map(([a, b], i) => (
              <circle key={i} className="bubble" cx={shape.left + a * span} cy={shape.bottom - 4} r={1.5 + b * 2}
                style={{ animationDelay: `${(b * 1.2).toFixed(2)}s`, ['--rise' as string]: `${-(shape.bottom - level - 6)}px` }} />
            ))}
        </g>
        <path d={shape.outline} className="outline" fill={vessel.kind === 'calorimeter' ? 'var(--foam)' : 'none'} fillOpacity={vessel.kind === 'calorimeter' ? 0.55 : 0} />
        <rect x="14" y="170" width="92" height="8" rx="2" className="plate" style={{ fill: heat > 0 ? `rgb(${120 + heat * 135}, ${60 - heat * 30}, 40)` : undefined }} />
      </svg>
      <span className="name">{vessel.id}</span>
      <span className="sub">
        {vol >= 0.5 ? `${Math.round(vol)} mL` : solids.length ? 'solid' : 'empty'} · {vessel.tempC.toFixed(1)} °C
      </span>
    </button>
  )
}
