import { METRES_PER_PX, PITCH_PER_PX, TAP_MS, takeStep, toNdc, TouchWalk } from './touchWalk'

const at = (id: number, x: number, y: number, t = 0) => ({ id, x, y, t })

test('a quick still touch is a tap at that point, and walks nowhere', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 200))
  const m = tw.move(at(1, 104, 203, 50))
  expect(m.forward).toBe(0)
  expect(m.strafe).toBe(0)
  expect(tw.up(at(1, 104, 203, 120)).tap).toEqual({ x: 104, y: 203 })
})

test('a touch held too long is not a tap', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 200))
  expect(tw.up(at(1, 100, 200, TAP_MS + 1)).tap).toBe(null)
})

test('dragging the floor down walks forward; sideways steps the other way', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.move(at(1, 100, 120)) // past the tap slop: now a drag
  const down = tw.move(at(1, 100, 170))
  expect(down.forward).toBeCloseTo(50 * METRES_PER_PX)
  expect(down.strafe).toBe(0)
  const right = tw.move(at(1, 130, 170))
  expect(right.strafe).toBeCloseTo(-30 * METRES_PER_PX)
  expect(tw.up(at(1, 130, 170, 100)).tap).toBe(null)
})

test('a drag that comes back to where it started is still not a tap', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.move(at(1, 100, 160))
  tw.move(at(1, 100, 100))
  expect(tw.up(at(1, 100, 100, 100)).tap).toBe(null)
})

test('two fingers twisted clockwise turn right; anticlockwise turn left', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.down(at(2, 200, 100))
  // Finger 2 swings down around finger 1: clockwise on screen.
  const cw = tw.move(at(2, 100 + 100 * Math.cos(0.3), 100 + 100 * Math.sin(0.3)))
  expect(cw.yaw).toBeCloseTo(-0.3)
  expect(cw.forward).toBe(0)
  const ccw = tw.move(at(2, 200, 100))
  expect(ccw.yaw).toBeCloseTo(0.3)
})

test('a twist across the ±π seam is a small turn, not a full one', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.down(at(2, 0, 101)) // just below the left: angle from 2 to 1 is about -0.01
  const m = tw.move(at(2, 0, 99))
  expect(Math.abs(m.yaw)).toBeLessThan(0.05)
})

test('two fingers sliding down together look up, and neither finger taps', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.down(at(2, 200, 100))
  const a = tw.move(at(1, 100, 140))
  const b = tw.move(at(2, 200, 140))
  expect(a.pitch + b.pitch).toBeCloseTo(40 * PITCH_PER_PX)
  expect(a.yaw + b.yaw).toBeCloseTo(0)
  expect(tw.up(at(1, 100, 140, 50)).tap).toBe(null)
  expect(tw.up(at(2, 200, 140, 50)).tap).toBe(null)
})

test('a second finger landing during a tap cancels the tap', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.down(at(2, 200, 100))
  tw.up(at(2, 200, 100, 30))
  expect(tw.up(at(1, 100, 100, 60)).tap).toBe(null)
})

test('lifting one of two fingers leaves the other dragging from where it is', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.down(at(2, 200, 100))
  tw.move(at(1, 100, 130))
  tw.up(at(2, 200, 100))
  const m = tw.move(at(1, 100, 150))
  expect(m.forward).toBeCloseTo(20 * METRES_PER_PX)
  expect(m.yaw).toBe(0)
})

test('a cancelled touch is forgotten without tapping', () => {
  const tw = new TouchWalk()
  tw.down(at(1, 100, 100))
  tw.cancel(1)
  expect(tw.count).toBe(0)
  expect(tw.up(at(1, 100, 100, 10)).tap).toBe(null)
  expect(tw.move(at(1, 100, 200)).forward).toBe(0)
})

test('takeStep hands out a long drag a run-length at a time', () => {
  const { step, rest } = takeStep({ forward: 3, strafe: 4 }, 1)
  expect(step.forward).toBeCloseTo(0.6)
  expect(step.strafe).toBeCloseTo(0.8)
  expect(rest.forward).toBeCloseTo(2.4)
  expect(rest.strafe).toBeCloseTo(3.2)
  expect(takeStep({ forward: 0.2, strafe: 0 }, 1)).toEqual({ step: { forward: 0.2, strafe: 0 }, rest: { forward: 0, strafe: 0 } })
})

test('toNdc maps the element corners and centre', () => {
  const r = { left: 10, top: 20, width: 200, height: 100 }
  expect(toNdc(10, 20, r)).toEqual({ x: -1, y: 1 })
  expect(toNdc(110, 70, r)).toEqual({ x: 0, y: 0 })
  expect(toNdc(210, 120, r)).toEqual({ x: 1, y: -1 })
})
