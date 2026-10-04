# CareRide developer guide

Everything you need to run, demo, build, and deploy CareRide. For what CareRide is and why it exists, start with the [README](../README.md).

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

**No environment variables, API keys, database setup, or backend server are required for the demo.** Seed data loads automatically. A Google Maps key is optional: it adds route maps and drive times for drivers (see [Google Maps (optional)](#google-maps-optional)).

## Try the demo

Open **Sign in** and choose a one-tap demo account, or use one of the credentials below. All seeded demo accounts use the password **`careride`**.

| Account | Email | Explore |
| --- | --- | --- |
| Belkin House | `belkin@careride.demo` | Book, change, and track a client's ride. |
| Frank | `frank@careride.demo` | Accept requests and complete rides. |
| CareRide Admin | `admin@careride.demo` | Review pending approvals and manage accounts. |

Additional partner and driver accounts appear on the sign-in page. Demo records are fictional except for public place names and addresses. Belkin House, Richmond House, and Grace Mansion use their real addresses, and each starts with saved destinations taken from its case workers' answers in [PARTNER_ORG_NOTES.md](../PARTNER_ORG_NOTES.md).

### Walk through a complete ride

1. **Sign in as Belkin House.** For a clean starting point, use **Reset demo data** in the footer and confirm the reset.
2. **Request an on-demand ride.** Choose St. Paul's Hospital, enter a fictional name, and request one passenger without wheelchair access. Submit the request.
3. **Open a second tab at the same local URL.** Sign in as **Frank**, who receives requests at any time in the seed data, and accept the offer.
4. **Return to the Belkin House tab.** Review the confirmation and print the client's ride slip if desired.
5. **On Frank's Rides page**, follow the trip steps: **I'm on my way** (for an on-demand ride, optionally how far away you are; for a scheduled ride, whether you'll be early or late), **I'm here**, **Client is in the car**, then **Client dropped off**. Watch the trip timeline update in the Belkin House tab.
6. **Check the Belkin House view.** The ride is complete. Choose **Book the return trip** to explore the linked return workflow.

Tabs on the same browser origin share ride data while keeping their own sign-in sessions. Changes synchronize through browser storage events and a four-second refresh while a signed-in tab is visible. Separate browsers, devices, and origins have independent demo data.

**Reset demo data restores every account, ride, and setting to the seeded state for that browser origin.** Use fictional information throughout the walkthrough.

### Pitch deck

The HACKVAN pitch lives at **[/demo](https://careride-team-1.careride.workers.dev/demo)** (locally, `http://localhost:5173/demo`). It follows the event's [pitch guidelines](../PITCH_GUIDELINES.md), and its "See it in action" slide plays one ride through the real app, with the staff and driver screens side by side.

- **→ / Space / Page Down** next, **← / Page Up** back, so presentation clickers work. **N** shows speaker notes, **F** goes full screen.
- Each forward click on the live slide shows a tap on one screen, then the other screen catching up. Going back jumps straight to that step.
- **Opening the live slide resets the demo data in that browser** and leaves it at the last step, so you can switch to the app and carry on from there.

## Developer guide

### Stack

| Layer | Technology |
| --- | --- |
| Interface | React 19, TypeScript 6 |
| Routing | React Router 7 |
| Styling and icons | Tailwind CSS 4, Lucide React |
| Development and build | Vite 8 |
| Code quality | ESLint with TypeScript and React rules |
| Demo persistence | `localStorage` for data and sign-in, plus a per-tab `sessionStorage` copy of the sign-in |
| Deployment configuration | Cloudflare Workers (static assets plus a Worker script) via Wrangler |
| Mobile | Capacitor 8 Android wrapper around the same Vite build |

### Architecture

Pages access application data through a typed **`DataService`** contract. [`src/services/index.ts`](../src/services/index.ts) picks the implementation: the browser mock by default, or Supabase when `VITE_DATA_BACKEND=supabase`. The `/demo` pitch deck always uses the mock.

```text
src/
├── pages/          Role-specific screens: auth, partner, driver, org, admin
├── components/     Shared UI, forms, ride cards, notices, and printable slips
├── context/        Current user, session state, and refresh coordination
├── hooks/          Data loading and current-user helpers
├── logic/          Driver matching, dispatch, request hours, and ride utilities
├── services/
│   ├── dataService.ts      Typed backend contract
│   ├── index.ts            Active backend selection
│   ├── mockService.ts      Browser persistence and ride lifecycle operations
│   ├── supabaseService.ts  Supabase Auth, tables, and database functions
│   └── seed.ts             Demo accounts and initial records
├── native/         Capacitor-only helpers: session, back button, print, external links
├── types/          Shared domain models
├── App.tsx         Application routes
└── index.css       Global styles and design tokens
```

Ride rules live in two places that must stay in step: [`src/logic/dispatch.ts`](../src/logic/dispatch.ts) with [`src/services/mockService.ts`](../src/services/mockService.ts) for the demo, and the SQL functions under [`supabase/migrations`](../supabase/migrations) for the shared backend. Identity comes from Supabase Auth. Row access and ride changes are enforced in the database, not by the screens. The service-role key stays in Edge Functions (`delete-my-account`, `admin-delete-account`) and never in a `VITE_` variable.

Start with [the service contract](../src/services/dataService.ts), [driver matching](../src/logic/matchDrivers.ts), and [dispatch rules](../src/logic/dispatch.ts).

### Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the committed lockfile. |
| `npm run dev` | Start the local Vite development server. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the ride-rule tests. |
| `npm run build` | Run TypeScript project checks and create the production build in `dist/`. |
| `npm run preview` | Serve an existing production build locally. |
| `npm run deploy` | Zip the current `dist/` as an Android live-update bundle, then deploy with Wrangler. Run `npm run build` first. |
| `npm run ota:prepare` | Write `dist/ota/` (zip + manifest) for the Android updater. Used by `npm run deploy`. |
| `npm run android:sync` | Build the website and copy it into the Android project. |
| `npm run android:apk` | Sync, then build a debug APK with Gradle. Live updates are on unless `CAPACITOR_OTA=0`. |
| `npx cap open android` | Open the Android project in Android Studio. |

`npm test` covers matching, offer expiry, the give-up clock, no-shows, and which rides a closing partner account cancels. Those checks run against the TypeScript rules the demo uses. The SQL functions are the rules for the shared backend, so a change to one side needs the same change on the other. For ride behavior, also exercise the partner and driver workflows in separate tabs, including declines, cancellations, and uncovered requests.

### Deployment

The repository includes [wrangler.jsonc](../wrangler.jsonc) for Cloudflare Workers. Static files still serve from `dist/` with single-page application fallback. A Worker script is included so the Cloudflare dashboard can attach variables and secrets. `/api/*` is reserved for that Worker.

With access to the intended Cloudflare account:

```bash
npx wrangler login
npm run build
npm run deploy
```

`npm run deploy` also publishes an Android live-update zip under `/ota/`. If the Cloudflare dashboard's deploy command is `npx wrangler deploy` instead of `npm run deploy`, set the **build command** to `npm run build && npm run ota:prepare` so phones can fetch that zip.

To run the already-implemented Supabase backend on Cloudflare, set these as **Workers Builds** variables (they are baked in at `npm run build`; they are not Worker runtime secrets):

- `VITE_DATA_BACKEND=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Keep the Supabase service-role key out of `VITE_` variables. After this Worker exists, dashboard **Settings → Variables and Secrets** also works for runtime secrets if you add server routes later.

Without those build variables, production stays on the localStorage mock. For another static host, publish `dist/` and configure application routes to fall back to `index.html`.

### Android app

The same Vite build is packaged as an Android app with Capacitor. A default build uses the demo (mock) data, which stays on each phone, so walk through a ride on one phone by switching accounts.

**Shared data with Supabase:** the app reads the same `VITE_` settings as the website when it's built. To make phones share real data (a partner books on one phone and the driver accepts on another), put these in `.env.local` before running `npm run android:apk`:

```dotenv
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
VITE_PUBLIC_SITE_URL=https://careride-team-1.careride.workers.dev
```

`VITE_PUBLIC_SITE_URL` is the website that confirmation and reset-password emails open. The app's own address (`https://localhost`) can't be opened from an email, so people confirm or reset on the website, then sign in in the app. Add that address with `/**` under Supabase **Authentication → URL Configuration → Redirect URLs**. Sign-ins stay on the phone until the person signs out.

GitHub Actions has no `.env.local`. To bake the same settings into the **careride-debug-apk** artifact, add these as repository **Actions** secrets (**Settings → Secrets and variables → Actions**):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_SITE_URL`
- `VITE_GOOGLE_MAPS_API_KEY` (optional)
- `VITE_GOOGLE_MAPS_MAP_ID` (optional)

Keep the Supabase service-role key out of those secrets. When the URL and publishable key are present, the workflow sets `VITE_DATA_BACKEND=supabase`. Pull requests from forks do not receive secrets, so those APKs stay on demo data.

**Requirements:** Android Studio with the Android SDK (API 36), or `nix develop` in this repository, which provides Node 22, JDK 21, and the SDK. JDK 21 is required for Gradle.

```bash
npm ci
npm run android:apk
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. On a pull request, GitHub Actions uploads the same file as the **careride-debug-apk** artifact. Install it with Android Studio, `npx cap open android`, or `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

**Live updates:** after one APK that includes the updater (a local `npm run android:apk`, or a **Run workflow** debug APK), website deploys replace the JavaScript on the phone. Open the app so it can download, then leave it and come back — the new bundle applies when it moves to the background. Pull-request APK artifacts stay frozen on that branch's website so reviewers can try the PR. Native changes (plugins, permissions, Gradle) still need a new APK. To build a phone APK that will not overwrite itself from production, use `CAPACITOR_OTA=0 npm run android:apk`.

The website is unchanged: the marketing page still opens at `/`, and a closed browser tab still signs you out.

### Google Maps (optional)

With a Google Maps key, drivers see:

- **Before accepting:** about how long the ride takes, and, if they share their location, how far they are from the pickup. The pickup address stays hidden until they accept.
- **On their current ride:** a map of the route from pickup (A) to drop-off (B), with a dashed line from where they are to the pickup until the client is in the car.

Without a key, nothing changes: drivers keep the **Directions** buttons that open Google Maps.

**Set it up (about 10 minutes):**

1. In [Google Cloud Console](https://console.cloud.google.com/), create or pick a project and turn on billing. Google Maps Platform has a monthly free allowance; check [current pricing](https://mapsplatform.google.com/pricing/).
2. Under **APIs & Services → Library**, enable **Maps JavaScript API** and **Routes API**. Both are required: routes are worked out by the Routes API, even though they're requested through the JavaScript API.
3. Under **APIs & Services → Credentials**, create an API key and restrict it:
   - **Application restrictions → Websites:** `http://localhost:5173/*`, your deployed domain (for example `https://careride.example.workers.dev/*`), `https://localhost/*` for the Android app, and `https://*.trycloudflare.com/*` if you demo through a Cloudflare tunnel.
   - **API restrictions:** Maps JavaScript API and Routes API.
4. Copy `.env.example` to `.env.local` and paste the key into `VITE_GOOGLE_MAPS_API_KEY`. `.env.local` is git-ignored.
5. Restart `npm run dev`.

`VITE_GOOGLE_MAPS_MAP_ID` is optional. Without it, the map uses Google's `DEMO_MAP_ID`. For production, create a Map ID under **Google Maps Platform → Map management** (JavaScript, vector) and set it.

**Deploying:** Vite builds the key into the JavaScript, so set `VITE_GOOGLE_MAPS_API_KEY` wherever `npm run build` runs: Cloudflare Workers **Build variables**, and the GitHub Actions secret of the same name for the Android APK. It is not a runtime Worker variable. The key is visible to anyone who opens the site or APK, which is normal for Maps JavaScript keys; the website restriction in step 3 is what protects the web build.

**Things to know:**

- Each route is requested once per page load and remembered, so the four-second refresh doesn't call Google again. Only the current ride shows a map.
- The browser asks for the driver's location only when they tap **Use my location**. Once they've allowed it, the driver's screens read it again on later visits without a tap; the organization's Bookings page never does. It's kept in memory for that tab, rounded to about 100 m, and sent only to Google to work out the drive time. Browsers only ask for location over HTTPS or on `localhost`, so a phone opening `http://192.168.x.x:5173` won't get the prompt. Use a tunnel or the Android app instead.
- If Google rejects the key (wrong restrictions, an API not enabled, or billing off), the maps and times disappear and the Directions buttons stay. Check the browser console for the reason.
- Drive times don't include traffic.

## Current boundaries and next steps

This MVP demonstrates the coordination workflow. The following details matter when evaluating it or planning a pilot:

| Area | Current implementation | Next step |
| --- | --- | --- |
| **Accounts and permissions** | The demo stores passwords in browser storage. Supabase builds use Auth, row-level access, and database functions. Passwords shorter than 8 characters are rejected. The local config file has no switch for breached passwords. | Turn on leaked-password protection for the hosted project under Authentication → Providers → Email before a pilot. |
| **Client information** | Staff enter a name. The assigned driver sees the notes and destination while the ride is theirs. A driver who declined, or who lost the race, does not keep that access. | Agree on the minimum identifying information needed for a pilot. |
| **Driver verification** | Administrators can approve profiles; document inputs retain file names only. This is a demo stand-in. Real verification is a separate process. | Define that process outside the demo approval buttons. |
| **Updates and notifications** | Supabase builds push table changes, including profile updates, and run deadlines on the server. The demo polls browser storage. There is no SMS. | Add booking notifications when a pilot needs them. |
| **Matching** | Rule-based eligibility and offer handling; no live vehicle location or route optimization. | Validate dispatch rules with operators and add location-aware matching if needed. |
| **Impact** | Each completed trip counts as one adult one-zone Vancouver bus fare (**$2.58**), not once per passenger. The dashboards say so. | Keep that meaning unless a pilot asks for a per-passenger total. |
| **Group and recurring trips** | Passenger counts are supported; combining separate requests and recurring bookings are not available in the UI. | Add group ride suggestions and recurring ride workflows. |

CareRide covers essential, non-emergency transportation. Booking screens direct medical emergencies to **911**.

## Contributing

Issues and pull requests are welcome. Describe the affected role and workflow, keep changes focused, and include steps for a reviewer to reproduce the result. Run `npm test`, `npm run lint`, and `npm run build` before submitting code changes.

Use fictional data when developing or sharing screenshots. For product changes, prioritize clear language, usable mobile layouts, and an explicit next step when a ride cannot be covered.

## Product context

- [Problem statement](../PROBLEM_STATEMENT.md) — the transportation challenge that inspired CareRide.
- [Product description](../PRODUCT_DESCRIPTION.md) — detailed scope, roles, models, and proposed workflows.
- [Flows and notes](../FLOWS_AND_NOTES.md) — stakeholder journeys and open operational questions.
- [Product strategy](../PRODUCT_STRATEGY.md) — broader planning and future directions.
- [Judging criteria](../JUDGING_CRITERIA.md) — hackathon evaluation context.

These documents include planning assumptions that may differ from the current implementation. The README and this guide describe the code's current behavior, including concurrent driver offers and the booking name field.

