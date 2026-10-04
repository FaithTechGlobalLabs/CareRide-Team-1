# CareRide: Design (Draft)

Visual and tone guidelines for the CareRide web app. **Draft v0.2** for team review. v0.2 applies the draft to the code and removes the generic "AI default" look (see §12).

**In three words:** sturdy, plain, kind. **One impression to leave:** "this will get them there."

## 1. Direction

CareRide is an independent third-party platform. The Salvation Army is our pilot partner, not our owner. The design is **inspired by** Salvation Army branding, not a copy of it.

What we borrow is the *spirit*: **warm, humble, practical, and dependable**. Bold primary colours, plain speech, no frills, built to be used by busy people.

What we do not borrow:

- The shield, crest, or any Salvation Army logo or wordmark
- The exact red-and-yellow pairing as our primary identity
- Their typefaces, taglines, or "Salvation Army" voice
- Anything that could read as official endorsement

> Source note: the first linked PDF (ID standards) is a small logo sheet. It gives Pantone 109 (yellow) and Pantone 185 (red), and no typography or voice rules. Everything beyond those two colours below is our own interpretation. Check the full brand standards before using any SA marks in the pilot (e.g. a "Pilot partner" badge on Belkin House screens), and get written permission first.

### What we learn from the Salvation Army brand strategy

A second source ("0202. Branding", PRD Manual extract) is about brand strategy, not visuals. Three ideas are worth echoing:

1. **A brand is emotion and consistency, not just a logo.** Their image is a "sphere": it looks the same from any angle. Every CareRide screen, email, SMS, and driver message should feel like the same calm, reliable helper.
2. **The promise must be lived, not just stated.** Their "Giving Hope Today" has three parts: *Giving* (nothing kept back), *Hope* (a better outcome is possible), *Today* (relevant right now). We use the same three-part structure with our own promise: **"Rides that show up. Today."**

   | Their idea | Our version in the product |
   | --- | --- |
   | Giving | Free for residents, no strings. Nothing asked of the client, nothing stored about them. |
   | Hope | A confirmed ride means a resident gets to the appointment that matters. Show that outcome, not the mechanics. |
   | Today | Immediacy. Live status, fast offers, and an unfilled ride is surfaced right away, never silently. |

3. **Lead with "today".** Their point about staying immediately relevant maps to our product: real-time status, clear times, "now" language.

Not borrowed: the faith-based framing. Their brand is explicitly spiritual and mission-led. CareRide is secular and serves any organization, so we echo the warmth and structure, never the religious message.

**Rule of thumb:** if someone screenshots a CareRide screen, they should say "that's CareRide", not "that's the Salvation Army".

## 2. Principles

1. **Clear over clever.** Staff are mid-task, often on a phone. One main action per screen.
2. **Warm, not corporate.** Friendly, human, never clinical or charity-pitying.
3. **Dignity first.** The client is never shown as a "case". Ask only for what the driver needs (an optional first name helps them find the right person), and no sad imagery.
4. **Obvious status.** A ride is booked, offered, accepted, or unfilled. The colour and label say so at a glance.
5. **Accessible by default.** WCAG 2.2 AA minimum. Works outdoors, on old phones, with large text.

## 3. Colour

We keep the existing CareRide blue/aqua identity (from the heart-road logo) as the **primary**, and add a Salvation Army-inspired **warm red** and **golden yellow** as supporting colours. Blue = trust and structure. Red = action and care. Yellow = attention and welcome.

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Ink | `ink` | `#0b1557` | Headings, wordmark, strong text |
| Primary | `brand-600` | `#1d4fe0` | Primary buttons, links, active nav |
| Primary hover | `brand-700` | `#1a3fba` | Hover/pressed |
| Primary tint | `brand-50` / `brand-100` | `#eef4ff` / `#dbe7ff` | Selected rows, info panels |
| Accent red | `coral-600` | `#e03c24` | Urgent/unfilled, destructive, "needs attention" |
| Accent red (SA-inspired) | `care-red` | `oklch(0.56 0.2 30)` | "Needs attention" status, small highlights |
| Accent yellow | `sun-400` | `oklch(0.837 0.164 84)` | "Waiting for driver" status, org admin role |
| Yellow tint | `sun-50` / `sun-100` | `oklch(0.987 0.022 95)` / `oklch(0.962 0.059 95)` | Notice banners |
| Success | `emerald-600` | `#059669` | Accepted / completed |
| Neutral text | `slate-800` / `slate-600` | `#1e293b` / `#475569` | Body / secondary |
| Canvas | `canvas` | `oklch(0.982 0.005 260)` | App background. Flat, no glows. Light enough that `slate-500` text still passes 4.5:1. |
| Surface | `white` | | Cards, header, inputs. Sits one step above the canvas. |

New tokens are written in OKLCH. The older brand scale stays in hex until it is next touched.

**Role tones** (`tones` and `ROLE_TONE` in `src/components/ui.ts`). Each role gets one solid colour, never a gradient:

| Role | Tone | Colour |
| --- | --- | --- |
| Partner organization | `brand` | Brand blue. They are the main users. |
| Driver | `teal` | Teal |
| Org admin (driver provider) | `amber` | Sun yellow fill, ink text |
| CareRide admin | `ink` | Navy |

Violet and indigo are out of the palette. They only appear inside the logo artwork.

**Usage ratio:** roughly 70% neutral/white, 20% blue, 10% red + yellow combined. Red and yellow are seasoning, not the base.

**Rules**

- Do not place red and yellow side by side as a banner or hero. That is the SA signature; keep them apart.
- Yellow is never used for text on white. Use it as a fill with `ink` text on top.
- Never rely on colour alone for status. Always pair with an icon and a text label.
- Minimum contrast: 4.5:1 body text, 3:1 large text and UI boundaries. Check `coral-600` on white (about 4.4:1) before using for small text; use `coral-700` `#bb2f1a` for text.
- The existing gradients (`bg-brand-gradient`, `bg-spectrum`) are for the logo and hero only, not UI chrome.

### Ride status colours

Matches `RideStatus` in `src/types/index.ts` and the labels in `StatusBadge.tsx`.

| Status | Colour | Icon | Label |
| --- | --- | --- | --- |
| `SEARCHING` | Blue tint | Clock | "Finding a driver" |
| `OFFERED` | Sun yellow fill, ink text | Bell | "Waiting for driver" |
| `ACCEPTED` | Green tint | Check | "Driver confirmed" |
| `PICKED_UP` | Cyan tint | Car | "Picked up" |
| `COMPLETED` | Slate tint | Check-circle | "Completed" |
| `NEEDS_ATTENTION` | Care red fill, white text | Alert triangle | "Needs attention" |
| `NO_SHOW` | Coral tint | User-x | "Client didn't show" |
| `CANCELLED` | Slate, muted | X-circle | "Cancelled" |
| `CANCELLED`, sent on transit | Teal tint | Bus | "Sent on transit" |

Done in v0.2: `StatusBadge` follows this table, with the icon beside the words (`STATUS_ICON`). The short phone label in the ride list uses the same icons. Status is never shown by colour alone.

On a `RideCard`, the badge carries the status. Only a ride that needs someone gets more: a light red strip across the top of the card that says why in words ("No driver has accepted yet", "Late: the client hasn't been picked up"). Finished rides (completed, no-show, cancelled) turn their route grey, so live rides stand out.

## 4. Typography

Keep the current pairing. It is friendly and legible, and avoids SA's typefaces.

> Decision (v0.2): the deslop checklist flags Inter as the most common AI-default face. We kept it on purpose: it is very legible at small sizes on old phones, and Nunito already gives the warmth. Revisit if the team wants a more distinctive body face (Atkinson Hyperlegible and Figtree are the candidates).

Sizes in use: 14 and 16px for UI and body, 18 to 24px for card and section titles, 30 to 36px for page titles, 48 to 60px for the landing hero only.

- **Display / headings:** Nunito, 700–900. Rounded, warm.
- **Body / UI:** Inter, 400–600. Neutral and highly legible at small sizes.

| Style | Size / line | Weight |
| --- | --- | --- |
| Page title | 28–32 / 1.2 | Nunito 800 |
| Section title | 20–22 / 1.3 | Nunito 700 |
| Body | 16 / 1.5 | Inter 400 |
| Label / button | 14–16 / 1.25 | Inter 600 |
| Caption | 13 / 1.4 | Inter 500 |

- Never go below 16px for body on mobile.
- Sentence case everywhere. No ALL CAPS except short status chips.
- Line length 60–75 characters for prose.

## 5. Shape, spacing, layout

- **Radius:** 12px (`rounded-xl`) for cards, inputs, tiles and dialogs. 9999px (`rounded-full`) for every button, chip and avatar. 8px (`rounded-lg`) only for small inline controls such as icon buttons and text links with a hover fill. Nothing larger than 12px on a card.
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48. Tailwind defaults.
- **Touch targets:** 48×48px minimum. Staff may be wearing gloves or in a hurry.
- **Layout:** mobile-first, single column up to 640px, max content width 960px. Booking flows are step-by-step, one question per step.
- **Elevation:** one approach per element. In-page cards get a `slate-200` border and no shadow. Shadows are only for things that float: menus, dialogs, toasts, the floating "Request a ride" button. No coloured glow shadows.
- **Background:** flat `canvas`. No radial glows, blurred blobs, or frosted glass. Sticky bars are solid white.

### Signature move: the road rule

A solid 4px rule across the top edge, like the road in the logo. It appears in four places only:

1. The top of every page (app header, landing header, auth screens, landing footer). Brand blue.
2. The next-pickup panel and the closing call to action on the landing page. One of each per screen, so it still means "this one matters".
3. The route on every ride card: an open brand-blue dot for pickup, a filled dot for drop-off, joined by a short blue line. It turns grey once the ride is over.
4. The landing "How it works" steps, which sit on one horizontal (or, on phones, vertical) road line.

It replaces the old rainbow `bg-spectrum` bar. Plain cards (audience cards, stat tiles) get no rule; a bar on every card stops meaning anything. Never put the rule on the left side of a card: side stripes are the most recognisable "AI template" tell.

## 6. Components

- **Primary button:** solid `brand-600` fill, white text, pill. Hover `brand-700`, pressed `brand-800`. One per screen. No gradient, no glow.
- **Urgent button:** red fill, white text, used only for "Rebook now" on an unfilled ride.
- **Secondary button:** white with blue border and blue text.
- **Status chip:** tinted background, matching text, icon, label (see §3).
- **Cards:** white, `slate-200` border, 12px radius, no coloured top bar (see the road rule).
- **Banners:** yellow tint for notices, red tint for problems, blue tint for info. Always include an icon and a clear next action.
- **Forms:** visible labels above fields (no placeholder-only labels), helper text below, inline errors in `coral-700` with an icon.
- **Focus:** 3px `brand-500` ring with 2px offset on buttons, links, chips and choice cards. Text inputs instead turn their border `brand-500` and add a soft 3px `brand-100` halo, so the caret stays the focus. Never remove outlines. On navy surfaces the ring is white with a navy offset.
- **White text on colour:** use the 700 step of teal, coral and emerald (600 fails 4.5:1). Brand blue passes at 600. Sun yellow always takes ink text.
- **Stat tiles:** label first with a small coloured icon inline, then the number. No icon tile stacked above the value.
- **Section headings:** no small all-caps "kicker" label above the heading, and no pill above the hero headline. The heading stands on its own.
- **Empty states:** one friendly line and one action. E.g. "No rides yet. Book the first one."

## 7. Imagery and iconography

- **Icons:** one set only (e.g. Lucide), 2px stroke, rounded caps. Pair with text.
- **Illustration:** simple, flat, warm shapes built from the heart-and-road motif. No stock photos of people in distress.
- **Photography (if used):** drivers and everyday journeys, not clients. Never identifiable clients, in line with our no-client-data rule.
- **Logo:** use the CareRide heart-road mark. No partner logos in the header. A small, optional "Pilot partner: The Salvation Army" text line in the footer, only with permission.

## 8. Voice and tone

Plain, kind, and brief. Speak to staff and drivers as capable colleagues.

| Instead of | Say |
| --- | --- |
| "Beneficiary transportation request submitted" | "Ride booked. We're finding a driver." |
| "Error 422: validation failed" | "Add a pickup time to continue." |
| "No drivers available" | "No driver has accepted yet. You can rebook or call the backup." |
| "Clients in need" | "Clients" |

- Use "client" or "passenger", as the app does on main. Never "case", "subject", or "the homeless".
- Use active verbs on buttons: "Book ride", "Accept", "Decline".
- Calm under pressure: unfilled rides are urgent, not alarming. State the problem, then the next step.
- No jargon, no exclamation marks, no religious language. CareRide serves any organization.

## 9. Accessibility checklist

- [ ] All text meets 4.5:1 contrast (3:1 for large text and UI)
- [ ] Status never conveyed by colour alone
- [ ] Full keyboard operation and visible focus
- [ ] Touch targets 48px+
- [ ] Respects `prefers-reduced-motion` (already in `index.css`)
- [ ] Works at 200% zoom and with large system text
- [ ] Screen-reader labels on icon-only buttons
- [ ] Plain-language copy, reading level around grade 6–8

## 10. Implementation notes

Tokens live in `src/index.css` under `@theme`: `canvas`, `care-red`, `sun-50`, `sun-100`, `sun-400`, alongside the existing brand, aqua and coral scales.

Shared class names live in `src/components/ui.ts` (`card`, the button set, `input`, `tones`, `ROLE_TONE`). Change these before touching a screen; most screens inherit from them.

The only gradient left is `text-brand-gradient`, for the "Ride" in the logo wordmark. The old `bg-brand-gradient`, `bg-warm-gradient`, `bg-fresh-gradient` and `bg-spectrum` utilities were removed.

Motion was left as it was in v0.2 (fade-up entrances, the `pop` overshoot, the floating logo, confetti). The checklist flags the overshoot easing and the infinite float; that is a separate decision.

**Delight rules (v0.3).** Delight has to carry information, or it doesn't ship.

- **The road shows progress.** On a `RideCard` the pickup dot fills once a driver confirms, a small dot travels the road while the client is in the car, and the whole route turns green on arrival. The next-pickup panel shows the same stages as four stops (`RideProgress`, `rideStage`).
- **Status changes are seen and heard.** A badge that changes on screen settles in with a soft brand ring, and a polite live region reads the new status. Nothing animates on first load.
- **Confetti is for milestones only:** a driver's 1st, 5th, 10th, 25th and every 50th ride. Other drop-offs get a calm check and a thank-you.
- **Impact in words.** Drivers see how many people they've helped, beside their numbers.
- **A buzz for new requests.** The Android app gives a short vibration when a new request reaches a driver. Not on first load, and never on the web.
- **No names for now.** Messages don't add a driver's or client's name, since the data may not match what is happening on the ground.
- All of it respects reduced motion (see the global rule in `src/index.css`).

## 11. Open questions

1. Do we want any visible SA acknowledgement during the pilot, and has SA approved it?
2. Do we keep the full blue/aqua/violet logo palette, or simplify to blue + red + yellow?
3. Should each partner organization be able to apply a light theme (accent colour and logo) later?
4. Do we get the full SA brand standards document to confirm what is safe to echo?
5. Keep Inter, or move the body face to something more distinctive (§4)?
6. Calm the motion (§10)?

## 12. Slop audit

Checked against the `frontend-design-deslop` checklist on 2026-10-03.

- **Artifact:** a mobile-first operations app for partner staff and drivers, plus a public landing page.
- **Positioning:** utilitarian and caring, not corporate. **Adjectives:** warm, humble, practical, dependable.
- **Aesthetic:** sturdy, plain, kind. Flat canvas, white cards with edges, one blue, navy for weight.
- **Type:** Nunito display, Inter body (kept, see §4). **Palette:** brand blue dominant, navy, with care red and sun yellow as seasoning.
- **Signature move:** the road rule (§5).

| Area | Before | After |
| --- | --- | --- |
| Colour | Blue-to-violet gradient buttons, gradient text on the hero and the dashboard greeting, rainbow top bar, violet partner role | Solid fills only; violet removed; gradient kept for the logo wordmark |
| Background | Three radial glows on the body, blurred blobs behind the hero, dashboard and cards | Flat canvas |
| Visual detail | Border plus diffuse shadow on cards, 16 to 40px radii, frosted sticky bars, coloured left edge on ride cards | Border only, 12px max, solid bars, top rule instead of side stripe |
| Type and structure | Pill above the hero headline, all-caps kicker above every section, icon tiles above every card heading, sparkle icons | Headings stand alone, icons inline with headings, demo accounts listed with dividers instead of cards within a card |
| Focus | Pale 4px `brand-100` ring, hard to see | 3px `brand-500` ring with offset |

Still open: Inter as the body face (kept by choice) and motion (left alone by choice).

## Changelog

- **v0.3 (2026-10-04):** Delight that carries information: the route fills in as the ride goes, a progress road on the next-pickup panel, status changes announced, confetti only for milestones, a driver impact line, and a buzz for new requests on Android.
- **v0.2.1 (2026-10-04):** Status badges get icons. Ride cards lose the coloured top bar: the route is drawn as a short blue road, and only rides that need action get a red note strip. Decorative bars removed from landing audience cards and the hero preview.
- **v0.2 (2026-10-03):** Applied the draft to the code. Added the canvas and OKLCH accent tokens, the road rule signature, and the role tone table. Removed gradients, glows, blur and violet across the app.
- **v0.1:** First draft for team review.
