/** Booking rule error codes exposed by the reservation endpoint. */
export type BookingErrorCode =
  | 'slot_category_not_found'
  | 'booking_unavailable'
  | 'booking_closed'
  | 'capacity_full'

/** Optional structured details preserved in compatible HTTP error responses. */
export interface BookingErrorDetails {
  capacity?: number
  reserved?: number
}

/**
 * Represents a business-rule failure during reservation creation.
 */
export class BookingError extends Error {
  /**
   * Creates a business error that can later be translated by the HTTP layer.
   *
   * @param code - Stable API error code.
   * @param status - HTTP status associated with the business failure.
   * @param details - Optional response fields required by the existing contract.
   */
  public constructor(
    public readonly code: BookingErrorCode,
    public readonly status: number,
    public readonly details: BookingErrorDetails = {},
  ) {
    super(code)
    this.name = 'BookingError'
  }
}
