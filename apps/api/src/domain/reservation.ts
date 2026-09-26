/** Input accepted by the reservation business service after HTTP validation. */
export interface CreateReservationCommand {
  slotId: number
  categoryId: number
  firstName: string
  lastName: string
  email: string
  itemName: string
  problemDescription: string
}

/** Reservation row returned by PostgreSQL without changing the existing JSON representation. */
export interface PersistedReservation {
  id: string
  publicToken: string
  status: string
  createdAt: Date
}

/** Successful reservation response preserved for the existing Front contract. */
export interface ReservationCreationResult {
  reservation: PersistedReservation
  capacity: {
    total: number
    reserved: number
    remaining: number
  }
}

/** Outcome values stored in the MongoDB reservation-attempt journal. */
export type ReservationAttemptOutcome = 'accepted' | 'refused'

/** Reason values stored in the MongoDB reservation-attempt journal. */
export type ReservationAttemptReason =
  | 'created'
  | 'validation_error'
  | 'slot_category_not_found'
  | 'booking_unavailable'
  | 'booking_closed'
  | 'capacity_full'
  | 'internal_error'

/** Privacy-minimal event stored for reservation-attempt statistics. */
export interface ReservationAttempt {
  workshopId: number | null
  slotId: number | null
  categoryId: number | null
  outcome: ReservationAttemptOutcome
  reason: ReservationAttemptReason
  createdAt: Date
}

/** Aggregated attempt statistics returned by the admin endpoint. */
export interface ReservationAttemptStat {
  outcome: ReservationAttemptOutcome
  reason: ReservationAttemptReason
  count: number
}
