/** Clock abstraction used to keep time-based booking rules deterministic in tests. */
export interface Clock {
  /** Returns the current instant. */
  now(): Date
}

/** Production clock backed by the system time. */
export class SystemClock implements Clock {
  /** Returns the current system time. */
  public now(): Date {
    return new Date()
  }
}
