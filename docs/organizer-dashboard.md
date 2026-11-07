# Organizer workspace

`/organizer/dashboard` is now a session-authenticated organizer workspace. It retains EventNexus's editorial typography, warm paper, forest ink, lime accents, existing photo fallbacks, navigation, and reduced-motion conventions. There are no creation/editing forms or participant-management actions in this milestone.

## Experience

- Real authenticated organizer name and a concise editorial welcome.
- Overview of currently owned events, upcoming/past counts, existing active registration records, and near-capacity upcoming events.
- Nearest scheduled upcoming event, real photograph, date/time, venue, category, capacity usage, and details link.
- Paginated upcoming, past, cancelled, and conditional needs-review views. Each event shows lifecycle, image, category, venue, registration count, capacity, and remaining/unfilled places.
- Honest loading, initial failure, stale-data refresh failure, empty, past-only, out-of-range-page, and missing/broken-photo states.
- Keyboard-accessible lifecycle filters, URL-backed page/view selection, manual refresh, foreground refresh, registration-change notifications, and refresh at the next event's scheduled start.
- Organizer navigation now reads **My workspace**. Student avatar/profile navigation and role restrictions remain unchanged.

## API

New read-only endpoint:

```http
GET /api/organizer/dashboard?view=upcoming&page=1&limit=8
```

Existing `requireAuth` and `requireRole('organizer')` middleware enforce sessions and role. Organizer identity comes exclusively from `req.user._id`. Unknown query fields (including organizer/user IDs) are rejected. Responses are `Cache-Control: no-store`. Existing public event and registration APIs are unchanged; no CSRF-protected mutation was added or weakened.

Accepted views: `upcoming`, `past`, `cancelled`, `review`. Page defaults to 1 (maximum 1,000,000); limit defaults to 8 (maximum 24). Invalid parameters return 400. Unauthenticated requests return 401, students return 403, and existing auth handling redirects expired browser sessions to Login with the destination preserved.

Response:

```text
data:
  overview: total, upcoming, past, cancelled, review, activeRegistrations, nearCapacity
  next: owned event preview or null
  events: current owned page
  asOf: server classification timestamp
pagination: page, limit, total, totalPages, hasNextPage
```

## Aggregation and lifecycle

The MongoDB aggregation starts with indexed organizer ownership matching. It projects only preview fields and uses the indexed `Registration.event` relationship to count actual registration documents per owned event. It never populates student identities or attendee snapshots. A single facet derives overview totals, the nearest next event, and the requested page, bounded by a 10-second query timeout. Large descriptions, galleries, recaps, and other organizers' records are excluded.

- **Upcoming:** `status=upcoming` and scheduled date strictly after the server's current instant.
- **Past:** `status=upcoming|completed` and scheduled date at or before that instant. Expired upcoming records are correctly classified without rewriting their lifecycle status.
- **Cancelled:** cancelled status, regardless of scheduled date; excluded from upcoming/past.
- **Needs review:** other inconsistent records, including future-dated completed events or missing/invalid legacy dates. These do not inflate upcoming/past metrics.
- Upcoming events sort nearest first; past/cancelled sort most recent scheduled date first. Object ID breaks ties deterministically. The featured event is independent of current view/page.
- Near capacity means an upcoming event has registrations for **at least 80% of capacity**, including full events. Remaining seats are clamped at zero; no capacity is invented for invalid counters.
- Total events means currently existing owned records, not a lifetime audit of deleted events. Active registrations means existing Registration documents across all owned events, including past/cancelled events when records remain. Cancellation currently deletes registration records; there is no registration-status/history field or attendance verification.

There is no event end date/duration. The existing scheduled-start boundary determines past events, not verified completion or attendance. All views are read-only and leave original event statuses, capacity counters, registration snapshots, and seed data intact.

## Validation performed

- **65 automated tests passed:** 30 backend and 35 frontend. New tests cover strict dashboard query parsing, ownership/count-only aggregation shape, exact date boundaries, lifecycle labels, capacity bounds, and URL parsing; existing auth, registration/cancellation, profile/avatar, seed/archive, and student dashboard suites also passed.
- Full frontend `npm run lint`, production `npm run build`, and `git diff --check` passed. The server has no lint script. No dependency was added.
- Live development MongoDB/API checks used temporary organizers/students and 17 temporary events, plus consistent registration records. Verified ownership isolation, rejected client organizer IDs, unauthenticated/student restrictions, counts, near-capacity/full events, date boundaries, sorting, pagination, cancelled/review states, empty/past-only accounts, and totals updating after real registration/cancellation requests with existing CSRF enforcement.
- Actual headless Chrome checks verified login/session restoration, matching owned data, details links, keyboard activation and focus preservation across filters, pagination persistence on refresh, network failure/retry, expired-session redirect, empty and past-only states, and student route restriction. Screenshots were inspected at desktop/mobile sizes; no horizontal overflow at widths 320, 390, 900, and 1440. Reduced-motion CSS was checked in Chrome. Physical-device and screen-reader testing were not performed.
- Temporary fixture cleanup completed. Before/after fingerprints confirmed existing User, Event, Registration, and AvatarCleanup documents were unchanged. Existing development servers and seed data were preserved.

There is no server-push subscription: updates from other browsers become visible on foreground/manual refresh or revisit. Creation/editing and participant management remain future milestones. Existing registration controllers emit a Mongoose `new` option deprecation warning during live mutation tests; those controllers were not changed here.

## Files

Created:

- `client/src/pages/OrganizerDashboard.css`
- `client/src/components/OrganizerCapacity.jsx`
- `client/src/components/OrganizerEventEntry.jsx`
- `client/src/hooks/useOrganizerDashboard.js`
- `client/src/lib/organizerDashboard.js`
- `client/src/lib/organizerDashboard.test.js`
- `server/src/controllers/organizerController.js`
- `server/src/routes/organizerRoutes.js`
- `server/src/utils/organizerDashboard.js`
- `server/scripts/organizer.test.js`
- This document.

Modified:

- `client/src/pages/OrganizerDashboard.jsx` (replaced the unused empty placeholder).
- `client/src/App.jsx` (protected organizer route now renders the dashboard).
- `client/src/components/Navbar.jsx` (organizer link label).
- `server/src/app.js` (mounts the organizer router).
- `server/package.json` (adds `npm run test:organizer`).

All changes are uncommitted. No Git identity settings were modified.
