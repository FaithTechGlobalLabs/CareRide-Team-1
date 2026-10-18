import type { Ride, RideFeedback, RideStatus } from '../types'

// Feedback opens once a ride is over: dropped off, or the client didn't show.
export const FEEDBACK_STATUSES: RideStatus[] = ['COMPLETED', 'NO_SHOW']
export const MAX_FEEDBACK_NOTE = 500

export const FEEDBACK_NOT_YET = 'You can give feedback once the ride is over.'
export const RATING_REQUIRED = 'Choose thumbs up or thumbs down.'
export const ISSUE_REQUIRED = 'Say what went wrong.'
export const NOTE_TOO_LONG = `Keep it under ${MAX_FEEDBACK_NOTE} characters.`

export function canGiveFeedback(ride: Pick<Ride, 'status'>): boolean {
  return FEEDBACK_STATUSES.includes(ride.status)
}

// Thumbs up and down counts, e.g. for a driver's account details
export function ratingCounts(feedback: RideFeedback[]): { up: number; down: number } {
  return {
    up: feedback.filter((f) => f.rating === 'UP').length,
    down: feedback.filter((f) => f.rating === 'DOWN').length,
  }
}
