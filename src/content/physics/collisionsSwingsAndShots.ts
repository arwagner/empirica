import { all, reading, saw, wait, X, type PhysicsExperiment } from './helpers'

export const elasticCollisions: PhysicsExperiment = {
  id: 'elastic-collisions',
  domain: 'physics',
  title: 'Bouncy collisions',
  summary: 'Crash gliders with spring bumpers and watch momentum pass between them.',
  topics: ['momentum', 'collisions', 'energy'],
  difficulty: 'intro',
  minutes: 5,
  station: 'collision-station',
  hazards: [],
  setup: { rig: { kind: 'track', params: { mA: 0.5, mB: 0.5, vA: 0.5, vB: 0, bumper: 'elastic' } }, world: { air: false, friction: false } },
  intro: X('What happens when a moving glider hits one that\'s standing still?', 'In an elastic collision, both momentum and kinetic energy are conserved. Watch what happens with equal masses.', 'For e = 1: v_A\' = (m_A − m_B)v_A/(m_A + m_B), v_B\' = 2m_A v_A/(m_A + m_B).'),
  steps: [
    { instruction: 'Launch glider A at the resting glider B.', action: [{ type: 'track-launch' }, wait(2)], check: all(saw('collision'), reading('velocity', 'A', -0.01, 0.01)), observation: 'A stops dead and B moves off at A\'s old speed.', explanation: X('A passed all its motion to B, like a Newton\'s cradle.', 'With equal masses, all the momentum and energy move to the other glider.', 'm_A = m_B ⇒ v_A\' = 0, v_B\' = v_A.') },
    { instruction: 'Make glider B twice as heavy (1 kg) and launch again.', action: [{ type: 'track-set', mB: 1 }, { type: 'track-launch' }, wait(2)], check: reading('velocity', 'A', -1, -0.05), observation: 'Now A bounces back while B moves off more slowly.', explanation: X('Hitting something heavier makes you bounce back.', 'B takes most of the momentum, so A has to go backwards to keep the total the same.', 'v_A\' = (0.5 − 1)/1.5 × 0.5 = −0.17 m/s; v_B\' = 0.33 m/s. Check: 0.5×(−0.17) + 1×0.33 = 0.25 = 0.5×0.5 ✓.') },
  ],
  conclusion: X('In bouncy collisions, motion gets passed along but never lost.', 'Total momentum before = total momentum after. In elastic collisions kinetic energy is conserved too.', 'Momentum conservation follows from Newton\'s third law (equal and opposite impulses), or more deeply from translational symmetry (Noether).'),
  variations: [{ prompt: 'Make A the heavy one. What happens?' }, { prompt: 'Push both gliders towards each other.' }],
}

export const stickyCollisions: PhysicsExperiment = {
  id: 'sticky-collisions',
  domain: 'physics',
  title: 'Sticky collisions and lost energy',
  summary: 'Velcro the gliders together: momentum survives, but kinetic energy doesn\'t.',
  topics: ['momentum', 'collisions', 'energy'],
  difficulty: 'core',
  minutes: 5,
  station: 'collision-station',
  hazards: [],
  setup: { rig: { kind: 'track', params: { mA: 0.5, mB: 0.5, vA: 0.6, vB: 0, bumper: 'sticky' } }, world: { air: false, friction: false } },
  intro: X('What if the gliders stick together when they hit?', 'In a perfectly inelastic collision, objects stick. Momentum is still conserved, but some kinetic energy disappears. Where does it go?', 'With e = 0, both move at v = (m_A v_A + m_B v_B)/(m_A + m_B), and ΔKE = −½μ_red(Δv)².'),
  steps: [
    { instruction: 'Launch A into B (Velcro pads).', action: [{ type: 'track-launch' }, wait(2)], check: all(saw('collision:sticky'), reading('momentum', 'after', 0.29, 0.31), reading('kinetic-energy', 'after', 0.04, 0.05)), observation: 'They stick and move together at half speed. Momentum is unchanged (0.30), but kinetic energy halves (0.09 → 0.045 J).', explanation: X('They share the motion, so they go slower together.', 'Momentum is conserved (0.5 × 0.6 = 1.0 × 0.3), but half the kinetic energy turned into heat and sound in the Velcro.', 'KE_after/KE_before = m_A/(m_A + m_B) = ½ for equal masses.') },
  ],
  conclusion: X('Sticky crashes keep the total "push" but lose some energy.', 'Momentum is always conserved in collisions; kinetic energy only in elastic ones. The rest becomes heat, sound and deformation.', 'This is why crumple zones work: converting KE into deformation lengthens collision times and reduces forces.'),
  variations: [{ prompt: 'Try custom bounciness 0.5. How much energy is lost now?' }],
}

export const explosions: PhysicsExperiment = {
  id: 'explosions',
  domain: 'physics',
  title: 'Explosions and recoil',
  summary: 'A spring pushes two gliders apart from rest. Total momentum: zero.',
  topics: ['momentum', 'recoil', 'Newton\'s laws'],
  difficulty: 'core',
  minutes: 5,
  station: 'collision-station',
  hazards: [],
  setup: { rig: { kind: 'track', params: { mode: 'explode', mA: 0.5, mB: 1, springJ: 0.2 } }, world: { air: false, friction: false } },
  intro: X('When something pushes off something else, both move: like a skater pushing a wall, or a cannon recoiling.', 'Starting from rest, the total momentum is zero, so after the "explosion" the two momenta must cancel.', 'm_A v_A + m_B v_B = 0 ⇒ v_A/v_B = −m_B/m_A. The spring energy divides in inverse proportion to mass.'),
  steps: [
    { instruction: 'Release the spring between A (0.5 kg) and B (1 kg).', action: [{ type: 'track-launch' }, wait(0.5)], check: all(saw('explosion'), reading('momentum', 'after', -0.001, 0.001)), observation: 'They fly apart; the light glider goes twice as fast. Total momentum stays zero.', explanation: X('The lighter glider zooms off faster.', 'Equal and opposite pushes give equal and opposite momenta. Half the mass means twice the speed.', 'v_A = −0.73 m/s, v_B = +0.37 m/s: 0.5(−0.73) + 1(0.37) ≈ 0.') },
    { instruction: 'Make B 0.5 kg too and release again.', action: [{ type: 'track-set', mB: 0.5 }, { type: 'track-launch' }, wait(0.5)], check: reading('velocity', 'B', 0.6, 0.66), observation: 'Equal masses fly apart at equal speeds.', explanation: X('Same mass, same speed, opposite directions.', 'Symmetric push, symmetric result.', 'v = √(E/m) for each = √(0.2/0.5)... per glider √(2·0.2·½/0.5)... ≈ 0.63 m/s.') },
  ],
  conclusion: X('Push-offs always send things in opposite directions with matching "oomph".', 'Momentum is conserved even in explosions: rockets work by throwing mass backwards.', 'Rocket equation: Δv = v_exhaust ln(m₀/m₁), from momentum conservation applied continuously.'),
  variations: [{ prompt: 'Make A 2 kg and B 0.25 kg. What\'s the speed ratio?' }],
}

export const pendulumLength: PhysicsExperiment = {
  id: 'pendulum-length',
  domain: 'physics',
  title: 'What sets a pendulum\'s rhythm?',
  summary: 'Change the length and time the swings.',
  topics: ['oscillations', 'pendulum', 'periodic motion'],
  difficulty: 'intro',
  minutes: 6,
  station: 'pendulum-station',
  hazards: [],
  setup: { rig: { kind: 'oscillator', params: { mode: 'pendulum', length: 1, angleDeg: 5 } }, world: { air: false, friction: false } },
  intro: X('Grandfather clocks keep time with a swinging pendulum. What decides how fast it swings?', 'The period (time for one full swing) depends on the length. Let\'s find out how.', 'For small angles, T = 2π√(L/g), independent of mass and amplitude (isochronism, noticed by Galileo).'),
  steps: [
    { instruction: 'Release the 1 m pendulum and read the period.', action: [{ type: 'osc-release' }, wait(6)], check: reading('period', 'bob', 1.95, 2.05), observation: 'One full swing takes about 2.0 s.', explanation: X('A 1 m pendulum ticks once a second each way.', 'That\'s why a "seconds pendulum" is about 1 m long.', 'T = 2π√(1/9.81) = 2.006 s.') },
    { instruction: 'Shorten it to 0.25 m and release again.', action: [{ type: 'osc-set', length: 0.25 }, { type: 'osc-release' }, wait(4)], check: reading('period', 'bob', 0.98, 1.03), observation: 'Now about 1.0 s: a quarter of the length, half the period.', explanation: X('Shorter pendulums swing faster.', 'Period depends on the square root of the length: ¼ the length gives ½ the period.', 'T ∝ √L: √(0.25) = 0.5.') },
  ],
  conclusion: X('Long pendulums swing slowly, short ones quickly.', 'T = 2π√(L/g): it depends only on length and gravity.', 'Measuring T and L gives g; Kater\'s reversible pendulum measured g to 1 part in 10⁵ in 1817.'),
  variations: [{ prompt: 'Find the length that gives exactly a 1.5 s period.' }, { prompt: 'Try the same pendulum on the Moon.' }],
}

export const pendulumMass: PhysicsExperiment = {
  id: 'pendulum-mass',
  domain: 'physics',
  title: 'Does a heavier bob swing slower?',
  summary: 'Swap a 50 g bob for a 1 kg bob and compare the period.',
  topics: ['oscillations', 'pendulum', 'mass'],
  difficulty: 'intro',
  minutes: 4,
  station: 'pendulum-station',
  hazards: [],
  setup: { rig: { kind: 'oscillator', params: { mode: 'pendulum', length: 1, angleDeg: 5, mass: 0.05 } }, world: { air: false, friction: false } },
  intro: X('Guess first: does a heavy bob swing faster, slower, or the same?', 'Mass appears in both the pull of gravity and the inertia of the bob. Let\'s see whether it matters.', 'The restoring force is −mg sinθ and the inertia is mL: m cancels from θ\'\' = −(g/L) sinθ.'),
  steps: [
    { instruction: 'Release the 50 g bob and read the period.', action: [{ type: 'osc-release' }, wait(6)], check: reading('period', 'bob', 1.95, 2.05), observation: 'About 2.0 s.', explanation: X('That\'s the light bob\'s time.', 'Period with a light bob.', 'T ≈ 2.006 s.') },
    { instruction: 'Swap to a 1 kg bob and release again.', action: [{ type: 'osc-set', mass: 1 }, { type: 'osc-release' }, wait(6)], check: all(reading('balance', 'bob', 0.9), reading('period', 'bob', 1.95, 2.05)), observation: 'Still 2.0 s, even though it\'s 20 times heavier.', explanation: X('Same time! Weight doesn\'t matter.', 'Heavier bobs are pulled harder but are harder to move, so it cancels out.', 'Exactly like free fall: gravitational and inertial mass are equal.') },
  ],
  conclusion: X('A pendulum\'s rhythm doesn\'t depend on how heavy the bob is.', 'Only length and gravity set the period.', 'With air resistance on, the light bob loses amplitude faster but its period barely changes.'),
  variations: [{ prompt: 'Switch air resistance on and compare how quickly each one dies down.' }],
}

export const largeAngles: PhysicsExperiment = {
  id: 'large-angle-pendulum',
  domain: 'physics',
  title: 'When the pendulum formula breaks',
  summary: 'Release from 60° instead of 5°. Is the period still 2π√(L/g)?',
  topics: ['oscillations', 'pendulum', 'approximations'],
  difficulty: 'advanced',
  minutes: 5,
  station: 'pendulum-station',
  hazards: [],
  setup: { rig: { kind: 'oscillator', params: { mode: 'pendulum', length: 1, angleDeg: 5 } }, world: { air: false, friction: false } },
  intro: X('The pendulum formula is a very good guess, but not perfect. Let\'s find where it goes wrong.', 'The formula T = 2π√(L/g) assumes small swings. Big swings take longer.', 'T = 4√(L/g) K(sin(θ₀/2)) exactly, ≈ 2π√(L/g)(1 + θ₀²/16 + …).'),
  steps: [
    { instruction: 'Release from 5° and read the period.', action: [{ type: 'osc-release' }, wait(6)], check: reading('period', 'bob', 2.0, 2.02), observation: 'About 2.007 s: matches the formula.', explanation: X('Small swings match the simple formula.', 'At 5° the small-angle approximation is excellent.', 'Correction ≈ θ₀²/16 = 0.0005: 0.05%.') },
    { instruction: 'Pull it back to 60° and release.', action: [{ type: 'osc-set', angleDeg: 60 }, { type: 'osc-release' }, wait(6)], check: reading('period', 'bob', 2.1, 2.2), observation: 'About 2.15 s: 7% longer.', explanation: X('Big swings are slower than the formula says.', 'At large angles the restoring force grows more slowly than the angle, so the swing takes longer.', 'sinθ < θ, so the restoring torque is weaker than the linear model predicts. K-integral: T = 1.073 × 2π√(L/g).') },
  ],
  conclusion: X('The simple formula only works for small swings.', 'Physics formulas often rely on approximations; it matters to know where they hold.', 'Clockmakers keep amplitudes small (and constant) for this reason; Huygens\' cycloidal pendulum makes T exactly amplitude-independent.'),
  variations: [{ prompt: 'Try 90°. How much longer is it now?' }],
}

export const hookesLaw: PhysicsExperiment = {
  id: 'hookes-law',
  domain: 'physics',
  title: 'Hooke\'s law and bouncing springs',
  summary: 'Hang masses on a spring, measure the stretch, then time the bounce.',
  topics: ['springs', 'forces', 'oscillations'],
  difficulty: 'core',
  minutes: 7,
  station: 'pendulum-station',
  hazards: [],
  setup: { rig: { kind: 'oscillator', params: { mode: 'spring', k: 20, mass: 0.05 } }, world: { air: false, friction: false } },
  intro: X('Springs stretch more when you hang more on them. How much more?', 'Hooke\'s law: the stretch is proportional to the force. Then we\'ll see how fast a loaded spring bounces.', 'F = kx at equilibrium gives x = mg/k; the oscillation period is T = 2π√(m/k), independent of g.'),
  steps: [
    { instruction: 'Hang a 100 g mass and read the extension.', action: [{ type: 'osc-set', mass: 0.1 }], check: reading('ruler', 'extension', 4.8, 5.0), observation: 'The spring stretches about 4.9 cm.', explanation: X('The weight pulls the spring longer.', '0.1 kg weighs 0.98 N; with k = 20 N/m, the stretch is 0.98/20 = 4.9 cm.', 'x = mg/k.') },
    { instruction: 'Double it to 200 g.', action: [{ type: 'osc-set', mass: 0.2 }], check: reading('ruler', 'extension', 9.7, 9.9), observation: 'Now about 9.8 cm: double the weight, double the stretch.', explanation: X('Twice the weight, twice the stretch.', 'Stretch is proportional to force: that\'s Hooke\'s law.', 'Linear within the elastic limit; beyond it, springs deform permanently.') },
    { instruction: 'Release it from its pulled-down position and read the period.', action: [{ type: 'osc-release' }, wait(3)], check: reading('period', 'bob', 0.6, 0.66), observation: 'It bounces with a period of about 0.63 s.', explanation: X('It bobs up and down with a steady rhythm.', 'T = 2π√(m/k) = 2π√(0.2/20) ≈ 0.63 s.', 'Note g doesn\'t appear: the same spring bounces at the same rate on the Moon, though it stretches less.') },
  ],
  conclusion: X('Springs stretch evenly with weight and bounce with a steady rhythm.', 'Hooke\'s law F = kx makes springs useful for weighing things; their period depends only on mass and stiffness.', 'Any system near a stable equilibrium behaves like a spring: simple harmonic motion is everywhere (atoms, bridges, circuits).'),
  variations: [{ prompt: 'Take the spring to the Moon. Does the stretch change? Does the period?' }],
}

export const rangeAndAngle: PhysicsExperiment = {
  id: 'range-and-angle',
  domain: 'physics',
  title: 'The best launch angle',
  summary: 'Launch at 30°, 45° and 60° and compare the ranges.',
  topics: ['projectiles', 'kinematics', 'vectors'],
  difficulty: 'intro',
  minutes: 6,
  station: 'launcher-station',
  hazards: [],
  setup: { rig: { kind: 'launcher', params: { speed: 10, angleDeg: 30 } }, world: { air: false } },
  intro: X('Which angle throws a ball the furthest? Let\'s experiment.', 'A projectile\'s motion splits into steady sideways motion and up-and-down motion under gravity. The angle trades one against the other.', 'Without drag, R = v² sin2θ / g: maximal at 45°, and symmetric about it.'),
  steps: [
    { instruction: 'Fire at 30°.', action: [{ type: 'launch-fire' }, wait(3)], check: saw('landed'), observation: 'It lands about 8.8 m away.', explanation: X('A flat-ish throw.', 'Lots of sideways speed, but not much time in the air.', 'R = 100 sin60°/9.81 = 8.83 m.') },
    { instruction: 'Now 45°.', action: [{ type: 'launch-set', angleDeg: 45 }, { type: 'launch-fire' }, wait(3)], check: reading('tape', 'range', 10.1, 10.3), observation: 'About 10.2 m: further!', explanation: X('45° is the sweet spot.', 'The best balance of time in the air and sideways speed.', 'sin(90°) = 1 is the maximum.') },
    { instruction: 'And 60°.', action: [{ type: 'launch-set', angleDeg: 60 }, { type: 'launch-fire' }, wait(3)], check: reading('tape', 'range', 8.7, 8.95), observation: 'Back to 8.8 m: the same as 30°!', explanation: X('Too steep: it goes high but not far.', '30° and 60° add up to 90°, so they give the same range.', 'sin(2×60°) = sin(2×30°).') },
  ],
  conclusion: X('45° throws furthest. Angles the same distance either side of 45° land in the same place.', 'Range depends on sin(2θ): complementary angles give equal ranges.', 'With air resistance, the optimum drops below 45° (try it!), and for a ball launched from a height it\'s also lower.'),
  variations: [{ prompt: 'Turn air resistance on and use the ping-pong ball. What\'s the best angle now?' }],
}

export const hitTheTarget: PhysicsExperiment = {
  id: 'hit-the-target',
  domain: 'physics',
  title: 'Hit the target',
  summary: 'Work out the angle that lands a 10 m/s shot exactly 8 m away.',
  topics: ['projectiles', 'kinematics', 'problem solving'],
  difficulty: 'core',
  minutes: 6,
  station: 'launcher-station',
  hazards: [],
  setup: { rig: { kind: 'launcher', params: { speed: 10, angleDeg: 45, targetX: 8 } }, world: { air: false } },
  intro: X('The target is 8 m away and the launcher fires at 10 m/s. Can you find the right angle?', 'Use the range formula to predict the angle, then test it.', 'Solve sin2θ = Rg/v² = 0.785: θ = 25.9° or 64.1°.'),
  steps: [
    { instruction: 'Set the angle you predict and fire. (Hint: try about 26°.)', action: [{ type: 'launch-set', angleDeg: 26 }, { type: 'launch-fire' }, wait(3)], check: saw('target-hit'), observation: 'Bullseye!', explanation: X('Nailed it!', 'Rearranging R = v² sin2θ/g gives the angle you need.', 'There\'s a second solution at 64°: a high lob that lands in the same spot.') },
  ],
  conclusion: X('You can use physics to aim before you throw.', 'Physics lets you predict where a projectile will land.', 'Real artillery and sports must also account for drag, spin (Magnus effect) and wind.'),
  variations: [{ prompt: 'Find the other angle that also hits the target.' }, { prompt: 'Move the target to 12 m. Is it reachable at 10 m/s?' }],
}
