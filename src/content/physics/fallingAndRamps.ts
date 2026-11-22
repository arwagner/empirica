import { all, reading, saw, wait, X, type PhysicsExperiment } from './helpers'

export const hammerAndFeather: PhysicsExperiment = {
  id: 'hammer-and-feather',
  domain: 'physics',
  title: 'The hammer and the feather',
  summary: 'Drop a hammer and a feather together, first in air, then in a vacuum.',
  topics: ['gravity', 'free fall', 'air resistance'],
  difficulty: 'intro',
  minutes: 4,
  station: 'drop-tower',
  hazards: [],
  setup: { rig: { kind: 'drop-tower', params: { height: 4, left: 'hammer', right: 'feather' } } },
  intro: X(
    'Do heavy things fall faster than light things? Let\'s race a hammer against a feather.',
    'Aristotle thought heavier objects fall faster. Galileo argued that without air, everything falls at the same rate. Let\'s test both ideas.',
    'In a uniform field every body has acceleration g regardless of mass (equivalence of inertial and gravitational mass). Differences in air come from drag, F = ½ρC_dAv².',
  ),
  steps: [
    { instruction: 'Release both objects (with air in the tube).', action: [{ type: 'drop-release' }, wait(10)], check: saw('apart'), observation: 'The hammer smashes down; the feather drifts slowly.', explanation: X('The air holds the feather back, but barely slows the hammer.', 'Air resistance is a big force compared with a feather\'s tiny weight, but tiny compared with a hammer\'s.', 'The feather reaches terminal velocity (~0.5 m/s) almost at once: drag ≈ weight. For the hammer, drag/weight ≪ 1 over 4 m.') },
    { instruction: 'Pump all the air out of the tube.', action: [{ type: 'set-world', air: false }], check: { type: 'world', air: false }, observation: 'The tube is now a vacuum.', explanation: X('No air means nothing to push against the feather.', 'With no air, the only force on each object is gravity.', 'ρ → 0, so the drag term vanishes and a = g for both.') },
    { instruction: 'Reset and release them again.', action: [{ type: 'drop-reset' }, { type: 'drop-release' }, wait(5)], check: saw('together'), observation: 'They land at exactly the same moment!', explanation: X('Without air, the feather falls just as fast as the hammer!', 'In a vacuum all objects fall with the same acceleration, whatever their mass.', 'Heavier objects feel more gravity (F = mg) but are harder to accelerate (a = F/m), so the m cancels: a = g. Apollo 15 astronaut David Scott did this on the Moon in 1971.') },
  ],
  conclusion: X(
    'Everything falls at the same speed without air. Air is what makes feathers slow.',
    'Gravity accelerates all objects equally. Differences in everyday life come from air resistance.',
    'The universality of free fall (tested to 1 part in 10¹⁵ by MICROSCOPE) is the foundation of Einstein\'s equivalence principle.',
  ),
  variations: [{ prompt: 'Try it on the Moon (World: the Moon). How long does the fall take now?' }, { prompt: 'Race a coffee filter against a parachute in air.' }],
}

export const measuringG: PhysicsExperiment = {
  id: 'measuring-g',
  domain: 'physics',
  title: 'Measuring g',
  summary: 'Time a steel ball falling in a vacuum and work out the acceleration due to gravity.',
  topics: ['gravity', 'free fall', 'kinematics', 'measurement'],
  difficulty: 'core',
  minutes: 6,
  station: 'drop-tower',
  hazards: [],
  setup: { rig: { kind: 'drop-tower', params: { height: 4, left: 'steel', right: null } }, world: { air: false } },
  intro: X(
    'How strong is gravity? We can measure it with a falling ball and a timer.',
    'An object falling from rest covers h = ½gt². Measure h and t, and you can calculate g.',
    'From h = ½gt² we get g = 2h/t². Using two heights eliminates any fixed timing offset: g = 2(h₂−h₁)/(t₂²−t₁²).',
  ),
  steps: [
    { instruction: 'Release the ball from 4 m and read the fall timer.', action: [{ type: 'drop-release' }, wait(3)], check: reading('fall-timer', 'left', 0.89, 0.92), observation: 'It takes about 0.90 s to fall 4 m.', explanation: X('Not even a second!', 'g = 2h/t² = 2 × 4 / 0.903² ≈ 9.8 m/s².', 't = √(2h/g) = √(8/9.81) = 0.903 s.') },
    { instruction: 'Lower the drop height to 1 m and drop it again.', action: [{ type: 'drop-set', height: 1 }, { type: 'drop-release' }, wait(2)], check: reading('fall-timer', 'left', 0.44, 0.46), observation: 'From 1 m it takes about 0.45 s: half the time for a quarter of the height.', explanation: X('A quarter of the height takes half the time: falling things speed up.', 'Distance grows with the square of time, because the ball keeps speeding up.', 'h ∝ t², so t ∝ √h: t(1 m)/t(4 m) = √(1/4) = ½.') },
  ],
  conclusion: X(
    'Gravity makes things speed up by about 10 m/s every second. That number is called g.',
    'Using h = ½gt² with your measurements gives g ≈ 9.8 m/s². The same value from both heights shows it\'s constant.',
    'g varies slightly across Earth (9.78 at the equator, 9.83 at the poles) due to rotation and Earth\'s oblate shape.',
  ),
  variations: [{ prompt: 'Measure g on Mars and on Jupiter.' }, { prompt: 'Use the light gate times to plot distance against time² in your notebook.' }],
}

export const terminalVelocity: PhysicsExperiment = {
  id: 'terminal-velocity',
  domain: 'physics',
  title: 'Terminal velocity',
  summary: 'Drop a coffee filter and a parachute and watch their speed level off.',
  topics: ['air resistance', 'forces', 'terminal velocity'],
  difficulty: 'core',
  minutes: 5,
  station: 'drop-tower',
  hazards: [],
  setup: { rig: { kind: 'drop-tower', params: { height: 5, left: 'filter', right: 'parachute' } } },
  intro: X(
    'Things falling through air don\'t keep speeding up forever. They hit a top speed.',
    'As speed rises, air resistance grows until it balances weight. Then the object stops accelerating: that\'s terminal velocity.',
    'Drag ∝ v², so terminal velocity is v_t = √(2mg/ρC_dA). The approach is exponential-like, with a time scale ~ v_t/g.',
  ),
  steps: [
    { instruction: 'Release the coffee filter and the parachute. Watch the speed graph.', action: [{ type: 'drop-release' }, wait(8)], check: all(saw('landed:filter'), reading('speed', 'left', 1.1, 1.3)), observation: 'Both speeds level off almost immediately; the filter lands at about 1.2 m/s.', explanation: X('They stop speeding up: air pushes up as hard as gravity pulls down.', 'The speed–time graph goes flat when drag equals weight. That top speed is the terminal velocity.', 'For the filter, v_t = √(2·0.001·9.81 / (1.2·0.0114)) ≈ 1.2 m/s, reached in ~0.3 s.') },
    { instruction: 'Swap the filter for a ping-pong ball and drop again.', action: [{ type: 'drop-set', left: 'pingpong' }, { type: 'drop-release' }, wait(8)], check: saw('landed:pingpong'), observation: 'The ping-pong ball goes much faster before landing.', explanation: X('The ball is small and smooth, so air slows it less.', 'Less drag area for its weight means a higher terminal velocity (about 9 m/s), which it doesn\'t reach in 5 m.', 'v_t(ping-pong) = √(2·0.0027·9.81/(1.2·0.00063)) ≈ 8.4 m/s.') },
  ],
  conclusion: X(
    'Falling things reach a top speed when air pushes back as hard as gravity pulls.',
    'Terminal velocity depends on weight and drag area: parachutes work by making drag area huge.',
    'v_t ∝ √(m/C_dA). Skydivers change posture to change C_dA: ~55 m/s belly-down, ~90+ m/s head-down.',
  ),
  variations: [{ prompt: 'Drop the feather and the parachute together. Which is slower?' }],
}

export const steeperIsFaster: PhysicsExperiment = {
  id: 'steeper-is-faster',
  domain: 'physics',
  title: 'Steeper ramps, faster carts',
  summary: 'Time a cart down a frictionless ramp at two angles.',
  topics: ['forces', 'acceleration', 'inclined plane'],
  difficulty: 'intro',
  minutes: 5,
  station: 'ramp-station',
  hazards: [],
  setup: { rig: { kind: 'ramp', params: { angleDeg: 10 } }, world: { air: false, friction: false } },
  intro: X(
    'Does a cart go faster down a steeper ramp? Let\'s time it.',
    'On a slope, part of gravity pulls the cart along the ramp. The steeper the slope, the bigger that part.',
    'Along a frictionless incline a = g sinθ. Light gates give times; distance d from rest gives a = 2d/t².',
  ),
  steps: [
    { instruction: 'Release the cart at 10° and wait for it to pass gate B.', action: [{ type: 'ramp-release' }, wait(4)], check: saw('gate:B'), observation: 'It reaches gate B after about 1.3 s.', explanation: X('A gentle slope gives a gentle push.', 'Only a small part of gravity acts along a 10° slope.', 'a = 9.81 × sin10° ≈ 1.70 m/s²; t = √(2 × 1.45 / 1.70) ≈ 1.31 s.') },
    { instruction: 'Tilt the ramp to 30° and release again.', action: [{ type: 'ramp-set', angleDeg: 30 }, { type: 'ramp-release' }, wait(3)], check: reading('light-gate', 'B', 0, 1.0), observation: 'Now it gets there in about 0.77 s.', explanation: X('Steeper ramp, bigger push, faster cart.', 'At 30°, half of gravity acts along the ramp (sin 30° = 0.5).', 'a = 4.91 m/s², nearly 3× more than at 10°, so t is √3 ≈ 1.7× shorter.') },
  ],
  conclusion: X(
    'The steeper the ramp, the faster the cart speeds up.',
    'The part of gravity along the slope is g·sinθ. At 90° the ramp becomes a free fall.',
    'Galileo used ramps to "dilute" gravity so falls were slow enough to time: the origin of experimental kinematics.',
  ),
  variations: [{ prompt: 'What angle makes the cart reach gate B in exactly 1 second?' }],
}

export const massDoesntMatter: PhysicsExperiment = {
  id: 'mass-on-a-ramp',
  domain: 'physics',
  title: 'Does a heavier cart go faster?',
  summary: 'Compare a light and a heavy cart on the same wooden ramp.',
  topics: ['forces', 'mass', 'friction', 'inclined plane'],
  difficulty: 'intro',
  minutes: 5,
  station: 'ramp-station',
  hazards: [],
  setup: { rig: { kind: 'ramp', params: { angleDeg: 20, surface: 'wood', mass: 0.5 } }, world: { air: false } },
  intro: X('Will a heavy cart beat a light one down the ramp? Make a guess first!', 'More mass means more gravity, but also more inertia and more friction. Which wins?', 'Both the driving force (mg sinθ) and friction (μmg cosθ) scale with m, as does inertia: a = g(sinθ − μcosθ).'),
  steps: [
    { instruction: 'Release the 0.5 kg cart and note gate B\'s time.', action: [{ type: 'ramp-release' }, wait(4)], check: saw('gate:B'), observation: 'About 1.38 s to gate B.', explanation: X('That\'s our light-cart time.', 'Friction from the wood slows it compared with a smooth track.', 'a = 9.81(sin20° − 0.2 cos20°) ≈ 1.51 m/s².') },
    { instruction: 'Load the cart to 2 kg and release again.', action: [{ type: 'ramp-set', mass: 2 }, { type: 'ramp-release' }, wait(4)], check: all(reading('balance', 'cart', 1.9), reading('light-gate', 'B', 1.37, 1.40)), observation: 'Exactly the same time, even though it\'s four times heavier!', explanation: X('Heavy or light, they take the same time.', 'Four times the mass means four times the pull, but also four times harder to speed up, so they cancel.', 'm cancels from ΣF = ma when every force is proportional to m (gravity and Coulomb friction both are).') },
  ],
  conclusion: X('Mass doesn\'t change how fast things roll down a ramp (without air).', 'Extra weight is cancelled by extra inertia. Only air resistance can break the tie.', 'With air drag, which isn\'t ∝ m, the heavier cart wins slightly: switch air resistance on and compare.'),
  variations: [{ prompt: 'Turn air resistance on and compare 0.25 kg and 3 kg carts.' }],
}

export const findingFriction: PhysicsExperiment = {
  id: 'finding-friction',
  domain: 'physics',
  title: 'Finding the coefficient of friction',
  summary: 'Tilt a felt ramp until the cart just starts to slide.',
  topics: ['friction', 'forces', 'inclined plane'],
  difficulty: 'core',
  minutes: 6,
  station: 'ramp-station',
  hazards: [],
  setup: { rig: { kind: 'ramp', params: { angleDeg: 15, surface: 'felt' } } },
  intro: X('Some surfaces are grippier than others. Let\'s measure how grippy felt is.', 'At a certain angle the cart starts to slide: that angle tells us the coefficient of friction μ.', 'At the threshold, mg sinθ_c = μmg cosθ_c, so μ = tanθ_c.'),
  steps: [
    { instruction: 'Release the cart at 15° on felt.', action: [{ type: 'ramp-release' }], check: saw('stuck'), observation: 'It doesn\'t move: friction holds it.', explanation: X('Too gentle: the felt grips the cart.', 'Gravity\'s pull along the slope is less than the maximum friction.', 'tan15° = 0.27 < μ = 0.35.') },
    { instruction: 'Tilt to 25° and release.', action: [{ type: 'ramp-set', angleDeg: 25 }, { type: 'ramp-release' }, wait(5)], check: saw('gate:A'), observation: 'Now it slides.', explanation: X('Steep enough to beat the grip.', 'Somewhere between 15° and 25° it starts sliding. Narrow it down!', 'tan25° = 0.47 > 0.35. The threshold is θ_c = arctan(0.35) ≈ 19.3°.') },
  ],
  conclusion: X('The steeper the slope needed, the grippier the surface.', 'The tangent of the "just slides" angle equals the coefficient of friction.', 'Static μ is usually larger than kinetic μ, which is why things "jump" into motion. Our model uses one value for both.'),
  variations: [{ prompt: 'Find the exact sliding angle to the nearest degree, and calculate μ.' }, { prompt: 'Repeat on wood.' }],
}

export const newtonsSecondLaw: PhysicsExperiment = {
  id: 'newtons-second-law',
  domain: 'physics',
  title: 'Newton\'s second law',
  summary: 'Pull a cart with a hanging mass and measure the acceleration.',
  topics: ['forces', 'acceleration', 'Newton\'s laws'],
  difficulty: 'core',
  minutes: 6,
  station: 'ramp-station',
  hazards: [],
  setup: { rig: { kind: 'ramp', params: { angleDeg: 0, mass: 0.9, hanging: 0.1 } }, world: { air: false, friction: false } },
  intro: X('A bigger pull makes things speed up faster. Let\'s prove it!', 'Newton\'s second law: acceleration = force ÷ mass. We\'ll double the force while keeping total mass the same.', 'With a hanging mass m on a cart M (flat, frictionless): a = mg/(M + m). Moving mass from cart to hanger changes F at constant total mass.'),
  steps: [
    { instruction: 'Release with 100 g hanging and read the accelerometer.', action: [{ type: 'ramp-release' }, wait(0.5)], check: reading('accelerometer', 'cart', 0.95, 1.0), observation: 'About 0.98 m/s².', explanation: X('A small pull, a gentle speed-up.', 'F = 0.1 × 9.81 = 0.98 N pulling a total of 1 kg gives a = 0.98 m/s².', 'a = mg/(M+m) = 0.981/1.0.') },
    { instruction: 'Move 100 g from the cart to the hanger (cart 0.8 kg, hanging 200 g) and release again.', action: [{ type: 'ramp-set', mass: 0.8, hanging: 0.2 }, { type: 'ramp-release' }, wait(0.5)], check: reading('accelerometer', 'cart', 1.9, 2.0), observation: 'Now about 1.96 m/s², double!', explanation: X('Double the pull, double the speed-up.', 'Same total mass, twice the force, twice the acceleration: a ∝ F.', 'a = 0.2 × 9.81 / 1.0 = 1.962 m/s².') },
  ],
  conclusion: X('Pull twice as hard and things speed up twice as fast.', 'F = ma: acceleration is proportional to force and inversely proportional to mass.', 'Keeping total mass fixed isolates F; keeping F fixed and adding cart mass tests a ∝ 1/m.'),
  variations: [{ prompt: 'Keep 100 g hanging but make the cart 1.9 kg. What happens to a?' }],
}
