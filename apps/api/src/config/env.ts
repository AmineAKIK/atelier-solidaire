import { z } from 'zod'

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url(),
  MONGODB_URL: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        const url = new URL(value)
        return (
          (url.protocol === 'mongodb:' || url.protocol === 'mongodb+srv:') &&
          url.pathname.length > 1
        )
      } catch {
        return false
      }
    }, 'MONGODB_URL must include a MongoDB database name'),
  ADMIN_API_TOKEN: z.string().min(32),
})

/** Validated runtime configuration for the API process. */
export type Environment = z.infer<typeof environmentSchema>

/**
 * Validates environment variables before infrastructure dependencies are created.
 *
 * @param source - Process environment values to validate.
 * @returns A typed environment configuration.
 * @throws {Error} When any required value is missing or invalid.
 */
export function loadEnvironment(source: NodeJS.ProcessEnv): Environment {
  const parsed = environmentSchema.safeParse(source)

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error('Invalid API environment configuration: ' + fields)
  }

  return parsed.data
}

/**
 * Extracts the default database name from a validated MongoDB connection URL.
 *
 * @param mongodbUrl - MongoDB connection URL containing a database path.
 * @returns The database name encoded in the URL.
 * @throws {Error} When the URL does not contain a database name.
 */
export function getMongoDatabaseName(mongodbUrl: string): string {
  const databaseName = new URL(mongodbUrl).pathname.replace(/^\//, '')

  if (!databaseName) {
    throw new Error('MONGODB_URL must include a database name')
  }

  return databaseName
}
