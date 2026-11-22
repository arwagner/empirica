/** Small, pure mechanics helpers shared by every rig. SI units throughout. */

export type Vec = number[]

/**
 * One classic 4th-order Runge–Kutta step for dy/dt = f(t, y).
 * Accurate enough at 1 ms that pendulums keep their energy for minutes.
 */
export function rk4(f: (t: number, y: Vec) => Vec, t: number, y: Vec, dt: number): Vec {
  const k1 = f(t, y)
  const k2 = f(t + dt / 2, y.map((v, i) => v + (dt / 2) * k1[i]))
  const k3 = f(t + dt / 2, y.map((v, i) => v + (dt / 2) * k2[i]))
  const k4 = f(t + dt, y.map((v, i) => v + dt * k3[i]))
  return y.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
}

/** Quadratic drag force magnitude, ½ρC_dAv², signed to oppose velocity v. */
export const drag = (v: number, rho: number, cdA: number) => -0.5 * rho * cdA * v * Math.abs(v)

/** Speed at which drag balances weight: √(2mg / ρC_dA). Infinite in a vacuum. */
export const terminalVelocity = (m: number, g: number, rho: number, cdA: number) =>
  rho * cdA > 0 ? Math.sqrt((2 * m * g) / (rho * cdA)) : Infinity

/**
 * Kinetic friction (Coulomb): opposes motion with μN. When (nearly) stopped, static friction
 * holds the body as long as the other forces don't exceed μN.
 * Returns the friction force given the net non-friction force and current velocity.
 */
export function friction(v: number, applied: number, mu: number, normal: number, eps = 1e-6): number {
  const max = mu * Math.abs(normal)
  if (Math.abs(v) > eps) return -Math.sign(v) * max
  return Math.abs(applied) <= max ? -applied : -Math.sign(applied) * max
}

/**
 * When did a quantity cross a threshold during one step? Linear interpolation between samples,
 * so light-gate times are accurate to far better than the step size.
 */
export function crossing(t0: number, a0: number, t1: number, a1: number, level: number): number | null {
  if ((a0 - level) * (a1 - level) > 0 || a0 === a1) return null
  if (a0 === level) return null // counted on the previous step
  return t0 + ((level - a0) / (a1 - a0)) * (t1 - t0)
}

export const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp
