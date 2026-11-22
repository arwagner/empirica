import { useEffect, useRef, useState } from 'react'

/**
 * Runs the lab clock in real time (scaled by `speed`) while `playing`, by calling `tick(seconds)`
 * every animation frame. `tick` returns false to stop (e.g. everything came to rest).
 */
export function usePlayback(tick: (seconds: number) => boolean) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const tickRef = useRef(tick)
  useEffect(() => {
    tickRef.current = tick
  })
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const real = Math.min(0.05, (now - last) / 1000)
      last = now
      if (tickRef.current(real * speed) === false) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed])
  return { playing, setPlaying, speed, setSpeed }
}
