// Pitch slides, in order. Speaker notes show with the N key.
// `steps` slides are clicked through one moment at a time before the deck moves on.
import { LIVE_STEPS } from './liveSteps'

export type SlideId = 'title' | 'story' | 'problem' | 'heard' | 'live' | 'values' | 'thanks'

export const SLIDES: { id: SlideId; label: string; steps?: number; notes: string[] }[] = [
  {
    id: 'title',
    label: 'CareRide',
    notes: ['Hi, we’re Adi, Noah and Gilbert.', 'CareRide helps staff book rides for residents who don’t have a smartphone.'],
  },
  {
    id: 'story',
    label: 'Story',
    notes: ['Picture a resident at Belkin House with an appointment at St. Paul’s.', 'They don’t have a smartphone, so ride apps aren’t an option.'],
  },
  {
    id: 'problem',
    label: 'Problem',
    notes: [
      'Many clients don’t have a smartphone, or aren’t comfortable using ride apps.',
      'There’s no shared way to request, track, or share rides between organizations.',
      'So staff arrange rides by hand, and without a ride, people can miss appointments.',
    ],
  },
  {
    id: 'heard',
    label: 'User testing',
    notes: ['We ran a user testing session with an early version.', 'These were the biggest lessons, and what we changed because of them.'],
  },
  {
    id: 'live',
    label: 'In action',
    steps: LIVE_STEPS.length,
    notes: [
      'These are the real app screens, for staff and for a driver, at each moment of one ride.',
      'If there’s time, switch to the app and show a step live. The data is left at the last step.',
      'Reset the demo data from the app menu afterwards if you need a clean start.',
    ],
  },
  {
    id: 'values',
    label: 'What guided us',
    notes: [
      'Residents don’t need a phone, an app, or an account, and we don’t store their details.',
      'Staff can follow every ride, so no one is forgotten.',
      'Any organization can join. Belkin House is where we started.',
    ],
  },
  {
    id: 'thanks',
    label: 'Thank you',
    notes: ['Thank you. We’d love your questions.'],
  },
]
