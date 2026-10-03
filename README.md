<p align="center">
  <img src="public/assets/logo.png" alt="CareRide" width="240" />
</p>

# CareRide

**Free rides to essential services. Less coordination for staff. One less barrier to care.**

CareRide connects housing and social service organizations with drivers and transport providers who can offer free rides. Staff book on a client's behalf, drivers accept suitable requests, and everyone involved can follow the trip through to drop-off. The client needs no smartphone, app, payment, or account.

Built for **HACKVAN 2026**, inspired by the transportation needs of **Belkin Communities of Hope** in Vancouver.

**[Get started](#get-started) · [Try the demo](#try-the-demo) · [How it works](#how-it-works) · [Developer guide](#developer-guide)**

> **Project status:** Working hackathon MVP with a browser-based mock backend. CareRide is an independent platform; organizations and public place names used in the demo do not imply an official partnership or endorsement.

## Why CareRide exists

A medical appointment, a housing meeting, or a visit to social services can depend on something as simple as getting there. For people without a smartphone or the confidence to navigate a ride-hailing app, arranging that trip often falls to housing staff.

Meanwhile, willing drivers, community vehicles, and transport providers are scattered across organizations. Staff spend time calling around, coordinating pickups, and checking whether a client arrived.

CareRide brings those steps into one shared workflow: **request a ride, find a driver, confirm the pickup, and close the loop at drop-off.**

## Who it serves

| Participant | What they can do |
| --- | --- |
| **House staff** | Use one shared account per housing location to request rides, track progress, print reminders, and book return trips. |
| **Partner organizations** | Manage houses, saved destinations, and their own drivers; book rides and oversee requests across their locations. |
| **Transport providers** | Manage drivers, review incoming bookings, and coordinate rides delivered by their team. |
| **Drivers** | Accept or decline requests, report arrival and trip progress, and choose when to receive requests. |
| **Platform administrators** | Approve organizations and drivers, manage sign-in accounts, and reset passwords. |
| **Clients** | Ask staff for a ride and travel to their destination, without managing an account. |

Partner organizations and transport providers share the organization administrator role, with workflows tailored to the organization type.

## How it works

1. **Staff request a ride.** Choose a saved destination or enter an address, select scheduled or on-demand pickup, and provide passenger count, travel needs, and meeting instructions.
2. **CareRide finds eligible drivers.** Matching considers approval, service city, passenger capacity, wheelchair access, request hours, and advance notice for scheduled trips.
3. **A driver accepts.** Eligible drivers are normally asked together; the first acceptance assigns the ride. A preferred driver, such as the outbound driver for a return trip, is asked first on their own.
4. **Staff prepare the client.** The ride detail page shows the assigned driver and vehicle, with a printable reminder for clients without a phone.
5. **The driver reports progress.** “I'm here,” “Picked up,” and “Dropped off: tell the house” keep staff informed through completion.
6. **Staff arrange the return if needed.** A return is a separate, linked ride with the route reversed and the original driver preferred.

```mermaid
flowchart LR
    A[Staff request a ride] --> B[Match eligible drivers]
    B --> C[Driver accepts]
    C --> D[Pickup]
    D --> E[Drop-off confirmed]
    B --> F[Needs attention]
    F --> G[Staff retry or arrange a fallback]
    G --> B
```

If a request cannot be covered, staff see **Needs attention** and can retry or consider the suggested free alternatives. A driver who can no longer make an accepted ride can release it so CareRide asks other drivers. Cancellations and no-shows have explicit outcomes.

**Request hours control when a driver receives offers**, rather than guaranteeing availability at the pickup time. Drivers decide whether each trip works for them. Offers expire after **5 minutes for on-demand rides** or **60 minutes for scheduled rides**.

### What is included

- **Booking built around staff:** frequently visited destinations, saved locations, custom addresses, trip purposes, passenger counts, wheelchair requirements, and assistance notes.
- **Driver controls:** vehicle details, passenger capacity, service cities, weekly request hours, minimum notice, and a pause switch for incoming requests.
- **Clear ride tracking:** request and offer history, acceptance and cancellation notices, arrival confirmation, current rides, and past rides.
- **Organization onboarding:** registration for partner organizations, transport providers, and independent drivers, followed by administrator approval.
- **Offline reminders:** large-text printable ride slips with pickup instructions, driver, vehicle, and a house contact number.
- **Impact reporting:** completed rides, estimated fare savings, approved organizations, and approved drivers.
- **Responsive interface:** layouts for desktop and mobile, plain-language actions, and statuses communicated with both text and color.

## Get started

### Requirements

- **Node.js 22 or later.** The repository's `.nvmrc` pins `22.23.2` for a consistent development environment.
- **npm**, included with Node.js.
- A modern browser with local storage enabled.

### Run locally

```bash
git clone https://github.com/FaithTechGlobalLabs/CareRide-Team-1.git
cd CareRide-Team-1
npm ci
npm run dev
```

Open the local URL printed by Vite, normally **http://localhost:5173**.

If you use nvm, run `nvm install` and `nvm use` in the repository before installing dependencies.

**No environment variables, API keys, database setup, or backend server are required for the demo.** Seed data loads automatically.

## Try the demo

Open **Sign in** and choose a one-tap demo account, or use one of the credentials below. All seeded demo accounts use the password **`careride`**.

| Account | Email | Explore |
| --- | --- | --- |
| Belkin House | `belkin@careride.demo` | Book and track a client's ride. |
| Frank | `frank@careride.demo` | Accept requests and complete rides. |
| Salvation Army Admin | `salvationarmy@careride.demo` | Manage houses, destinations, drivers, and bookings. |
| Community Van Share Admin | `vanshare@careride.demo` | Coordinate bookings for a transport provider. |
| CareRide Admin | `admin@careride.demo` | Review pending approvals and manage accounts. |

Additional house and driver accounts appear on the sign-in page. Demo records are fictional except for public place names; some house addresses are placeholders.

### Walk through a complete ride

1. **Sign in as Belkin House.** For a clean starting point, use **Reset demo data** in the footer and confirm the reset.
2. **Request an on-demand ride.** Choose St. Paul's Hospital, enter a fictional name, and request one passenger without wheelchair access. Submit the request.
3. **Open a second tab at the same local URL.** Sign in as **Frank**, who receives requests at any time in the seed data, and accept the offer.
4. **Return to the house tab.** Review the confirmation and print the client's ride slip if desired.
5. **In Frank's My rides page**, select **I'm here**, then **Picked up**, then **Dropped off: tell the house**.
6. **Check the house view.** The ride is complete. Choose **Book the return trip** to explore the linked return workflow.

Tabs on the same browser origin share ride data while keeping their own sign-in sessions. Changes synchronize through browser storage events and a four-second refresh while a signed-in tab is visible. Separate browsers, devices, and origins have independent demo data.

**Reset demo data restores every account, ride, and setting to the seeded state for that browser origin.** Use fictional information throughout the walkthrough.

## Developer guide

### Stack

| Layer | Technology |
| --- | --- |
| Interface | React 19, TypeScript 6 |
| Routing | React Router 7 |
| Styling and icons | Tailwind CSS 4, Lucide React |
| Development and build | Vite 8 |
| Code quality | ESLint with TypeScript and React rules |
| Demo persistence | `localStorage` for data; `sessionStorage` for sign-in state |
| Deployment configuration | Cloudflare Workers static assets via Wrangler |

### Architecture

Pages access application data through a typed **`DataService`** contract. The current implementation stores demo records in the browser. The backend selection lives in one file, providing a defined integration point for a future API.

```text
src/
├── pages/          Role-specific screens: auth, house, driver, org, admin
├── components/     Shared UI, forms, ride cards, notices, and printable slips
├── context/        Current user, session state, and refresh coordination
├── hooks/          Data loading and current-user helpers
├── logic/          Driver matching, dispatch, request hours, and ride utilities
├── services/
│   ├── dataService.ts   Typed backend contract
│   ├── index.ts         Active backend selection
│   ├── mockService.ts   Browser persistence and ride lifecycle operations
│   └── seed.ts          Demo accounts and initial records
├── types/          Shared domain models
├── App.tsx         Application routes
└── index.css       Global styles and design tokens
```

Start with [the service contract](src/services/dataService.ts), [driver matching](src/logic/matchDrivers.ts), and [dispatch rules](src/logic/dispatch.ts) to understand the core behavior. Account and ride state changes live in [the mock service](src/services/mockService.ts).

To introduce a real backend, implement `DataService` and select it in [src/services/index.ts](src/services/index.ts). Production authentication, authorization, synchronization, and secure document handling will also need integration.

### Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the committed lockfile. |
| `npm run dev` | Start the local Vite development server. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Run TypeScript project checks and create the production build in `dist/`. |
| `npm run preview` | Serve an existing production build locally. |
| `npm run deploy` | Deploy the existing `dist/` build using Wrangler. |

There is currently no automated test suite or `npm test` script. For changes to ride behavior, run lint and build, then exercise the house and driver workflows in separate tabs, including declines, cancellations, and uncovered requests where relevant.

### Deployment

The repository includes [wrangler.jsonc](wrangler.jsonc) for Cloudflare Workers static asset hosting. It configures single-page application fallback so direct links to application routes can load correctly.

With access to the intended Cloudflare account:

```bash
npx wrangler login
npm run build
npm run deploy
```

Deployment publishes the frontend; demo records remain in each visitor's browser. For another static host, publish `dist/` and configure application routes to fall back to `index.html`.

## Current boundaries and next steps

This MVP demonstrates the coordination workflow. The following details matter when evaluating it or planning a pilot:

| Area | Current implementation | Next step |
| --- | --- | --- |
| **Accounts and permissions** | Credentials, including passwords, are stored in plain text in browser storage. Sign-in and navigation run in the frontend. | Add production authentication and server-enforced role and organization access. |
| **Client information** | The booking form requires a name, and rides and printed slips can contain it. Notes and travel needs are also stored locally. | Agree on the minimum identifying information needed and implement appropriate privacy controls. |
| **Driver verification** | Administrators can approve profiles; document inputs retain file names only. | Define verification procedures and add secure document storage. |
| **Updates and notifications** | Browser storage synchronization and polling; no actual SMS or email delivery. | Add shared persistence, live updates, and booking notifications. |
| **Matching** | Rule-based eligibility and offer handling; no live vehicle location or route optimization. | Validate dispatch rules with operators and add location-aware matching if needed. |
| **Impact** | Fare savings use a flat estimate of **$25 per completed ride**. | Validate the estimate or replace it with a distance-based calculation. |
| **Group and recurring trips** | Passenger counts are supported; combining separate requests and recurring bookings are not available in the UI. | Add group ride suggestions and recurring ride workflows. |

CareRide covers essential, non-emergency transportation. Booking screens direct medical emergencies to **911**.

## Contributing

Issues and pull requests are welcome. Describe the affected role and workflow, keep changes focused, and include steps for a reviewer to reproduce the result. Run `npm run lint` and `npm run build` before submitting code changes.

Use fictional data when developing or sharing screenshots. For product changes, prioritize clear language, usable mobile layouts, and an explicit next step when a ride cannot be covered.

## Product context

- [Problem statement](PROBLEM_STATEMENT.md) — the transportation challenge that inspired CareRide.
- [Product description](PRODUCT_DESCRIPTION.md) — detailed scope, roles, models, and proposed workflows.
- [Flows and notes](FLOWS_AND_NOTES.md) — stakeholder journeys and open operational questions.
- [Product strategy](PRODUCT_STRATEGY.md) — broader planning and future directions.
- [Judging criteria](JUDGING_CRITERIA.md) — hackathon evaluation context.

These documents include planning assumptions that may differ from the current implementation. This README describes the code's current behavior, including concurrent driver offers and the booking name field.

## Team and license

Built by **Adi, Noah, and Gilbert** for **HACKVAN 2026** in the FaithTechGlobalLabs community.

Released under the [MIT License](LICENSE).
