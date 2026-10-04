# CareRide: Step-by-Step Supabase Implementation Guide

**Audience:** Someone who knows this React project but has never used Supabase.

**Status:** Implementation plan, not an installed integration. The commands and code examples below describe future work. Creating this document does not create a Supabase project, change the backend, or upload data.

**Based on:** The CareRide code reviewed on October 3, 2026. The existing application passed `npm run build` and `npm run lint` during that review. The build reported a bundle-size warning; this is separate from the migration.

**Recommendation:** Keep the React interface and the existing service boundary. Move shared records into Supabase, use Supabase Auth for login, enforce permissions on the backend, and move authoritative ride decisions out of the browser.

## Contents

- [1. Understand what Supabase will replace](#1-understand-what-supabase-will-replace)
- [2. Understand the current CareRide architecture](#2-understand-the-current-careride-architecture)
- [3. Create a development Supabase project](#3-create-a-development-supabase-project)
- [4. Connect the React application](#4-connect-the-react-application)
- [5. Design the database tables](#5-design-the-database-tables)
- [6. Save database changes as migrations](#6-save-database-changes-as-migrations)
- [7. Define and enforce permissions](#7-define-and-enforce-permissions)
- [8. Replace login and session handling](#8-replace-login-and-session-handling)
- [9. Implement registration and approval](#9-implement-registration-and-approval)
- [10. Implement the Supabase data service](#10-implement-the-supabase-data-service)
- [11. Move the ride lifecycle to the backend](#11-move-the-ride-lifecycle-to-the-backend)
- [12. Run expiry and dispatch without an open browser](#12-run-expiry-and-dispatch-without-an-open-browser)
- [13. Upload and review driver documents](#13-upload-and-review-driver-documents)
- [14. Implement administrator account operations](#14-implement-administrator-account-operations)
- [15. Add live updates and reliable loading](#15-add-live-updates-and-reliable-loading)
- [16. Decide what stays in browser storage](#16-decide-what-stays-in-browser-storage)
- [17. Test the complete integration](#17-test-the-complete-integration)
- [18. Deploy and switch to Supabase](#18-deploy-and-switch-to-supabase)
- [19. Suggested implementation milestones](#19-suggested-implementation-milestones)
- [20. Troubleshooting](#20-troubleshooting)
- [21. Glossary](#21-glossary)

## 1. Understand what Supabase will replace

### The current situation

CareRide currently stores its main database as JSON in `localStorage`. Local storage is a small storage area belonging to a website inside one browser.

For example, a partner creates a ride on a laptop. A second tab in the same browser can see that ride because the tabs share local storage. A driver opening CareRide on a phone has a different storage area and cannot see the laptop's ride.

The current backend also keeps demo passwords in plain text. Its sign-in session is a user ID stored in `sessionStorage`. These arrangements support a demonstration, but they do not provide a trusted shared service.

### What Supabase provides

| Feature | Beginner explanation | CareRide use |
| --- | --- | --- |
| PostgreSQL database | A shared database containing connected tables | Organizations, locations, profiles, drivers, destinations, rides, and offers |
| Auth | A service that handles login accounts and sessions | Email/password sign-in, email verification, recovery, and sign-out |
| Storage | A place to upload files | Driver licences and professional verification documents |
| Realtime | A connection that reports changes to an open app | Refresh a partner's screen when a driver accepts or reports progress |
| Database functions | Operations that execute inside the database | Assign a ride and close other offers together |
| Edge Functions | Server-side code hosted by Supabase | Account invitations, privileged administration, and future external notifications |
| Cron | A scheduler that runs backend work regularly | Expire unanswered offers and process waiting rides |

These features have different jobs. Uploading a licence means using Storage; inserting a ride means using the database; signing in means using Auth.

### What Supabase will not automatically do

Supabase does not know CareRide's matching rules, approval process, or permitted status changes. Those rules must be implemented. Realtime does not automatically send SMS messages or booking emails, and a database does not automatically provide offline booking.

The existing React application can remain hosted on Cloudflare. It will communicate with Supabase over the internet. A separate general-purpose Node server is not required for the recommended starting architecture.

**Completion check:** You can explain why all devices need one shared database and why login, file uploads, and ride decisions are separate responsibilities.

## 2. Understand the current CareRide architecture

### The integration point already exists

Most screens access data through the `DataService` interface:

```text
Current:
React page → DataService → mockService → localStorage

Proposed:
React page → DataService → supabaseService → Supabase
```

The interface describes operations such as `requestRide`, `listDestinations`, and `respondToOffer`. A Supabase implementation can provide the same kinds of operations without teaching every component how to query a database.

### Files to understand before implementation

| File or directory | Current responsibility | Migration work |
| --- | --- | --- |
| [src/services/dataService.ts](src/services/dataService.ts) | Typed service contract | Preserve useful methods; revise Auth/admin methods where necessary |
| [src/services/index.ts](src/services/index.ts) | Selects `mockService` | Add explicit backend selection |
| [src/services/mockService.ts](src/services/mockService.ts) | Data persistence and ride lifecycle | Use as a behavior reference; retain for demo mode |
| [src/services/seed.ts](src/services/seed.ts) | Fictional demo data and credentials | Keep separate from real accounts and production records |
| [src/types/index.ts](src/types/index.ts) | Domain models | Align types with the database and document metadata |
| [src/context/AppContext.tsx](src/context/AppContext.tsx) | User state, session ID, storage events, polling | Load the authenticated profile and coordinate scoped updates |
| [src/context/appContext.ts](src/context/appContext.ts) | Context interface | Update session/loading/sign-out types |
| [src/hooks/useData.ts](src/hooks/useData.ts) | Loads and refreshes data | Add error handling and prevent stale data between users |
| [src/hooks/useCurrent.ts](src/hooks/useCurrent.ts) | Finds current organization/driver in broad lists | Replace with focused current-profile queries |
| [src/pages/auth/SignIn.tsx](src/pages/auth/SignIn.tsx) | Sign-in form and demo shortcuts | Connect Auth and hide production demo credentials |
| [src/pages/auth/register/Register.tsx](src/pages/auth/register/Register.tsx) | Registration workflow | Support email confirmation and resumable onboarding |
| [src/pages/auth/register/Done.tsx](src/pages/auth/register/Done.tsx) | Assumes signup means signed in | Show the actual confirmation and approval state |
| [src/components/RequireAuth.tsx](src/components/RequireAuth.tsx) and [src/App.tsx](src/App.tsx) | Signed-in route access | Add role-specific route guards |
| [src/pages/partner/RequestRide.tsx](src/pages/partner/RequestRide.tsx) | Booking, editing, return trips, draft storage | Use trusted booking operations and review draft privacy |
| [src/logic/dispatch.ts](src/logic/dispatch.ts) and [src/logic/matchDrivers.ts](src/logic/matchDrivers.ts) | Offer timing and eligibility | Implement authoritative backend equivalents |
| [src/components/form/FileField.tsx](src/components/form/FileField.tsx) | Retains only the selected filename | Retain actual files and show upload state |
| [src/pages/admin/Accounts.tsx](src/pages/admin/Accounts.tsx) | Password reset and account deletion | Replace temporary-password sharing with supported recovery |
| [src/components/Layout.tsx](src/components/Layout.tsx) | Shared navigation and demo reset | Make reset controls demo-only |
| [wrangler.jsonc](wrangler.jsonc) | Cloudflare static frontend deployment | Keep hosting; add build-time Supabase configuration |

Visual components such as `AuthShell`, `ConfirmButton`, form layout elements, and dashboard tiles generally need little or no Supabase-specific code.

### Current behavior to preserve

- A partner organization has one pickup location and a shared account.
- Drivers may register themselves or be added by an organization.
- An organization can add a driver who has no login account.
- Transport-provider accounts still work even though their sign-up path is hidden.
- Drivers receive offers based on vehicle capacity, city, wheelchair access, request hours, and notice requirements.
- Usually eligible drivers are asked together; a preferred driver is asked alone first.
- Return rides are separate bookings linked to an outbound ride.
- Editing important details can require driver reconfirmation.
- Drivers can release accepted rides and undo recent trip actions.

Some planning documents describe older workflows. Use the current code and README as the migration baseline; document any intentional behavior changes separately.

**Completion check:** You know which files integrate with Supabase and which components can stay focused on presentation.

## 3. Create a development Supabase project

### Purpose

Create a shared backend for development without mixing experiments with future operational data.

### Actions

1. Create a Supabase account and open the dashboard.
2. Create or choose a Supabase organization. Here, “organization” means the workspace owning the Supabase project. It is separate from CareRide's partner organizations.
3. Create a project with a clear development name, such as `careride-dev`.
4. Choose a region suitable for the intended users and the team's data-location requirements. Check the choices currently available in the dashboard rather than assuming a particular region is offered.
5. Save the database password securely. The database password is for database administration; it is not a frontend API key.
6. Wait for the project to become ready.
7. Find the project URL and publishable key in the project's connection/API settings.
8. Explore the dashboard sections for tables, SQL, Auth, Storage, and logs. Labels may change over time.

The URL identifies the project. The publishable key lets the browser connect to its API. Users still sign in separately, and database permissions control the data they can access. [Official API-key documentation](https://supabase.com/docs/guides/getting-started/api-keys)

### Environment separation

Start with development. Create a separate production project when preparing a pilot. Each project needs its own database migrations, Auth settings, Storage policies, scheduled jobs, and connection settings.

Keep all development rides and documents fictional. A development reset should affect only development.

**Completion check:** You have a ready development project, its URL, and its publishable key. No real client information has been imported.

## 4. Connect the React application

### Purpose

Give CareRide one reusable Supabase connection without changing all pages immediately.

### Actions

1. In the project root, install the browser client:

   ```bash
   npm install @supabase/supabase-js
   ```

2. Create `.env.local` with the development project details:

   ```dotenv
   VITE_DATA_BACKEND=mock
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

   Keep the mock backend selected while the Supabase implementation is incomplete. The `VITE_DATA_BACKEND` variable is a proposed CareRide setting, not a built-in Supabase setting.

3. Add `.env.example` containing placeholder values so teammates know which settings are required. The existing `.gitignore` ignores `*.local`, including `.env.local`.
4. Create a reusable client module, for example `src/services/supabaseClient.ts`.
5. Check required settings when Supabase mode is selected. A missing setting should produce a clear configuration error.
6. Restart the Vite development server after changing environment variables.

Example client initialization, for when Supabase mode is active:

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error('CareRide Supabase connection settings are missing.')
}

export const supabase = createClient(url, publishableKey)
```

This example is an initialization pattern, not the complete demo/production selection implementation. Avoid eagerly initializing this module in mock-only mode when its settings are absent.

Vite exposes `VITE_` values in browser code. Use only the publishable key there. Never put a secret key, service-role key, database password, or database connection string in a frontend environment variable. [Official React setup](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

### Decide session behavior before finalizing the client

CareRide currently gives each tab its own sign-in session. Default persistent browser Auth storage can share a session across tabs. Choose whether to retain tab-local sessions through a supported custom storage configuration or use shared sessions and separate browser profiles for multi-role testing. [Client initialization options](https://supabase.com/docs/reference/javascript/initializing)

**Completion check:** The app initializes a client in Supabase mode, mock mode still works without Supabase settings, and no privileged key is included in frontend files.

## 5. Design the database tables

### Purpose

Turn the current TypeScript models into connected database records. Avoid storing the entire local-storage JSON object in one database row; that would make permissions and concurrent updates unnecessarily difficult.

### Learn the basic vocabulary

A table stores one kind of thing, a row stores one instance, and a column stores one property. A primary key identifies a row. A foreign key links one row to another and helps prevent broken references.

For example, a `ride_offers` row links to one ride and one driver. An offer should not refer to a ride that does not exist.

### Recommended first schema

| Table | Suggested information | Important relationships |
| --- | --- | --- |
| `organizations` | ID, name, type, contact name/phone, notification contact, approval status | Parent of locations, destinations, and organization drivers |
| `houses` | ID, organization ID, name, address, city, phone | One pickup location per partner organization initially |
| `profiles` | ID, optional Auth user ID, name, phone, role, organization ID, house ID, active flag | App identity; may exist before an Auth login is created |
| `drivers` | ID, profile ID, organization ID, background, vehicle, seats, accessibility, cities, request hours, notice, approval status | Driver identity and vehicle eligibility |
| `destinations` | ID, organization ID, name, address, city, notes | Organization-owned saved destinations |
| `rides` | ID, organization/location/requester IDs, route, passenger information, needs, timing, status, driver links, lifecycle timestamps | Current and historical bookings |
| `ride_offers` | ID, ride ID, driver ID, status, sent/expiry/response times, optional dispatch revision | Driver requests and responses |
| `driver_documents` | ID, driver ID, document type, storage path, original filename, upload/review metadata | Private document references, not the file contents |

The document table is a recommended addition because a filename alone cannot describe an uploaded and reviewed document reliably.

### Keep Auth identity separate from app identity

Supabase manages login identities in its Auth system. CareRide profiles hold application-specific information. [User-management documentation](https://supabase.com/docs/guides/auth/managing-user-data)

For this project, use an independently generated profile ID and an optional, unique `auth_user_id` link. An organization-added driver can have a profile without an Auth account. A later invitation can attach the Auth account to that same profile.

Resolve the current app profile using the authenticated user's ID on the backend. Do not assume every `User.id` in today's code can become an Auth ID. Retain the distinction in adapters and types.

Do not create a `credentials` table or copy plaintext passwords from `seed.ts`. An email needed for app display can be maintained separately, with appropriate read restrictions; it is not a substitute for Auth identity.

### Map field names deliberately

TypeScript commonly uses `orgId`, while database columns commonly use `org_id`. Choose a consistent database convention and translate in the service layer:

```text
Database org_id → application orgId
Database pickup_time → application pickupTime
Database requested_by → application requestedBy
```

### Use appropriate data types and constraints

1. Use full UUIDs for new IDs. Do not carry forward the mock's shortened random IDs for new backend records.
2. Use timezone-aware timestamps (`timestamptz`) for pickup, offer expiry, and progress times.
3. Use integers with checks for positive passenger counts and seat counts.
4. Restrict status, role, and ride-type values using enums or check constraints.
5. Make required fields non-null and keep optional relationships nullable.
6. Use an array for service cities or a separate table if the requirements become more complex.
7. A validated JSON value is a reasonable starting point for the existing seven-day request-hours structure.
8. Add an explicit request-hours timezone, initially `America/Vancouver`.
9. Preserve the existing return-ride relationship and preferred/reconfirmation driver links.
10. Preserve destination name/address snapshots on rides so a later destination edit does not rewrite the historical booking.
11. Give offer rounds a revision or equivalent durable identity if retaining prior responses through retries and edits. Protect against duplicate active offers for the same ride/driver/round.
12. Add indexes for frequent organization, driver, status, and deadline queries.

### Preserve history when accounts change

Prefer deactivating a profile or driver over deleting records referenced by completed trips. Removing a login should not erase the trip's driver, requester, or organization history. Define account deactivation and data retention separately.

**Completion check:** Every current domain model has a planned home, drivers without logins are supported, and password storage is delegated to Auth.

## 6. Save database changes as migrations

### Purpose

A migration is a numbered or timestamped SQL file describing a database change. It lets every teammate and environment receive the same schema and permissions.

### Actions

1. Create a `supabase/migrations/` directory.
2. Save schema creation, access policies, database functions, and later changes as migration files.
3. Apply changes first to development.
4. Review the resulting tables and constraints in the dashboard.
5. Commit migrations alongside the application changes that depend on them.
6. Add new migrations for later changes rather than quietly editing an already-applied migration.

Suggested organization:

```text
supabase/
  migrations/
    <timestamp>_initial_schema.sql
    <timestamp>_access_policies.sql
    <timestamp>_onboarding_functions.sql
    <timestamp>_ride_functions.sql
    <timestamp>_scheduled_dispatch.sql
  functions/
    admin-accounts/
  tests/
    access_policies.test.sql
    ride_lifecycle.test.sql
```

For an initial learning session, the SQL Editor is a useful way to apply a reviewed migration to an empty development database. Record that it was applied; do not later rerun the same table-creation SQL as though the database were still empty.

For repeatable development, adopt the Supabase CLI and its migration workflow. A local Supabase stack needs Docker. A local reset rebuilds that local database, so use fictional data and understand the target before using reset commands. [Official migration workflow](https://supabase.com/docs/guides/local-development/database-migrations)

Generate database TypeScript types after the schema is established. Use them to catch mismatched column names and nullability; keep UI-facing domain types where they make the app easier to understand.

**Completion check:** A teammate can recreate the schema from committed files, and dashboard changes have not become undocumented dependencies.

## 7. Define and enforce permissions

### Purpose

Authentication answers “who are you?” Authorization answers “what may you do?” Both are required.

CareRide's current `RequireAuth` only checks that someone is signed in. Navigation choices are useful for usability, but a person can make an API request without using your buttons.

### CareRide permission plan

| Actor | Read access | Write access |
| --- | --- | --- |
| Signed-out visitor | No private CareRide records; optional deliberately public totals | Auth registration only, followed by controlled onboarding |
| Pending partner | Own onboarding/profile and permitted setup information | Finish own setup; no ride booking until approved |
| Approved partner | Own organization's destinations/bookings/drivers and limited related trip contact information | Book/change/cancel own rides; manage permitted setup |
| Pending driver | Own profile and documents | Finish own setup; no offer acceptance |
| Approved driver | Own offers, assigned rides, and necessary pickup contacts | Respond to own offers; update own settings and assigned trip progress |
| Transport-provider administrator | Own drivers and their offers/trips | Permitted responses on behalf of own drivers |
| Platform administrator | Records needed for review and administration | Approve/reject and perform controlled account operations |

### Actions

1. Enable Row Level Security, or RLS, on exposed application tables. RLS filters which rows a caller may access.
2. Give database API roles only the table operations they need through grants.
3. Define policies separately for reading, inserting, updating, and deleting.
4. Resolve trusted role and membership using the authenticated identity.
5. Check organization ownership for both existing records and proposed changes.
6. Prevent self-service updates to role, Auth links, organization membership, and approval status.
7. Restrict ride mutations to approved backend operations rather than allowing arbitrary status updates.
8. Test policies using real browser client sessions with different roles.

RLS protects rows, not automatically individual columns. Use restricted endpoints, safe views, column privileges, or separate public/private fields when a caller should receive only part of a record. Policy helpers must avoid recursive profile lookups. Views and privileged functions need their own access review. [Official RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Avoid the current broad user directory

`AppContext` currently downloads all users. Other pages use that list to show driver names. Do not expose every profile and email to preserve that convenience.

Replace those lookups with scoped results containing the permitted name, vehicle, and contact information for the relevant ride or organization. Booking previews can use a backend summary of eligible capacity rather than download all private driver profiles.

### Example ownership rule in plain language

“A partner may read a destination when the destination's organization matches the organization of their trusted profile.”

The backend must verify that relationship. A browser-supplied `orgId` is only a requested filter, never proof of membership.

**Completion check:** Partner A cannot access Partner B's records, Driver A cannot answer Driver B's offers, and users cannot promote themselves or approve themselves.

## 8. Replace login and session handling

### Purpose

Replace “a user ID saved in a tab” with a session issued by Supabase Auth, then load the corresponding CareRide profile.

### Actions

1. Implement email/password login using Supabase Auth.
2. Obtain the authenticated identity and load its linked active CareRide profile.
3. Make the app wait until both session restoration and profile loading finish before choosing a route.
4. Handle a valid Auth account with unfinished onboarding explicitly; do not show a permanent loading screen.
5. Subscribe to Auth state changes so login, logout, and session changes update the app.
6. Keep Auth callbacks lightweight. Coordinate asynchronous profile loading outside the callback rather than awaiting additional Auth calls inside it.
7. On logout, call Supabase sign-out and clear profile state, cached private data, and Realtime subscriptions.
8. Add role guards for `/admin`, `/partner`, `/org`, and `/driver` routes.
9. Show a useful error if the profile cannot load; distinguish that from being signed out.

The Auth SDK provides `signInWithPassword`, `signOut`, and session events. [Password authentication](https://supabase.com/docs/guides/auth/passwords) and [Auth state events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)

The current `signIn(user)` context method should no longer be able to establish backend identity just by accepting an arbitrary `User` object. Split session establishment from displaying the current profile.

### Session behavior and testing

If you choose shared persistent sessions, signing in on one tab may affect the other. Use separate browser profiles, browsers, or devices when testing a partner and driver concurrently.

If you retain tab-local storage, implement it through the SDK's supported storage configuration and test reloads, token refresh, confirmation links, and sign-out. A tab-local client does not guarantee that closing a browser revokes the server-side session immediately.

**Completion check:** Login, refresh, sign-out, expired-session handling, and role routing work without the mock session ID.

## 9. Implement registration and approval

### Purpose

Create login accounts and CareRide records reliably, including partial registration and email confirmation.

### Separate three states

1. **Auth account created:** Supabase knows the login identity.
2. **Email confirmed:** The person has proved access to the mailbox when confirmation is enabled.
3. **CareRide approved:** A platform administrator has approved the organization or driver.

A confirmed email does not imply permission to book or drive. A pending CareRide profile should be allowed to finish setup without performing approved-only operations.

### Recommended partner flow

1. Collect the current registration form information.
2. Create the Auth account and explain the email-confirmation step if required.
3. Once an authenticated session exists, complete onboarding through one trusted backend operation.
4. In that operation, create the profile, pending organization, pickup location, and selected destinations together.
5. Derive the allowed role and ownership links on the backend. Ignore attempts to supply administrator privileges or approved status.
6. Make completion repeatable without creating duplicate organizations if the browser retries.
7. Show “waiting for approval” until the administrator approves the organization.

Keep minimal account provisioning separate from full domain onboarding. If a database trigger creates a minimal profile, test it carefully: a failing trigger can prevent signup. Do not use user-editable signup metadata as authority to grant privileged roles. [User-management guidance](https://supabase.com/docs/guides/auth/managing-user-data)

### Recommended self-registering driver flow

1. Create and confirm the Auth account.
2. Create/link the app profile and pending driver record.
3. Upload actual documents after authentication, following Step 13.
4. Store successful upload references.
5. Show the pending review state.
6. Let approval enable receiving and accepting eligible offers.

The current form requests documents before account creation. Retain selected files in memory until upload is possible, or move the upload stage after authentication. If the browser closes, request file selection again; a saved filename cannot restore a file.

### Organization-added drivers

Keep the existing no-login option. An authorized organization creates a profile and driver record belonging to that organization. A later invitation links an Auth identity to the existing profile. Never let a public caller attach themselves to an arbitrary existing driver.

### Failure recovery

Auth account creation, database onboarding, and file uploads span different services. They cannot all be assumed to succeed in one database transaction. Support a resumable setup state: a returning user can complete missing onboarding or retry a file upload without registering again.

The current `isEmailAvailable` check should be removed or revised. Avoid providing a public searchable list of registered email addresses. Let Auth handle signup outcomes and use an appropriate sign-in/recovery message.

**Completion check:** Interrupted registration is recoverable, pending accounts cannot book or accept, and confirmation is never mistaken for administrator approval.

## 10. Implement the Supabase data service

### Purpose

Keep pages talking to a stable application API while changing persistence underneath.

### Actions

1. Create `src/services/supabaseService.ts`.
2. Start with a small supported feature slice: current profile and organization-owned destinations.
3. Add row-to-domain mapping helpers for snake_case fields, nullable values, and IDs.
4. Check Supabase's returned `error` explicitly and produce understandable app messages.
5. Use direct table queries only for operations safely covered by permissions and constraints.
6. Use database-function calls for coordinated ride changes.
7. Use Edge Functions for privileged Auth administration and external-service work.
8. Select the backend explicitly in `src/services/index.ts`.
9. Keep unfinished Supabase functionality unavailable or clearly incomplete in development; never send it silently to the local mock.

### Method mapping

| Existing methods | Proposed implementation |
| --- | --- |
| `signIn` | Auth login followed by trusted profile lookup |
| `listUsers`, `listAccounts` | Scoped profile/directory reads; administrator account listing separately |
| `isEmailAvailable` | Revise/remove public preflight behavior |
| `registerOrganization`, `registerDriver` | Auth plus resumable, controlled onboarding |
| `listOrganizations`, `listHouses`, `listDrivers` | Scoped reads appropriate to caller and screen |
| `listDestinations`, `saveDestination` | Organization-owned queries/inserts with validation |
| `updateDriver` | Whitelisted settings updates, never unrestricted profile changes |
| `listPending`, `setOrgStatus`, `setDriverStatus` | Administrator-only review operations |
| `resetPassword` | Recovery flow returning delivery status, never a password |
| `deleteAccount` | Controlled server-side deactivation/account removal |
| Ride and offer reads | Caller-scoped queries, preferably with related display data |
| Ride and offer mutations | Transactional database functions |
| `getImpact` | Aggregate results without exposing underlying private ride rows |

The interface is a strong starting point, but keeping every old signature is not a requirement. In particular, `resetPassword` currently returns an email/password pair; that contract should change. New session, onboarding, and document operations may need additional methods.

### Example of a simple scoped read

The following is a learning example assuming `supabase` has been imported from the client module. It is not a complete service method or permission policy:

```ts
const { data, error } = await supabase
  .from('destinations')
  .select('id, org_id, name, address, city, notes')
  .eq('org_id', organizationId)
  .order('name')

if (error) {
  throw new Error('Could not load saved destinations. Please try again.')
}
```

The filter requests one organization's records. The backend permission rule independently decides whether the caller may read them. Map returned rows to the existing `Destination` shape before passing them to components.

Add pagination and joined/scoped reads as data grows. The current pattern of loading an offer list and requesting each ride separately will create unnecessary network traffic in a shared backend.

**Completion check:** Saved destinations work across devices, existing UI types remain consistent, and network failure cannot accidentally create a second local database.

## 11. Move the ride lifecycle to the backend

### Purpose

Make bookings and status changes trustworthy when multiple people act at the same time.

### Why separate updates are insufficient

Suppose Frank and Olive press Accept simultaneously. If each browser reads an unassigned ride and then updates it, both can believe they won.

Use a transaction: lock and validate the relevant records, assign one driver, close competing offers, and save the result as one operation. A competing caller should receive a useful “another driver accepted” response.

Supabase database functions can be called by the app through RPC, meaning a request to execute a named backend operation. Privileged functions need explicit caller checks, restricted execution permissions, and a safe search path. Prefer ordinary invoker privileges when practical. [Database-function documentation](https://supabase.com/docs/guides/database/functions)

### Suggested backend operations

| Operation | Responsibilities |
| --- | --- |
| `request_ride` | Validate approved requester, ownership, route, passengers, time, and linked return; create ride and offers |
| `update_ride` | Check editing window, validate changes, and reconfirm when required |
| `respond_to_offer` | Validate caller, approval, expiry, ride state, and assignment; accept or decline atomically |
| `retry_ride` | Check status/deadline and create a new eligible dispatch round |
| `cancel_ride` | Validate caller and ride state; cancel and close offers together |
| `drop_ride` | Validate assigned driver or permitted representative; record withdrawal and redispatch |
| `advance_ride` | Enforce permitted progress transitions and server timestamps |
| `undo_driver_step` | Check identity, current state, and allowed undo time |

Operation names are proposed; they do not currently exist in the repository.

### Preserve the current matching behavior

1. Require driver approval and an active driver profile.
2. Match the pickup location's service city.
3. Require enough passenger seats.
4. Require wheelchair access when requested.
5. Check request hours at the time of dispatch, not as a guarantee of availability at pickup.
6. Apply notice requirements to scheduled trips; on-demand behavior currently skips that notice check.
7. Exclude drivers already asked in the applicable round, with the current exception for offers marked `TAKEN`.
8. Apply the current busy-driver rule for on-demand rides, including the outbound-trip exception on returns.
9. Ask an eligible preferred driver alone first, then ask other eligible drivers if needed.
10. Preserve `SEARCHING`, `OFFERED`, and `NEEDS_ATTENTION` distinctions.

The frontend may retain match hints for usability, but the backend must recalculate before committing. If previews need broad private data, replace them with a limited backend preview result.

### Acceptance transaction, step by step

1. Identify the caller from the authenticated session.
2. Resolve the caller's driver or permitted organization representation.
3. Lock the ride and related offer records in a consistent order.
4. Confirm the offer belongs to that driver, is pending, and has not expired.
5. Confirm the ride is still in an assignable state and before its unaccepted deadline.
6. Recheck approval and applicable availability constraints.
7. Assign the driver and server acceptance timestamp.
8. Mark the winning offer accepted and competing pending offers taken.
9. Commit and return the updated ride.

Coordinate locks across acceptance, cancellations, edits, releases, and scheduled expiry. If an on-demand driver must not accept two different rides concurrently, locking only one ride is insufficient; also serialize the relevant driver-availability decision.

### Editing and history

The current mock resends when type, scheduled pickup time, passenger count, wheelchair need, or destination address changes. Names, notes, and pickup instructions alone do not trigger that resend. Preserve this unless the team intentionally changes it.

The mock removes some previous offers on edits/retries. A shared backend should preferably retain history and distinguish dispatch revisions. A response to an old revision must not assign the revised ride.

### Progress and undo

Preserve the current progression from accepted ride through on-the-way, arrival, pickup, and completion. Prevent completion before pickup. Cancellation and editing are currently disallowed after pickup. Finished completion/no-show actions have a 15-minute undo window.

Set timestamps and the flat fare-savings estimate on the backend. Narrow `NewRide` to caller-editable fields; it currently permits some fields that should not be supplied as authoritative state. Treat repeated requests carefully so a double click or uncertain network response does not create duplicate bookings or progress events.

**Completion check:** Concurrent drivers cannot both win, invalid transitions fail, expired offers cannot be accepted, and edits/returns/releases/undo preserve intended behavior.

## 12. Run expiry and dispatch without an open browser

### Purpose

Make time-dependent coordination continue when nobody is viewing CareRide.

The mock calls `checkDeadlines` during service operations. App polling indirectly drives that work. A shared backend must not depend on page reads to maintain ride state.

### Actions

1. Implement a backend operation for due offers and waiting rides.
2. Schedule it initially once per minute using Supabase Cron.
3. Expire overdue pending offers.
4. Process rides whose offers have all been answered or expired.
5. Reevaluate waiting scheduled rides when drivers' request hours open.
6. Cancel still-unassigned rides after the existing deadline.
7. Use the same transaction/locking rules as user-triggered mutations.
8. Record job outcomes and failures so missed processing is visible.

Supabase Cron schedules recurring backend work. [Official Cron documentation](https://supabase.com/docs/guides/cron)

### Current timing rules

| Rule | Existing behavior to preserve |
| --- | --- |
| On-demand offer expiry | 5 minutes after sending |
| Scheduled offer expiry | 60 minutes after sending |
| Unaccepted on-demand ride deadline | 30 minutes after its pickup/booking time |
| Unaccepted scheduled ride deadline | Its pickup time |
| Completion/no-show undo | 15 minutes after the finish action |

A one-minute job can update visible status shortly after a deadline. Acceptance must still check the actual current deadline immediately; a delayed job must not leave an expired offer acceptable.

Make the job idempotent: running it twice should not create duplicate offers or cancel the same ride repeatedly. Process a bounded batch and avoid overlapping workers making conflicting decisions.

### Timezones

Store actual timestamps as timezone-aware instants. Evaluate weekly request hours using an explicit timezone, initially `America/Vancouver`, rather than the server's default timezone. Test daylight-saving changes and preserve the current Sunday-to-Saturday indexing.

**Completion check:** With every browser closed, deadlines and eligible waiting requests are processed by the backend.

## 13. Upload and review driver documents

### Purpose

Replace filenames with actual private uploaded files and verifiable upload records.

### Current limitation

`FileField` calls its callback with `files[0].name`. The original file object is discarded. The rest of registration treats that string as though a document exists.

### Actions

1. Create a private Storage bucket, for example `driver-documents`.
2. Change the file field and draft types to retain a selected `File` while the page is open.
3. Track separate states: not selected, selected, uploading, uploaded, and failed.
4. Create/link the authenticated driver profile before allowing its document upload.
5. Generate a unique storage path rather than using the original filename alone.
6. Restrict uploads to the authorized driver's folder or an explicitly authorized organization workflow.
7. Apply allowed file-type and file-size restrictions. Browser `accept` is a usability hint, not enforcement.
8. Upload the file, then save a `driver_documents` reference only after success.
9. Show the administrator documents through authenticated access or short-lived signed links.
10. Handle replacement, abandoned uploads, and database-reference failures deliberately.

Private buckets require authorized access; public bucket URLs would be inappropriate for licences. [Storage bucket documentation](https://supabase.com/docs/guides/storage/buckets/fundamentals)

### Storage path and ownership

An example path is `<driver-id>/<document-id>.pdf`. A path is an identifier, not an access rule. The Storage policy must verify the uploader's actual relationship to the driver, including organization permissions where relevant.

Keep original filenames only as display metadata. Do not store permanently public licence URLs or persist signed URLs as the canonical file reference; save the storage path and generate access when needed.

File upload and database-reference insertion are separate operations. Retry safely and clean up abandoned objects instead of assuming they roll back together.

**Completion check:** Reviewers can open the actual document, unrelated users cannot, and a remembered filename is never reported as a successful upload.

## 14. Implement administrator account operations

### Purpose

Support approvals, recovery, invitations, and account removal without giving the frontend privileged credentials.

### Approval operations

Require a trusted active platform-admin profile. Validate the requested status, record who reviewed it and when, and update the profile's usable permissions accordingly. Keep document review access separate from ordinary driver-directory reads.

### Password recovery

Replace the current temporary-password display with a recovery-email flow. Provide a public recovery request page and a configured return route where a valid recovery session can set a new password. Update `DataService.resetPassword` and the administrator UI so success means recovery was requested, not that a plaintext password is available.

Never reveal or try to retrieve someone's current password. Configure localhost and production redirect URLs before testing links. [Password recovery documentation](https://supabase.com/docs/guides/auth/passwords)

For operational email delivery, configure a suitable SMTP provider and test it with intended recipients. The default Supabase mail service has delivery restrictions and is intended for initial testing. [SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp)

### Invitations

An organization-added driver may later need a login. Have an authorized server operation send an invitation and attach the resulting identity to the existing profile safely, avoiding duplicate driver records. [Invitation API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)

### Privileged operations

Use an Edge Function for Auth administration. Verify the caller's session and app-level administrator permission before using privileged credentials. Being signed in alone is insufficient. Keep privileged clients separate from caller-scoped clients. [Edge Function authentication](https://supabase.com/docs/guides/functions/auth)

### Account removal

1. Protect the last active platform administrator.
2. Refuse or defer removal while a driver has a client in the car.
3. Deactivate the app identity so policies stop authorizing new work immediately.
4. Close pending offers and redispatch accepted upcoming rides under transaction protection.
5. Preserve historical profiles/drivers or required snapshots.
6. Remove or disable the Auth login through the server, according to the chosen account policy.
7. Apply the separate document/data-retention policy.
8. Make failures resumable: an Auth deletion and a database transaction are separate operations.

Deleting an Auth user is a server-side operation. Do not assume deletion alone instantly invalidates every already-issued token; active-profile checks should control app access. [Auth deletion API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)

**Completion check:** Non-admins cannot invoke admin actions, recovery works, and account removal preserves history and active-trip safety.

## 15. Add live updates and reliable loading

### Purpose

Refresh relevant screens when shared state changes and make network problems understandable.

### Actions

1. Keep initial authorized data queries; a subscription does not replace initial loading.
2. Enable the required tables for the selected Realtime mechanism.
3. Start with authorized changes to rides, offers, and approval records relevant to the session.
4. Let an event invalidate/refetch the appropriate data instead of immediately rewriting every component.
5. Clean up subscriptions when the user, scope, or mounted component changes.
6. Reload data after reconnecting and when an inactive page becomes visible.
7. Retain a modest fallback refresh if needed; remove dependence on four-second polling for dispatch.
8. Prevent duplicate subscriptions during React development Strict Mode and repeated navigation.

Postgres Changes is a reasonable initial mechanism for this app. Access policies and subscription setup must be tested together. [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

### Improve `useData`

The hook currently returns either data or `undefined` and does not handle rejected loads. Introduce an explicit result such as:

```ts
type DataResult<T> = {
  data: T | undefined
  loading: boolean
  error: string | undefined
  reload: () => void
}
```

Update consuming screens to distinguish loading, empty results, permission errors, and connection failures. Cancel or ignore stale requests when a user changes; clear private cached data so the next account does not briefly see the previous account's rides.

For mutations, show pending state and retain entered data after a recoverable error. A network timeout does not prove the backend rejected a booking: use an idempotency key or confirmation query before blindly submitting again.

### Notifications are separate

Realtime helps people who have the app open. A driver whose browser is closed will need a separate SMS, email, or push feature if that is a requirement. Schedule those as a later integration rather than implying Realtime supplies them.

**Completion check:** Partner and driver screens update across devices, reconnects recover, and failed loads show useful actions instead of empty or stuck screens.

## 16. Decide what stays in browser storage

### Purpose

Move authoritative shared records while preserving useful interface preferences.

| Current storage | Recommended treatment |
| --- | --- |
| `careride-db-v5` main database | Replace with Supabase in Supabase mode |
| `careride-session-v3` user ID | Retire for Supabase authentication |
| Last sign-in email | Optional local convenience; consider shared-device behavior |
| Registration draft | May remain local temporarily; never persist password or actual document files as JSON |
| Ride draft | Choose memory/session/server storage based on needs; it contains passenger names and notes |
| Dismissed notice IDs | Can remain local; synchronize only if cross-device dismissal is desired |

### Actions

1. Audit all `localStorage` and `sessionStorage` access.
2. Keep harmless preferences separate from shared business records.
3. Decide when passenger drafts are cleared, especially on shared front-desk computers.
4. Prevent old mock sessions from selecting a Supabase identity.
5. Hide demo login shortcuts and reset controls outside explicit mock mode.
6. Keep old local demo records isolated rather than automatically uploading them.

The current booking form stores names, notes, and travel needs. Base the migration on that actual behavior, even where older product text says no client information is stored. Agree on the minimum required identifying information and retention period before operational use.

If useful local records must be imported, build a deliberate import with ID mapping and relationship validation. Do not import plaintext credentials; users should register or receive invitations.

**Completion check:** Supabase is the authoritative shared database, and private data is not left indefinitely in browser drafts by accident.

## 17. Test the complete integration

### Purpose

Verify shared behavior, access boundaries, and concurrency before using CareRide operationally. A passing frontend build cannot prove these backend rules.

### Prepare fictional test actors

Create a platform administrator, two partner organizations, two independent drivers, a pending driver, and an organization-added driver without a login. Add an organization representative if preserving the transport-provider workflow.

Use separate browsers/profiles/devices unless tab-local sessions have been deliberately implemented.

### Authentication and onboarding checks

- Register a partner and a driver.
- Follow confirmation links and reload during onboarding.
- Interrupt setup after Auth creation and resume it.
- Verify pending accounts cannot book/accept.
- Test logout, session restoration, recovery links, and wrong-role routes.
- Invite the no-login driver and verify that the original profile is reused.

### Permission checks

- Partner A cannot read, edit, or cancel Partner B's rides.
- A driver cannot answer another driver's offer or advance another driver's ride.
- Changing an `orgId`, `driverId`, or URL manually does not grant access.
- Users cannot update their role or approval status.
- An organization representative can act only for permitted own drivers.
- Anonymous requests cannot read private tables or documents.
- Limited contact results do not expose licence paths or unrelated account emails.

### Complete ride walkthrough

1. An approved partner requests an on-demand ride.
2. An eligible driver on another device sees the offer.
3. The driver accepts.
4. The partner sees the assignment and vehicle.
5. The driver reports on-the-way and arrival.
6. The driver marks pickup, then completion.
7. Both users see consistent progress and history.
8. Impact totals change correctly.
9. The partner books a linked return ride with the original driver preferred.

### Race, deadline, and recovery checks

| Scenario | Expected result |
| --- | --- |
| Two drivers accept one ride simultaneously | Exactly one assignment; the other caller receives a useful response |
| One driver accepts two on-demand rides simultaneously | Current busy-driver rule is enforced across both requests |
| Acceptance races cancellation | One consistent final state, no accepted offer for a cancelled assignment |
| Acceptance races offer expiry | Backend deadline determines validity |
| An old offer is answered after a ride edit | Old revision cannot assign the changed ride |
| A request is submitted twice after a timeout | One booking for that submission identity |
| All browsers close | Scheduled expiry/dispatch still runs |
| A scheduled job runs twice | No duplicated offers or repeated destructive work |
| Driver releases a ride | Withdrawal is recorded and other drivers can be asked |
| A recent finish is undone | State is restored within the permitted window |
| Undo is attempted after 15 minutes | Backend rejects it |
| Realtime disconnects and reconnects | Screen refetches the current authorized state |
| Document upload fails | Form can retry and never claims upload succeeded |
| Account removal fails partway | Deactivated access stays blocked and cleanup can resume |

### Automated checks

Retain `npm run lint` and `npm run build`. Add focused backend tests for permissions, status transitions, idempotency, and simultaneous acceptance. These tests target behavior that is difficult to verify safely through a UI alone.

Run policy tests with ordinary anonymous/authenticated roles as well as administrator paths. A successful SQL Editor query or secret-key query does not prove a browser user has correct permissions.

**Completion check:** The complete workflow works across devices and every negative/race scenario has a consistent backend result.

## 18. Deploy and switch to Supabase

### Purpose

Publish a frontend connected to the intended backend only after the required features work.

### Actions

1. Create the production Supabase project when ready for the pilot.
2. Apply reviewed migrations and configure Storage, jobs, and server functions.
3. Configure Auth site and redirect URLs for the actual deployed frontend.
4. Configure and test operational email delivery.
5. Provision the first administrator through a trusted one-time process; never through public administrator signup.
6. Configure the production frontend build with its project URL, publishable key, and `VITE_DATA_BACKEND=supabase`.
7. Configure server-only credentials through the backend's secret-management mechanism.
8. Run frontend checks and the required backend/integration checks.
9. Build and deploy the existing Cloudflare frontend using the repository's workflow.
10. Test direct application links, login confirmation, recovery, uploads, and one full fictional trip on the deployed site.
11. Check logs and job outcomes and remove any temporary test privileges.

Vite embeds frontend configuration at build time. Changing a runtime setting after a static build does not rewrite that bundle; build again when changing the target Supabase project.

### Cutover and rollback

Keep `mockService` available for an explicit demo deployment. Do not use it as automatic production fallback. If Supabase is unavailable, show connection/retry state instead of creating isolated local bookings.

For rollback, prefer a previous frontend compatible with the same production data. Switching a live service to mock mode would hide actual bookings and create separate records. Use additive database changes where possible and identify active rides before any disruptive maintenance.

Before operational use, agree on data retention, administrator access, document handling, and backup/recovery needs. Check the capabilities of the selected Supabase plan rather than assuming a backup feature or price.

**Completion check:** The deployed frontend targets the intended project, real accounts are separate from demo credentials, and backend jobs work independently of visitors.

## 19. Suggested implementation milestones

The numbered sections explain the complete system. Build it in these reviewable slices:

| Milestone | Deliverable | Evidence of completion |
| --- | --- | --- |
| 1. Foundation | Development project, client, migrations, initial tables and permissions | Reproducible schema and deliberate backend selection |
| 2. Login and destinations | Auth sessions, partner onboarding, scoped saved places | Two partner accounts cannot access each other's destinations |
| 3. Driver setup | Pending/approved driver profiles, settings, no-login profiles, real private documents | Review and permitted self-service work |
| 4. Booking and assignment | Trusted request/dispatch/accept/decline operations | Cross-device booking and single winner under concurrent acceptance |
| 5. Full lifecycle | Editing, reconfirmation, retry, cancel, release, return, progress, undo, deadlines | Every current ride path works and browsers can close |
| 6. Administration | Approval, recovery, invitations, safe deactivation/removal | Non-admin access is denied and history is preserved |
| 7. Live operation | Realtime, loading/retry handling, production setup | Reconnect and deployed end-to-end checks pass |

**Recommended first implementation target:** A real Supabase login plus organization-scoped saved destinations. It proves identity, shared persistence, and permissions before moving the more complex dispatch system.

## 20. Troubleshooting

| Symptom | What to investigate |
| --- | --- |
| “Connection settings are missing” | `.env.local`, exact variable names, active backend mode, and restarting Vite |
| Login succeeds but app cannot load | Missing/unlinked profile, incomplete onboarding, or profile-read permission |
| Newly registered user is not signed in | Email confirmation may be required; show the appropriate state |
| Query returns no rows | Check ownership links, requested filters, and RLS; an empty result is not proof the table is empty |
| “Permission denied” | Check table/function grants and policy conditions with the actual client session |
| Admin SQL works but browser query fails | SQL administration and browser users have different privileges |
| Signing into one tab changes another | Shared session storage; use separate profiles or the deliberate tab-local setup |
| A filename appears but reviewer cannot open a document | Verify an actual upload and database reference exist, then check Storage access |
| Updates appear only after refresh | Realtime setup, subscription scope, permissions, and cleanup |
| Deadlines stop when browsers close | Dispatch still depends on frontend polling or scheduled processing is not configured |
| Duplicate bookings/offers appear | Missing idempotency, uniqueness checks, or concurrent job coordination |
| Recovery link goes to the wrong site | Auth site URL and allowed redirect configuration |
| Confirmation email does not arrive | Mail-service restrictions, SMTP configuration, recipient address, and delivery logs |
| Driver hours shift after backend migration | Explicit timezone, weekday indexing, and daylight-saving handling |

Investigate the exact failed operation. Do not disable RLS or add a secret key to the browser to make a permission error disappear.

## 21. Glossary

| Term | Meaning in this guide |
| --- | --- |
| Backend | Shared services that store records and enforce rules |
| PostgreSQL / Postgres | The database system used by Supabase |
| Schema | The definition of tables, columns, relationships, and related database objects |
| Auth user | A login identity managed by Supabase |
| Profile | CareRide's app identity, including role and organization links |
| Session | Authentication state issued after login and managed by the Auth client |
| Publishable key | A browser-safe API connection key; data access still requires permissions |
| Secret / service-role key | Privileged server credentials that must not be exposed in frontend code |
| RLS | Database rules deciding which rows a caller may access |
| Grant | Permission to perform an operation on a database object |
| Migration | A versioned file describing a database change |
| Transaction | A group of database changes that succeed or fail together |
| RPC | Calling a named database function through the API |
| Edge Function | Server-side code for trusted operations or external integrations |
| Cron | A recurring backend scheduler |
| Idempotent | Safe to repeat without producing duplicate effects |
| Signed URL | A temporary link granting access to a private file |
| Realtime | A live connection reporting authorized changes to an open app |

The repository links above describe today's code. Proposed tables, functions, files, and environment settings must still be implemented and tested before the migration is complete.
