import { z } from 'zod'

/** Validation schema preserving the existing reservation request contract. */
export const createReservationSchema = z.object({
  slotId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  itemName: z.string().trim().min(1).max(160),
  problemDescription: z.string().trim().min(1).max(2000),
})

/** Validation schema for workshop route identifiers. */
export const workshopIdSchema = z.coerce.number().int().positive()

/** Validation schema for the admin statistics query. */
export const reservationAttemptStatsQuerySchema = z.object({
  workshopId: z.coerce.number().int().positive(),
})
