/** An invisible, finger-sized grab area around a draggable part of an SVG drawing. Nothing when `r` is 0 (see `useHitRadius`). */
export function HitArea({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return r > 0 ? <circle cx={cx} cy={cy} r={r} fill="transparent" className="hit" /> : null
}
