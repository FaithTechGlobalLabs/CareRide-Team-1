// What's new in CareRide, newest first. The first entry is the version the badge shows,
// so add a new entry at the top whenever a release goes out.

export interface Release {
  version: string
  date: string // YYYY-MM-DD
  changes: string[]
}

export const RELEASES: Release[] = [
  {
    version: '1.0.1',
    date: '2026-10-04',
    changes: [
      'Drivers add a mobile number with their account, and no longer pick taxi, rideshare or volunteer.',
      'Professional drivers can finish sign-up without uploading identity papers.',
      'Bookings need a real, picked address, and bus slips can list transfers.',
      'Scheduled rides say whether the driver is early or late.',
      'Live hospital wait times show while booking a ride.',
      'Requests show the route before a driver accepts.',
      'Rides with no driver get a printable transit slip.',
      'Completed trips count the $2.58 Vancouver bus fare saved.',
    ],
  },
]

export const CURRENT_VERSION = RELEASES[0].version
