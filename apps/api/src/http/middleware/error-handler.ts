import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from 'express'

import { BookingError } from '../../domain/errors.js'

interface BodyParserError extends Error {
  status?: number
  type?: string
}

/**
 * Centralizes safe HTTP error translation without leaking SQL or stack details.
 */
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  if (isBodyParserError(error, 'entity.parse.failed')) {
    response.status(400).json({ code: 'invalid_json' })
    return
  }

  if (isBodyParserError(error, 'entity.too.large')) {
    response.status(413).json({ code: 'payload_too_large' })
    return
  }

  if (error instanceof BookingError) {
    response.status(error.status).json({
      code: error.code,
      ...error.details,
    })
    return
  }

  console.error(error)
  response.status(500).json({ code: 'internal_error' })
}

function isBodyParserError(
  error: unknown,
  type: string,
): error is BodyParserError {
  return (
    error instanceof Error &&
    'type' in error &&
    (error as BodyParserError).type === type
  )
}
