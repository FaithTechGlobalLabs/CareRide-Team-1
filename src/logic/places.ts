import type { Destination } from '../types'

// Places partner case workers said they send clients most (see PARTNER_ORG_NOTES.md).
// Sign-up offers these as one-tap destinations, and the demo data saves them for each house.
// General answers like "walk-in clinics" or "Service Canada" use the office nearest the houses.
// The Genesis Program is left out: it's a recovery residence, so its address isn't listed.

export type PlaceGroup = 'HOSPITAL' | 'HEALTH' | 'SERVICES' | 'COMMUNITY' | 'LEARNING'

export type KnownPlace = Pick<Destination, 'name' | 'address' | 'city'> & { key: string; group: PlaceGroup }

// In the order staff look for them: health care first, then offices, then everyday places.
export const PLACE_GROUPS: { id: PlaceGroup; label: string }[] = [
  { id: 'HOSPITAL', label: 'Hospitals' },
  { id: 'HEALTH', label: 'Health centres and clinics' },
  { id: 'SERVICES', label: 'Government and employment' },
  { id: 'COMMUNITY', label: 'Community and drop-in' },
  { id: 'LEARNING', label: 'Libraries and education' },
]

export const KNOWN_PLACES: KnownPlace[] = [
  // Hospitals
  { key: 'stp', group: 'HOSPITAL', name: "St. Paul's Hospital", address: '1081 Burrard St, Vancouver', city: 'Vancouver' },
  { key: 'vgh', group: 'HOSPITAL', name: 'Vancouver General Hospital', address: '899 W 12th Ave, Vancouver', city: 'Vancouver' },
  { key: 'aac', group: 'HOSPITAL', name: 'Access and Assessment Centre (VGH)', address: '803 W 12th Ave, Vancouver', city: 'Vancouver' },
  { key: 'rh', group: 'HOSPITAL', name: 'Richmond Hospital', address: '7000 Westminster Hwy, Richmond', city: 'Richmond' },

  // Health centres and clinics
  { key: '3b', group: 'HEALTH', name: 'Three Bridges Community Health Centre', address: '1128 Hornby St, Vancouver', city: 'Vancouver' },
  { key: 'raven', group: 'HEALTH', name: 'Raven Song Community Health Centre', address: '2450 Ontario St, Vancouver', city: 'Vancouver' },
  {
    key: 'ground',
    group: 'HEALTH',
    name: "Groundspring Primary Care (Lily's Community Health Centre)",
    address: '38 W Hastings St, Vancouver',
    city: 'Vancouver',
  },
  { key: 'reach', group: 'HEALTH', name: 'REACH Community Health Centre', address: '1145 Commercial Dr, Vancouver', city: 'Vancouver' },
  { key: 'upcc', group: 'HEALTH', name: 'Richmond City Centre Urgent & Primary Care', address: '110-4671 No. 3 Rd, Richmond', city: 'Richmond' },
  { key: 'thrive', group: 'HEALTH', name: 'Thrive Medical Clinic (walk-in)', address: '8060-11688 Steveston Hwy, Richmond', city: 'Richmond' },
  { key: 'vogel', group: 'HEALTH', name: 'Anne Vogel Clinic', address: '210-7671 Alderbridge Way, Richmond', city: 'Richmond' },
  { key: 'trans', group: 'HEALTH', name: 'VCH Transitions Program', address: '600-8100 Granville Ave, Richmond', city: 'Richmond' },

  // Government and employment
  { key: 'msdpr', group: 'SERVICES', name: 'MSDPR Vancouver Office (Dockside)', address: '180 Main St, Vancouver', city: 'Vancouver' },
  { key: 'svc', group: 'SERVICES', name: 'Service Canada Centre', address: '978 Granville St, Vancouver', city: 'Vancouver' },
  { key: 'msdpr-rmd', group: 'SERVICES', name: 'MSDPR Richmond Office', address: '220-7577 Elmbridge Way, Richmond', city: 'Richmond' },
  { key: 'workbc', group: 'SERVICES', name: 'WorkBC Centre Richmond (No. 5 Road)', address: '1030-10820 No. 5 Rd, Richmond', city: 'Richmond' },
  { key: 'icbc', group: 'SERVICES', name: 'ICBC Driver Licensing, Lansdowne Centre', address: '402-5300 No. 3 Rd, Richmond', city: 'Richmond' },

  // Community and drop-in
  { key: 'carn', group: 'COMMUNITY', name: 'Carnegie Community Centre', address: '401 Main St, Vancouver', city: 'Vancouver' },
  { key: 'gather', group: 'COMMUNITY', name: 'The Gathering Place', address: '609 Helmcken St, Vancouver', city: 'Vancouver' },
  { key: 'kettle', group: 'COMMUNITY', name: 'The Kettle Society', address: '1725 Venables St, Vancouver', city: 'Vancouver' },
  { key: 'rcafe', group: 'COMMUNITY', name: 'Recovery Café', address: '620 Clark Dr, Vancouver', city: 'Vancouver' },
  { key: 'mposs', group: 'COMMUNITY', name: 'Mission Possible', address: '648 E Hastings St, Vancouver', city: 'Vancouver' },
  { key: 'junc', group: 'COMMUNITY', name: 'Vancouver Junction', address: '1669 E Broadway, Vancouver', city: 'Vancouver' },
  { key: 'dewc', group: 'COMMUNITY', name: "Downtown Eastside Women's Centre", address: '302 Columbia St, Vancouver', city: 'Vancouver' },
  { key: 'belkin', group: 'COMMUNITY', name: 'Belkin House', address: '555 Homer St, Vancouver', city: 'Vancouver' },
  { key: 'brig', group: 'COMMUNITY', name: 'Brighouse Drop-In Centre', address: '7840 Granville Ave, Richmond', city: 'Richmond' },
  { key: 'caring', group: 'COMMUNITY', name: 'Richmond Caring Place', address: '140-7000 Minoru Blvd, Richmond', city: 'Richmond' },

  // Libraries and education
  { key: 'vpl', group: 'LEARNING', name: 'Vancouver Public Library, Central Branch', address: '350 W Georgia St, Vancouver', city: 'Vancouver' },
  { key: 'vcc', group: 'LEARNING', name: 'Vancouver Community College, Downtown', address: '250 W Pender St, Vancouver', city: 'Vancouver' },
  { key: 'south', group: 'LEARNING', name: 'South Hill Education Centre', address: '6010 Fraser St, Vancouver', city: 'Vancouver' },
  { key: 'ironlib', group: 'LEARNING', name: 'Ironwood Library', address: '8200-11688 Steveston Hwy, Richmond', city: 'Richmond' },
]

const BY_KEY = new Map(KNOWN_PLACES.map((p) => [p.key, p]))

export function knownPlace(key: string): KnownPlace {
  const place = BY_KEY.get(key)
  if (!place) throw new Error(`Unknown place: ${key}`)
  return place
}
