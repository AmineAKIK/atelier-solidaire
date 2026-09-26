import { describe, expect, it } from 'vitest'

import { createReservationSchema } from '../../http/schemas.js'

const validPayload = {
  slotId: 4,
  categoryId: 1,
  firstName: ' Alice ',
  lastName: ' Example ',
  email: ' alice@example.test ',
  itemName: ' Laptop ',
  problemDescription: ' Does not start. ',
}

describe('createReservationSchema', () => {
  it('rejects a string slotId', () => {
    const result = createReservationSchema.safeParse({
      ...validPayload,
      slotId: '4',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a NoSQL operator object as slotId', () => {
    const result = createReservationSchema.safeParse({
      ...validPayload,
      slotId: { $gt: 0 },
    })

    expect(result.success).toBe(false)
  })

  it('rejects overlong fields and an invalid email address', () => {
    const result = createReservationSchema.safeParse({
      ...validPayload,
      firstName: 'a'.repeat(81),
      lastName: 'b'.repeat(81),
      email: 'not-an-email',
      itemName: 'c'.repeat(161),
      problemDescription: 'd'.repeat(2001),
    })

    expect(result.success).toBe(false)
  })

  it('trims participant text fields before returning validated data', () => {
    const result = createReservationSchema.parse(validPayload)

    expect(result).toMatchObject({
      firstName: 'Alice',
      lastName: 'Example',
      email: 'alice@example.test',
      itemName: 'Laptop',
      problemDescription: 'Does not start.',
    })
  })
})
