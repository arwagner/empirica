import { Preload } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'
import { Player, type Mode } from './Player'
import type { Building, Interactable, Spawn } from './types'
import './world.css'

/** Dev aid: ?peek hides the entry card; ?peek=wet-bench opens that station. */
const peek = new URLSearchParams(location.search).get('peek')
// Browsers reject pointer lock without a qualifying gesture (Esc doesn't count); that's expected.
const lock = () => Promise.resolve(document.querySelector('canvas')?.requestPointerLock()).catch(() => {})

export interface LabWorldHandle {
  /** Fly into a station from wherever the player is (e.g. chosen from a menu). */
  enter(stationId: string): void
}

interface Props {
  building: Building
  /** The 2D workspace for a station. Rendered once the fly-in reaches it. */
  renderStation: (station: Interactable, leave: () => void) => ReactNode
  /** True while something (a menu) covers the world: releases the mouse and blocks input. */
  suspended?: boolean
  ref?: Ref<LabWorldHandle>
}

/** The walkable 3D lab with fly-in to 2D station workspaces. */
export function LabWorld({ building, renderStation, suspended = false, ref }: Props) {
  // Dev aid: ?room=<id> starts in that room.
  const [roomId, setRoomId] = useState(() => {
    const r = new URLSearchParams(location.search).get('room')
    return building.rooms.some((x) => x.id === r) ? r! : building.start
  })
  const [arrival, setArrival] = useState<Spawn | undefined>(undefined)
  const [fading, setFading] = useState(false)
  const room = building.rooms.find((r) => r.id === roomId) ?? building.rooms[0]
  const roomOf = (stationId: string) => building.rooms.find((r) => r.interactables.some((i) => i.id === stationId))
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(location.search).has('walk') ? 'walking' : peek === null ? 'start' : peek ? 'flyingIn' : 'paused'))
  const [focusId, setFocusId] = useState<string | null>(null)
  const [stationId, setStationId] = useState<string | null>(peek || null)
  const [toast, setToast] = useState<string | null>(null)
  const modeRef = useRef(mode)
  /** Update ref and state together, so DOM event handlers never see a stale mode. */
  const go = useCallback((m: Mode) => {
    modeRef.current = m
    setMode(m)
  }, [])
  const suspendedRef = useRef(suspended)

  useEffect(() => {
    suspendedRef.current = suspended
    const m = modeRef.current
    if (suspended && ['start', 'walking', 'paused', 'ready'].includes(m)) {
      go('suspended')
      if (document.pointerLockElement) document.exitPointerLock()
    }
    if (!suspended && m === 'suspended') go('ready')
  }, [suspended, go])

  useEffect(() => {
    const onChange = () => {
      const locked = !!document.pointerLockElement
      if (locked && ['start', 'paused', 'ready'].includes(modeRef.current)) go('walking')
      if (!locked && modeRef.current === 'walking') go('paused')
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [go])

  const leave = useCallback(() => {
    if (modeRef.current !== 'station') return
    go('flyingOut')
    lock()
  }, [go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // E exits with the mouse recaptured (a key press is a valid gesture); Esc can't recapture.
      if (suspendedRef.current) return
      if ((e.code === 'Escape' || e.code === 'KeyE') && !e.repeat && modeRef.current === 'station') leave()
      // After an Esc exit, the first non-Esc key recaptures the mouse so you just keep walking.
      else if (e.code !== 'Escape' && modeRef.current === 'ready') lock()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [leave])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const onActivate = useCallback((id: string) => {
    const it = room.interactables.find((i) => i.id === id)!
    if (it.comingSoon) {
      setToast(`${it.name}: coming soon. ${it.blurb}`)
      return
    }
    if (it.kind === 'door') {
      if (!it.leadsTo) {
        setToast(`${it.name} is locked. ${it.blurb}`)
        return
      }
      // Fade out, swap rooms, fade in. The mouse stays captured so you keep walking.
      const to = it.leadsTo
      setFading(true)
      setFocusId(null)
      setTimeout(() => {
        setArrival(to.spawn)
        setRoomId(to.room)
        setFading(false)
      }, 280)
      return
    }
    setStationId(id)
    setFocusId(null)
    go('flyingIn')
    document.exitPointerLock()
  }, [go, room.interactables])

  useImperativeHandle(ref, () => ({
    enter(id: string) {
      const target = roomOf(id)
      const it = target?.interactables.find((i) => i.id === id)
      if (!target || !it || it.kind !== 'station' || it.comingSoon) return
      if (target.id !== room.id) {
        setArrival(undefined)
        setRoomId(target.id)
      }
      setStationId(id)
      setFocusId(null)
      go('flyingIn')
      if (document.pointerLockElement) document.exitPointerLock()
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [go, room, building])

  const onReveal = useCallback(() => {
    if (modeRef.current === 'flyingIn') go('station')
  }, [go])

  const onArrived = useCallback(() => {
    if (modeRef.current === 'flyingIn') go('station')
    if (modeRef.current === 'flyingOut') {
      setStationId(null)
      go(document.pointerLockElement ? 'walking' : 'ready')
    }
  }, [go])

  // Dev aid: ?autouse=<id> presses E on that interactable a moment after load.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('autouse')
    if (!id) return
    const t = setTimeout(() => onActivate(id), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focused = room.interactables.find((i) => i.id === focusId)
  const station = room.interactables.find((i) => i.id === stationId)

  return (
    <div className="world">
      <Canvas style={{ position: 'absolute', inset: 0 }} shadows dpr={[1, 2]} camera={{ fov: 70, near: 0.05, far: 60 }}>
        <color attach="background" args={['#efe8da']} />
        <fog attach="fog" args={['#efe8da', 16, 40]} />
        {/* Every room stays mounted (only the current one visible) and is compiled up front,
            so walking through a door never stalls on shader compilation. */}
        {building.rooms.map((r) => (
          <group key={r.id} visible={r.id === room.id}>
            <r.Scene />
          </group>
        ))}
        <Preload all />
        <Player key={room.id} room={room} spawn={arrival} mode={mode} stationId={stationId} onFocus={setFocusId} onActivate={onActivate} onArrived={onArrived} onReveal={onReveal} />
      </Canvas>

      {mode === 'walking' && <div className={`crosshair ${focused ? 'on' : ''}`} />}
      {mode === 'walking' && focused && (
        <div className="prompt">
          <kbd>E</kbd> {focused.kind === 'door' ? 'Open' : 'Use'} <b>{focused.name}</b>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      <div className={`fade ${fading ? 'on' : ''}`} aria-hidden="true" />
      {mode === 'ready' && (
        <div className="ready" onClick={lock}>
          <div className="prompt">
            <kbd>Click</kbd> or move to look around
          </div>
        </div>
      )}

      {(mode === 'start' || (mode === 'paused' && peek === null)) && (
        <div className="veil" onClick={lock}>
          <div className="card">
            <h1>Empirica</h1>
            <p className="sub">{mode === 'start' ? room.name : 'Paused'}</p>
            <p>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> move · <kbd>Mouse</kbd> look · <kbd>Shift</kbd> run · <kbd>E</kbd> / <kbd>Click</kbd> use station ·{' '}
              <kbd>M</kbd> menu · <kbd>N</kbd> notebook · <kbd>Esc</kbd> release mouse
            </p>
            <button>{mode === 'start' ? 'Click to enter the lab' : 'Click to resume'}</button>
          </div>
        </div>
      )}

      {station && (
        <div className={`station ${mode === 'station' ? 'shown' : ''}`}>
          {/* oxlint-disable-next-line react/refs -- leave() only reads refs when invoked, never during render */}
          {renderStation(station, leave)}
        </div>
      )}
    </div>
  )
}
