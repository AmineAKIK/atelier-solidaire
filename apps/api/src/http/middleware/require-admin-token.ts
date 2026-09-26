import { timingSafeEqual } from 'node:crypto'

import type { RequestHandler } from 'express'

/**
 * Builds bearer-token middleware using constant-time comparison for equal-length tokens.
 *
 * @param expectedToken - Validated administrative API token.
 * @returns Express middleware that returns 401 for absent or invalid credentials.
 */
export function requireAdminToken(expectedToken: string): RequestHandler {
  const expected = Buffer.from(expectedToken)

  return (request, response, next): void => {
    const authorization = request.header('authorization')

    if (!authorization?.startsWith('Bearer ')) {
      response.status(401).json({ code: 'unauthorized' })
      return
    }

    const supplied = Buffer.from(authorization.slice('Bearer '.length))
    const matches =
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected)

    if (!matches) {
      response.status(401).json({ code: 'unauthorized' })
      return
    }

    next()
  }
}
