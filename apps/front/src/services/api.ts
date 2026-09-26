const REQUEST_TIMEOUT_MS = 8000

/** A category code returned by the reservation API. */
export type ApiCategoryCode = 'IT' | 'PEM' | 'TXT'

/** Workshop details returned with availability data. */
export interface Workshop {
  id: number
  title: string
  startsAt: string
  endsAt: string
  bookingClosesAt: string
  locationName: string
  city: string
  bookingOpen: boolean
}

/** Availability information for one workshop slot and category. */
export interface AvailabilitySlot {
  slotId: number
  arrivalAt: string
  localTime: string
  categoryId: number
  categoryCode: ApiCategoryCode
  categoryName: string
  volunteers: number
  capacity: number
  reserved: number
  remaining: number
}

/** Response returned by the workshop availability endpoint. */
export interface AvailabilityResponse {
  workshop: Workshop
  availability: AvailabilitySlot[]
}

/** Payload accepted by the reservation creation endpoint. */
export interface CreateReservationPayload {
  slotId: number
  categoryId: number
  firstName: string
  lastName: string
  email: string
  itemName: string
  problemDescription: string
}

/** Response returned after a reservation is successfully created. */
export interface CreateReservationResponse {
  reservation: {
    id: number
    publicToken: string
    status: string
    createdAt: string
  }
  capacity: {
    total: number
    reserved: number
    remaining: number
  }
}

/** Stable error codes exposed to the front-end application. */
export type ApiErrorCode =
  | 'validation_error'
  | 'not_found'
  | 'capacity_full'
  | 'booking_closed'
  | 'booking_unavailable'
  | 'network_error'
  | 'server_error'

/** Error carrying a user-safe French message and a stable application code. */
export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

interface ApiErrorBody {
  code?: string
}

interface AvailabilityResponseWire {
  workshop: Omit<Workshop, 'id'> & {
    id: unknown
  }
  availability: Array<
    Omit<
      AvailabilitySlot,
      'slotId' | 'categoryId' | 'volunteers' | 'capacity' | 'reserved' | 'remaining'
    > & {
      slotId: unknown
      categoryId: unknown
      volunteers: unknown
      capacity: unknown
      reserved: unknown
      remaining: unknown
    }
  >
}

interface CreateReservationResponseWire {
  reservation: Omit<CreateReservationResponse['reservation'], 'id'> & {
    id: unknown
  }
  capacity: CreateReservationResponse['capacity']
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

function toApiError(status: number, body: ApiErrorBody | null): ApiError {
  if (status === 400) {
    return new ApiError(
      'validation_error',
      'Certaines informations sont invalides. Vérifiez le formulaire avant de réessayer.',
    )
  }

  if (status === 404) {
    return new ApiError(
      'not_found',
      "La réservation demandée n'est plus disponible. Revenez au choix de l'heure.",
    )
  }

  if (status === 409 && body?.code === 'capacity_full') {
    return new ApiError(
      'capacity_full',
      "Cette heure vient d'être réservée. Choisissez une autre heure.",
    )
  }

  if (status === 409 && body?.code === 'booking_closed') {
    return new ApiError(
      'booking_closed',
      'Les réservations pour cet atelier sont maintenant closes.',
    )
  }

  if (status === 409 && body?.code === 'booking_unavailable') {
    return new ApiError(
      'booking_unavailable',
      "Ce créneau n'est plus disponible. Choisissez une autre heure.",
    )
  }

  return new ApiError(
    'server_error',
    'Le service de réservation rencontre un problème. Réessayez dans quelques instants.',
  )
}

/**
 * Converts an API numeric field to a non-negative safe integer.
 *
 * node-postgres serializes BIGINT columns as strings to avoid precision loss. Normalizing those
 * values at the HTTP boundary keeps identifiers numeric in Pinia state and in later POST payloads.
 *
 * @param value - Numeric value received from the API.
 * @returns The normalized JavaScript number.
 * @throws {ApiError} When the value is not a non-negative safe integer.
 */
function normalizeNonNegativeInteger(value: unknown): number {
  const normalized =
    typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value)

  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new ApiError(
      'server_error',
      'Le service de réservation rencontre un problème. Réessayez dans quelques instants.',
    )
  }

  return normalized
}

/**
 * Normalizes numeric fields returned by the availability endpoint.
 *
 * @param response - Raw availability response received from the API.
 * @returns Availability data with numeric identifiers and counters.
 */
function normalizeAvailabilityResponse(response: AvailabilityResponseWire): AvailabilityResponse {
  return {
    workshop: {
      ...response.workshop,
      id: normalizeNonNegativeInteger(response.workshop.id),
    },
    availability: response.availability.map((slot) => ({
      ...slot,
      slotId: normalizeNonNegativeInteger(slot.slotId),
      categoryId: normalizeNonNegativeInteger(slot.categoryId),
      volunteers: normalizeNonNegativeInteger(slot.volunteers),
      capacity: normalizeNonNegativeInteger(slot.capacity),
      reserved: normalizeNonNegativeInteger(slot.reserved),
      remaining: normalizeNonNegativeInteger(slot.remaining),
    })),
  }
}

/**
 * Normalizes numeric fields returned after a reservation is created.
 *
 * @param response - Raw reservation response received from the API.
 * @returns Reservation data with a numeric identifier.
 */
function normalizeCreateReservationResponse(
  response: CreateReservationResponseWire,
): CreateReservationResponse {
  return {
    ...response,
    reservation: {
      ...response.reservation,
      id: normalizeNonNegativeInteger(response.reservation.id),
    },
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiBaseUrl = getApiBaseUrl()

  if (!apiBaseUrl) {
    throw new ApiError(
      'network_error',
      'Le service de réservation est indisponible. Réessayez plus tard.',
    )
  }

  const controller = new AbortController()
  // AbortController prevents a stalled request from blocking the reservation flow indefinitely.
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/json')

  if (init.body) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(apiBaseUrl + path, {
      ...init,
      headers,
      signal: controller.signal,
    })
    const body = (await response.json().catch(() => null)) as T | ApiErrorBody | null

    if (!response.ok) {
      throw toApiError(response.status, body as ApiErrorBody | null)
    }

    return body as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'network_error',
        'Le service de réservation met trop de temps à répondre. Réessayez.',
      )
    }

    throw new ApiError(
      'network_error',
      'Impossible de contacter le service de réservation. Réessayez dans quelques instants.',
    )
  } finally {
    window.clearTimeout(timeoutId)
  }
}

/**
 * Loads workshop information and availability for the requested workshop.
 *
 * @param workshopId - Positive workshop identifier used by the API.
 */
export async function getAvailability(workshopId: number): Promise<AvailabilityResponse> {
  const response = await requestJson<AvailabilityResponseWire>(
    '/api/workshops/' + workshopId + '/availability',
  )

  return normalizeAvailabilityResponse(response)
}

/**
 * Creates a reservation using the server as the authoritative validator.
 *
 * @param payload - Reservation data collected by the participant flow.
 */
export async function createReservation(
  payload: CreateReservationPayload,
): Promise<CreateReservationResponse> {
  const response = await requestJson<CreateReservationResponseWire>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return normalizeCreateReservationResponse(response)
}
