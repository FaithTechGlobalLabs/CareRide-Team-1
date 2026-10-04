// The "See it in action" slide: the real app, one frame per role, at each moment of one ride.
// The driver is Maya in the demo data; the slide just says "the driver".
// Every moment is made with the real data service, so the screens always match the current app.
import { ridePath } from '../../logic/homeFor'
import { estimateFare } from '../../logic/estimateFare'
import { dataService } from '../../services'
import { STORAGE_KEY, resetDemoData } from '../../services/mockService'
import type { NewRide } from '../../services/dataService'

const PARTNER = 'u-belkin'
const DRIVER = 'u-olive' // Maya, the driver shown
const FRANK = 'd-frank'
const MAYA = 'd-olive'

type Moment = 'start' | 'booked' | 'accepted' | 'onTheWay' | 'pickedUp' | 'droppedOff'

export interface LiveStep {
  short: string
  title: string
  caption: string
  moment: Moment // which saved database snapshot to show
  staff: 'request' | 'ride' // the booking form, or the ride's page
  staffScroll?: string // text of a heading to scroll the staff frame to
  driverScroll: string // id of the section to scroll the driver's phone to
}

export const LIVE_STEPS: LiveStep[] = [
  {
    short: 'Needs a ride',
    title: 'A resident needs a ride',
    caption: 'They ask staff at Belkin House.',
    moment: 'start',
    staff: 'request',
    driverScroll: 'requests-title',
  },
  {
    short: 'Booked',
    title: 'Staff book the ride',
    caption: 'It goes to drivers who can take it.',
    moment: 'booked',
    staff: 'ride',
    driverScroll: 'requests-title',
  },
  { short: 'Accepted', title: 'A driver accepts', caption: 'Staff are told right away.', moment: 'accepted', staff: 'ride', driverScroll: 'current-title' },
  {
    short: 'Slip',
    title: 'A slip for the resident',
    caption: 'Printed in large type: when, where to wait, and who’s coming.',
    moment: 'accepted',
    staff: 'ride',
    staffScroll: 'Your ride',
    driverScroll: 'current-title',
  },
  {
    short: 'On the way',
    title: 'The driver is on the way',
    caption: 'Staff can see when they’ll arrive.',
    moment: 'onTheWay',
    staff: 'ride',
    driverScroll: 'current-title',
  },
  {
    short: 'Picked up',
    title: 'Picked up from the lobby',
    caption: 'Staff see each step as it happens.',
    moment: 'pickedUp',
    staff: 'ride',
    driverScroll: 'current-title',
  },
  {
    short: 'Dropped off',
    title: 'Dropped off at St. Paul’s',
    caption: 'Staff know the resident has arrived.',
    moment: 'droppedOff',
    staff: 'ride',
    driverScroll: 'current-title',
  },
]

export interface LiveDemo {
  snapshots: Partial<Record<Moment, string>>
  rideId: string
  warning?: string // the story couldn't be told as written, e.g. a driver is outside their request hours
}

export const frameSrc = (path: string, as: 'partner' | 'driver') => `${path}?as=${as === 'partner' ? PARTNER : DRIVER}`

// Next quarter hour, at least 75 minutes away: past both drivers' one-hour notice.
function pickupSoon(): Date {
  const at = new Date(Date.now() + 75 * 60_000)
  at.setMinutes(Math.ceil(at.getMinutes() / 15) * 15, 0, 0)
  return at
}

// Resets the demo data, then plays one ride through the real service, saving the database after each moment.
// Leaves the last moment in place, so you can switch to the app and carry on from there.
// One build at a time: React runs effects twice in development, and two builds would book two rides.
let building: Promise<LiveDemo> | undefined
export function buildLiveDemo(): Promise<LiveDemo> {
  building ??= build().finally(() => (building = undefined))
  return building
}

async function build(): Promise<LiveDemo> {
  resetDemoData()
  for (const key of Object.keys(localStorage)) if (key.startsWith('careride-seen-')) localStorage.removeItem(key)
  const snapshots: LiveDemo['snapshots'] = {}
  const snap = (moment: Moment) => (snapshots[moment] = localStorage.getItem(STORAGE_KEY) ?? '')
  const problems: string[] = []
  snap('start')

  const [house] = await dataService.listHouses('org-belkin')
  const dest = (await dataService.listDestinations('org-belkin')).find((d) => d.id === 'dest-stp-belkin')!
  const pickup = pickupSoon()
  const base: Omit<NewRide, 'pickupAddress' | 'pickupTime' | 'destinationId' | 'destinationName' | 'destinationAddress'> = {
    type: 'SCHEDULED',
    orgId: house.orgId,
    houseId: house.id,
    requestedBy: PARTNER,
    passengers: 1,
    needsWheelchair: false,
    needsAssistance: false,
    estimatedFareSaved: estimateFare(),
  }

  const ride = await dataService.requestRide({
    ...base,
    pickupAddress: house.address,
    pickupTime: pickup.toISOString(),
    pickupInstructions: 'Front lobby',
    destinationId: dest.id,
    destinationName: dest.name,
    destinationAddress: dest.address,
  })
  const offers = await dataService.listOffersForRide(ride.id)
  const offerTo = (driverId: string) => offers.find((o) => o.driverId === driverId && o.status === 'PENDING')
  if (!offerTo(MAYA)) problems.push('the demo driver wasn’t asked (they may be outside their request hours)')
  snap('booked')

  const frankOffer = offerTo(FRANK)
  if (frankOffer) await dataService.respondToOffer(frankOffer.id, false)
  const mayaOffer = offerTo(MAYA)
  if (mayaOffer) await dataService.respondToOffer(mayaOffer.id, true)
  snap('accepted')

  const at = (fn: () => Promise<unknown>) => (mayaOffer ? fn() : Promise.resolve())
  await at(() => dataService.markOnTheWay(ride.id, 10))
  snap('onTheWay')
  await at(() => dataService.markDriverArrived(ride.id))
  await at(() => dataService.markPickedUp(ride.id))
  snap('pickedUp')
  await at(() => dataService.markCompleted(ride.id))
  snap('droppedOff')

  return {
    snapshots,
    rideId: ride.id,
    warning: problems.length ? `Heads up: ${problems.join(', and ')}. Switch to the app to show this part.` : undefined,
  }
}

export const staffPath = (demo: LiveDemo, step: LiveStep) => (step.staff === 'request' ? '/partner/request' : ridePath(demo.rideId))

export function showSnapshot(demo: LiveDemo, step: LiveStep): void {
  const data = demo.snapshots[step.moment]
  if (data && localStorage.getItem(STORAGE_KEY) !== data) localStorage.setItem(STORAGE_KEY, data)
}
