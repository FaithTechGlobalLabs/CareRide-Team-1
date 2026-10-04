// Pitch slides, in order. Speaker notes show with the N key.
// `steps` slides are clicked through one moment at a time before the deck moves on.
import { LIVE_STEPS } from './liveSteps'

export type SlideId = 'title' | 'problem' | 'impact' | 'approach' | 'live' | 'story' | 'lessons' | 'thanks'

// The talk follows a light hook, problem, pursuit, payoff arc:
// the hook is one resident's trip, the pursuit is what we built and learned, and the payoff is that trip, made.
// Timing from the HACKVAN guidelines (PITCH_GUIDELINES.md, 6 to 8 minutes): about 3 minutes for title to approach,
// 2 to 3 for the result and demo, and 2 for the story, lessons, and next steps.
export const SLIDES: { id: SlideId; label: string; kicker: string; steps?: number; notes: string[] }[] = [
  {
    id: 'title',
    label: 'CareRide',
    kicker: 'HACKVAN 2026',
    notes: [
      'Hook: picture someone at Belkin House with a hospital appointment tomorrow, and no phone to book a ride.',
      'We’re Adi, Noah and Gilbert. CareRide lets Belkin House staff book that ride for them.',
    ],
  },
  {
    id: 'problem',
    label: 'Problem',
    kicker: 'The problem',
    notes: [
      'Clients at transitional housing like Belkin House are often unable to use phones or other technology.',
      'Uber, Lyft, and taxis need phones to book, so case workers end up searching for a ride for each person.',
      'There’s no shared way to request, track, or share rides between organizations.',
      'Without a ride, people can miss medical appointments and essential care.',
    ],
  },
  {
    id: 'impact',
    label: 'Impact',
    kicker: 'Potential impact',
    notes: [
      'If this works, getting to care no longer depends on owning a phone.',
      'Staff get time back, and organizations can share drivers instead of each finding their own.',
      'Belkin House is the start. Richmond House and Grace Mansion are next, and any organization can join.',
    ],
  },
  {
    id: 'approach',
    label: 'Approach',
    kicker: 'Our approach',
    notes: ['We built a working MVP, not a prototype.', 'Our angle: staff book on the resident’s behalf, so the resident needs nothing new.'],
  },
  {
    id: 'live',
    label: 'Result & demo',
    kicker: 'See it in action',
    steps: LIVE_STEPS.length,
    notes: [
      'What we built: booking for staff, an app for drivers, and approvals for the admin.',
      'Back to our resident. Each click plays one moment: the tap on one screen, then the other screen catching up.',
      'If there’s time, switch to the app and show a step live. The data is left at the last step.',
    ],
  },
  {
    id: 'story',
    label: 'Story',
    kicker: 'The story',
    notes: [
      'We each worked with a coding agent, and brought the work together through pull requests.',
      'Who did what, then a success and a challenge from the weekend.',
    ],
  },
  {
    id: 'lessons',
    label: 'Lessons',
    kicker: 'We ran a user testing session',
    notes: ['We tested an early version with Belkin House on Saturday.', 'These were the biggest lessons, and what we changed because of them.'],
  },
  {
    id: 'thanks',
    label: 'Next steps',
    kicker: 'Thank you',
    notes: [
      'Payoff: the resident from the start got to St. Paul’s, and didn’t need a phone to do it.',
      'Next steps come from our user testing notes. Say what you’d like from the audience, then take questions.',
    ],
  },
]
