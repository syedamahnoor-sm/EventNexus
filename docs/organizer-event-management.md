# Organizer event creation and management

## Routes and experience

- `/organizer/events/new`: editorial creation form, real authenticated organizer identity, image URL preview, review, and explicit Publish event action.
- `/organizer/events/:id/edit`: owned-event prefill, review, optimistic concurrency protection, and explicit Save event changes action.
- The existing organizer dashboard now offers Create event and contextual Edit, Cancel, and safe Delete actions. Owned Event Details pages expose the same reusable controls. Existing dashboard composition, filters, pagination, and metrics remain intact.

Fields use the real Event schema: title (3–120 characters), description (10–2000), one of the six categories, date/time, location (3–200), positive safe-integer capacity, optional image URL (2048 maximum), and image description (1–200 when an image is supplied). No organizer ID, registration count, lifecycle status, or unsupported event field is accepted from form payloads.

The form uses browser-local `datetime-local` values and submits UTC ISO instants. Existing dates retain seconds/milliseconds on prefill. Invalid/rolled dates and nonexistent local daylight-saving times are rejected. The displayed timezone comes from the browser, never a hardcoded campus timezone. Backend validation independently rejects past/equal-now scheduled dates for creation and changed dates.

## Existing APIs and security

Existing mutation routes remain the single event-management API:

```http
POST   /api/events
PATCH  /api/events/:id
DELETE /api/events/:id
POST   /api/events/:id/cancel
```

Added authenticated organizer reads:

```http
GET /api/organizer/events/:id
GET /api/organizer/events/creation/:key
```

Sessions, existing student/organizer role middleware, `withCredentials`, and global CSRF checks remain authoritative. Mutations use the existing auth client: it refreshes/retries only an explicit pre-controller CSRF rejection, never an ambiguous write. Owner identity always comes from the session. Editor reads return only owned records (404 for another organizer); mutation ownership failures return 403. Responses do not expose creation recovery metadata.

CRUD implementations were moved into `eventManagementController.js`; existing `eventController.js` exports delegate to them, while public listing/details and recap APIs retain their contracts. No parallel model or registration system was introduced.

### Creation recovery

The editor sends a UUID `X-Idempotency-Key`. Optional, server-owned Event fields `creationKey` and `creationFingerprint` identify the original normalized request. A partial unique compound index on `{ organizer, creationKey }` prevents concurrent duplicate creation. Exact retries return the existing real event; a different payload with the same key returns 409. An owned lookup retrieves the real result after a lost response. These fields are excluded from normal Mongoose selection and explicitly stripped from mutation responses.

**Deployment:** ensure the schema's partial unique index is built before enabling creation. Existing records have no key and are excluded from this index, so no data migration or seed rewrite is required. The inspected development database successfully built and exercised it. Deployments disabling automatic index creation must apply this index through their normal database migration process.

### Editing and concurrency

The editor sends `X-Event-Version` using the real event `__v`. Organizer mutations increment it; stale edits receive 409. The field remains optional for compatibility with existing non-UI API clients. Registration/cancellation transactions do not alter this organizer version.

Capacity changes run in a MongoDB transaction, check actual Registration records and the event counter, and use a conditional event update. A requested capacity below either current count is refused. Concurrent registration writes touch the same event document, so transaction conflicts are retried without losing seat consistency. Snapshots and existing registration records are never rewritten by event edits.

## Lifecycle rules

- Only future `upcoming` events can be edited, cancelled, or deleted.
- Cancellation requires a frontend confirmation, sets `status=cancelled`, closes new registration immediately, and removes the event from upcoming discovery. It preserves registeredCount, all Registration documents, and student snapshots. Repeated cancellation is idempotent. No automatic student messages/email notifications are implemented or claimed.
- Deletion requires a separate explicit confirmation and is allowed only when both registeredCount is zero **and** no actual Registration document exists. It runs transactionally with a final conditional delete. A concurrent registration prevents unsafe deletion; registrations are never silently removed.
- Past, cancelled, and completed records remain read-only here. There is no mark-attended/complete, reopen, or inferred attendance action. The existing scheduled-start boundary continues to classify past events; it is not proof that an event ended or was attended. Existing optional recap APIs remain untouched.

## Drafts, uncertainty, and synchronization

Drafts and exact unconfirmed submissions are stored in tab-scoped sessionStorage, keyed by authenticated account and event/new flow, with an in-memory fallback if browser storage is unavailable. They include event fields and a creation request reference, not session cookies, passwords, CSRF tokens, or image data. Refresh/revisit preserves a draft. Native unload warnings protect unsaved/pending work; explicit discard uses a confirmation. Explicit logout clears drafts, another signed-in account clears other accounts' drafts, and an expired session preserves the draft for the same organizer to recover after login.

Saved values never silently replace dirty fields. Version conflicts show a comparison and require an explicit choice to keep edits against the latest version. On an uncertain write, fields remain locked until the current saved event is checked or the exact captured request is retried with the same key/version. The UI never announces success before a confirmed mutation/read response. Confirmed creation/updates navigate to the actual Event Details route with a success notice.

Successful mutations publish a same-origin event-change notification and BroadcastChannel message. Existing Home/Explore/Archive listing hooks, Event Details, and organizer dashboard refetch their real APIs. Other devices receive current data when revisiting/refetching; there is no server-push service.

## Images

No managed event-upload provider is configured. The existing managed upload integration is student-avatar-specific and was not repurposed as an event uploader. This milestone uses validated image URLs, clearly labeled as URLs rather than file uploads. It permits HTTPS without embedded credentials or existing `/images/events/*.webp` library assets. An image requires a meaningful accessibility description.

Preview loads only on request and displays a readable failure state. The server does not fetch arbitrary URLs. Existing EventArtwork reads `imageUrl`/`imageAlt` from MongoDB-backed responses across Details, Explore, homepage previews, archive, and dashboard, preserving lazy loading, cropping, hover behavior, and missing/broken-image fallback. Remote availability/licensing remains the organizer's responsibility; no temporary local storage, base64 MongoDB data, new photo mapping, or new dependency was introduced.

## Validation

Automated commands:

```sh
cd server
node --test scripts/event-management.test.js scripts/organizer.test.js scripts/avatar.test.js scripts/profile.test.js scripts/registration.test.js scripts/seed-events/seed.test.js scripts/seed-events/archive.test.js
```

```sh
cd client
node --test src/auth/auth.test.js src/lib/cancellation.test.js src/lib/eventAvailability.test.js src/lib/registration.test.js src/lib/studentDashboard.test.js src/lib/studentProfile.test.js src/lib/profilePhoto.test.js src/lib/organizerDashboard.test.js src/lib/eventManagement.test.js
npm run lint
npm run build
```

75 automated tests passed (34 backend, 41 frontend). New coverage includes strict fields/accessibility, date boundaries, multiple timezones/DST gaps, stale versions, creation fingerprints, metadata protection, draft scoping, role-aware return paths, image URL restrictions, and lifecycle eligibility. Full frontend lint and production build passed. The backend has no lint script.

Live development MongoDB/API checks passed for concurrent idempotent creation, creation lookup, public listing/homepage ordering, owned dashboard/results, exact persistence, strict validation, student/guest/other-organizer rejection, stale edit versions, the capacity floor after real student registration, concurrent cancellation, preserved registration snapshots/counters, past/completed safeguards, and protected deletion. Existing session and CSRF enforcement were exercised on actual endpoints.

Actual headless Chrome checks passed for create/review/publish, duplicate clicks, restored drafts after refresh, real-record edit prefill, edit submission, and lost-response recovery for **both creation and editing**. Chrome deliberately failed the response after the server committed; the UI queried the saved record instead of announcing unconfirmed success or creating a duplicate. Browser checks also covered explicit cancellation/deletion/discard, Escape, focus restoration, local event image preview, owner/student route restrictions, and reduced-motion behavior. Desktop/mobile screenshots were inspected; no horizontal overflow at 320, 390, or 1440 pixels. Physical-device and screen-reader testing were not performed. Remote third-party image availability was not claimed; real existing local event photography was used in the image checks.

Temporary organizer/student/event/registration fixtures were cleaned up after every run. Before/after fingerprints verified that all pre-existing User, Event, Registration, and AvatarCleanup records remained unchanged. Existing seed data and development servers were preserved. The live registration controller still emits its pre-existing Mongoose `new`-option deprecation warning; it was not modified in this milestone.

## Files

Created:

- `client/src/pages/OrganizerEventEditor.jsx` and `OrganizerEventEditor.css`
- `client/src/components/OrganizerEventForm.jsx`
- `client/src/components/OrganizerEventFields.jsx`
- `client/src/components/OrganizerEventActions.jsx`
- `client/src/components/OrganizerConfirmDialog.jsx`
- `client/src/components/OrganizerEventManagement.css`
- `client/src/hooks/useOwnedEvent.js`
- `client/src/lib/eventManagement.js` and `eventManagement.test.js`
- `client/src/lib/eventChanges.js`
- `server/src/controllers/eventManagementController.js`
- `server/src/utils/eventManagement.js`
- `server/scripts/event-management.test.js`
- This document.

Updated:

- `client/src/App.jsx`
- `client/src/auth/AuthProvider.jsx` and `authRules.js`
- `client/src/components/OrganizerEventEntry.jsx`
- `client/src/hooks/useEventDetails.js`, `useEvents.js`, and `useOrganizerDashboard.js`
- `client/src/pages/EventDetails.jsx`, `OrganizerDashboard.jsx`, and `OrganizerDashboard.css`
- `server/src/controllers/eventController.js`
- `server/src/models/Event.js`
- `server/src/routes/eventRoutes.js` and `organizerRoutes.js`
- `server/src/utils/organizerDashboard.js`
- `server/src/validators/eventValidator.js`
- `server/package.json` (`test:event-management`)

No dependencies, student snapshot schemas, seed catalogs, Git identity, commits, or pushes were changed.
