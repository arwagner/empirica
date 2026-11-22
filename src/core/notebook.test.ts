import { addNote, createNotebook, measurementSeries, record, toCSV, toMarkdown, type LabEvent } from '.'

const temp = (value: number): LabEvent => ({
  kind: 'measurement',
  text: 'Beaker A temperature',
  measurement: { quantity: 'temperature', value, unit: '°C', instrument: 'thermometer' },
})

const session = () => {
  let nb = createNotebook({ title: 'Heating water', domain: 'chemistry' }, new Date('2026-11-21T10:00:00Z'))
  nb = record(nb, [{ kind: 'action', text: 'Turned on hot plate', action: { type: 'heat' } }], 0)
  nb = record(nb, [temp(21)], 1000)
  nb = record(nb, [temp(35.5), { kind: 'observation', text: 'Small bubbles form' }], 61000)
  nb = addNote(nb, '  Bubbles appear well before boiling, "interesting"  ', 62000)
  return nb
}

test('records events in order with increasing ids and leaves the original untouched', () => {
  const empty = createNotebook({ title: 'x', domain: 'd' }, new Date(0))
  const nb = record(empty, [temp(1), temp(2)], 5)
  expect(empty.entries).toHaveLength(0)
  expect(nb.entries.map((e) => e.id)).toEqual([1, 2])
  expect(session().entries.map((e) => e.kind)).toEqual(['action', 'measurement', 'measurement', 'observation', 'note'])
})

test('ignores blank notes and trims real ones', () => {
  const nb = session()
  expect(addNote(nb, '   ', 0)).toBe(nb)
  expect(nb.entries.at(-1)).toMatchObject({ kind: 'note', text: 'Bubbles appear well before boiling, "interesting"' })
})

test('groups measurements into series', () => {
  expect(measurementSeries(session())).toEqual([
    { quantity: 'temperature', unit: '°C', instrument: 'thermometer', points: [{ t: 1000, value: 21 }, { t: 61000, value: 35.5 }] },
  ])
})

test('exports markdown with log and measurement table', () => {
  const md = toMarkdown(session())
  expect(md).toContain('# Heating water')
  expect(md).toContain('- `00:00` **Did:** Turned on hot plate')
  expect(md).toContain('- `01:01` **Measured:** Beaker A temperature (35.5 °C)')
  expect(md).toContain('**Note:** _Bubbles appear')
  expect(md).toContain('| 01:01 | 35.5 |')
})

test('exports measurements as CSV, quoting where needed', () => {
  let nb = session()
  nb = record(nb, [{ ...temp(40), text: 'Beaker "B", left' } as LabEvent], 70000)
  expect(toCSV(nb).split('\n')).toEqual([
    'elapsed_s,quantity,value,unit,instrument,context',
    '1,temperature,21,°C,thermometer,Beaker A temperature',
    '61,temperature,35.5,°C,thermometer,Beaker A temperature',
    '70,temperature,40,°C,thermometer,"Beaker ""B"", left"',
    '',
  ])
})
