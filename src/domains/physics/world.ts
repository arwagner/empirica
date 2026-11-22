import { z } from 'zod'

/** Planet presets: surface gravity (m/s²) and air density (kg/m³). */
export const PLANETS = {
  earth: { name: 'Earth', g: 9.81, rho: 1.2 },
  moon: { name: 'the Moon', g: 1.62, rho: 0 },
  mars: { name: 'Mars', g: 3.71, rho: 0.02 },
  jupiter: { name: 'Jupiter', g: 24.79, rho: 0.16 },
} as const
export type Planet = keyof typeof PLANETS

/** The rules of the world at a station. Toggle air/friction to compare ideal vs real. */
export const WorldSchema = z.object({
  planet: z.enum(Object.keys(PLANETS) as [Planet, ...Planet[]]),
  air: z.boolean(),
  friction: z.boolean(),
})
export type World = z.infer<typeof WorldSchema>

export const DEFAULT_WORLD: World = { planet: 'earth', air: true, friction: true }

export const gravity = (w: World) => PLANETS[w.planet].g
/** Air density, or 0 when air resistance is switched off (a vacuum). */
export const airDensity = (w: World) => (w.air ? PLANETS[w.planet].rho : 0)
