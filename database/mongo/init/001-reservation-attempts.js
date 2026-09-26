// Read the application password from the environment in production while preserving the development default.
const appPassword = process.env.MONGO_APP_PASSWORD || 'atelier_logs_dev'

// Create the application user with readWrite access only to the logging databases.
const adminDb = db.getSiblingDB('admin')

if (!adminDb.getUser('atelier_logs')) {
  adminDb.createUser({
    user: 'atelier_logs',
    pwd: appPassword,
    roles: [
      { role: 'readWrite', db: 'atelier_solidaire_logs' },
      { role: 'readWrite', db: 'atelier_solidaire_logs_test' },
    ],
  })
}

const schema = {
  bsonType: 'object',
  additionalProperties: false,
  required: [
    'workshopId',
    'slotId',
    'categoryId',
    'outcome',
    'reason',
    'createdAt',
  ],
  properties: {
    _id: {
      bsonType: 'objectId',
    },
    workshopId: {
      bsonType: ['double', 'int', 'long', 'null'],
    },
    slotId: {
      bsonType: ['double', 'int', 'long', 'null'],
    },
    categoryId: {
      bsonType: ['double', 'int', 'long', 'null'],
    },
    outcome: {
      enum: ['accepted', 'refused'],
    },
    reason: {
      enum: [
        'created',
        'validation_error',
        'slot_category_not_found',
        'booking_unavailable',
        'booking_closed',
        'capacity_full',
        'internal_error',
      ],
    },
    createdAt: {
      bsonType: 'date',
    },
  },
}

for (const databaseName of [
  'atelier_solidaire_logs',
  'atelier_solidaire_logs_test',
]) {
  const logsDb = db.getSiblingDB(databaseName)

  if (!logsDb.getCollectionNames().includes('reservation_attempts')) {
    logsDb.createCollection('reservation_attempts', {
      validator: {
        $jsonSchema: schema,
      },
      validationLevel: 'strict',
      validationAction: 'error',
    })
  }

  const attempts = logsDb.getCollection('reservation_attempts')

  attempts.createIndex(
    { workshopId: 1, outcome: 1, reason: 1 },
    { name: 'idx_workshop_outcome_reason' },
  )

  attempts.createIndex(
    { createdAt: 1 },
    {
      name: 'idx_created_at_ttl',
      expireAfterSeconds: 15552000,
    },
  )
}
