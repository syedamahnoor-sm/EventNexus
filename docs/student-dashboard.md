# Student Dashboard — Milestone 3

> Historical milestone notes: Milestone 9 supersedes deletion-based cancellation, active-only history assumptions and the old unique-index behavior. See [Registration lifecycle](registration-lifecycle.md) for current retention, status filters, audit/outbox and migration contracts.

## Product and routing

`/student/dashboard` now renders the real Student Dashboard behind the existing student-only `ProtectedRoute`. The shared navigation labels it **My campus** and indicates the active route. Guests return through Login with the dashboard destination preserved; organizers see the existing role-mismatch explanation and never mount the student data hook. The organizer workspace remains the existing future-milestone notice.

The page is a compact editorial workspace using the existing fonts, brand mark, ink/paper/lime palette and motion conventions:

- Actual session name, a welcome and Explore Events action.
- Upcoming and past registration counts, plus the next registered event's date/time.
- An image-led next-event feature linking to the actual event.
- Upcoming registration entries with category, date/time, venue, confirmation link, Details link and the existing cancellation action.
- A separate past-registration list with Details links and an explicit distinction from verified attendance.
- A change-of-plans area for cancelled, missing and unconfirmed event references.
- Honest empty/loading/error states, Explore and Campus Rewind links, and a manual refresh action.

No academic profile information, attendance metrics, contact details or event records are invented. Registration snapshots are not duplicated into dashboard state or exposed as profile data. Cancelled registrations remain deleted under the existing model and cannot be reconstructed as history. An organizer-cancelled **event** with an existing registration is instead shown under change of plans.

## Backend contract

The actual existing endpoint is **`GET /api/registrations/me`**, not `/my`. It uses `requireAuth`, `requireRole('student')` and `student: req.user._id`. Query-supplied student identities are ignored. It returns the student's complete, currently unpaginated registration collection as `{ data: [...] }`, with populated event data; deleted references populate to `null`.

The only backend change adds **category** to the populated event field selection. No endpoint, auth, model, capacity or registration transaction changes were needed. The existing CSRF-protected `DELETE /api/events/:id/register` and shared confirmation dialog handle dashboard cancellations, including the captured registration reference, double-submit guard, uncertainty recovery and server-authoritative ownership/eligibility checks.

## Derivation and lifecycle

All three dashboard views derive from the same complete authenticated response through `groupStudentRegistrations`:

| Group | Rule | Order |
| --- | --- | --- |
| Upcoming | Valid populated event; status `upcoming`; scheduled `date > now` | Nearest date first |
| Past | Valid populated event; status `upcoming` or `completed`; scheduled `date <= now` | Most recent date first |
| Unavailable | Cancelled event, future-dated completion, invalid date, missing/unpopulated event | Existing response order |

Equal dates use the actual registration reference as a stable tie-breaker. Input records are not reordered or mutated. Counts are array lengths of the first two groups, not attendance totals. Next event is the first upcoming registration. Unavailable records never inflate these metrics. Exactly at the scheduled start an event becomes a past registration even if its lifecycle status is still `upcoming`. There is no end time/duration in the model, so this is a start-date boundary, not verified completion or attendance.

The page schedules a lightweight timer at the next upcoming start and updates its clock on focus. It does not run an animation/scroll-frame state loop.

## Fetching and synchronization

`useStudentRegistrations` owns one list for the current user. It uses the existing credentialed Axios client, cancellation signals, timeout, identity keys and stale-response protection. Account changes remount the dashboard's local state so another user's list/notice is not reused. A 401 uses the shared auth response handling and the existing protected redirect.

Mount/revisit, manual refresh, window focus and restored visibility re-fetch the real API. The existing registration-change subscription now optionally accepts all event IDs, allowing dashboard invalidation for registration/cancellation changes elsewhere in the app or another same-origin tab. Existing event-specific subscriptions retain their behavior. Notification payloads contain no student details or credentials.

After a confirmed cancellation or an authoritative lookup finding no active record, the corresponding row is removed and the whole list is refreshed. A replacement registration triggers a fresh populated lookup rather than inserting an incomplete object. Old requests cannot restore a cancelled row. A page-level status receives focus after the originating row disappears. Counts and the next event derive again from the updated list; no full page reload is required.

Initial loading uses a skeleton and unknown metric markers rather than fabricated zero counts. Initial failure shows an error and retry without fake records. A failed background refresh explicitly marks the last loaded list as stale, hides its numeric metrics and disables cancellation entry actions until a successful retry. Eligible actions remain stable during ordinary background loading so closing a confirmation dialog can restore keyboard focus. Backend authorization and cancellation checks remain authoritative.

## Accessibility and visual review

The dashboard uses semantic sections/headings, accessible anchor navigation, visible focus, meaningful image alt text from the API, actual `<time>` values, touch targets and responsive editorial rows. Existing cancellation focus containment, Keep/Escape behavior and post-cancellation focus are reused. Images use the existing lazy-loading/fallback component. Reduced motion removes list/skeleton animation. No charts, extra motion dependencies or profile/organizer features were introduced.

Desktop and mobile-width screenshots of the actual populated page were visually inspected. The welcome was tightened so metrics and the next-event action appear sooner, while keeping the established editorial identity.

## Validation performed

- Frontend: `node --test src/lib/studentDashboard.test.js src/lib/cancellation.test.js src/lib/registration.test.js src/auth/auth.test.js src/lib/eventAvailability.test.js` — **25 tests passed**, including five new grouping/count/sorting/boundary/unavailable/empty tests.
- Backend: `node --test scripts/registration.test.js scripts/seed-events/seed.test.js scripts/seed-events/archive.test.js` — **18 tests passed**.
- Full client ESLint and production Vite build passed. Both former dashboard unused-React errors are resolved; the organizer placeholder received only import cleanup.
- Live Express/MongoDB API checks confirmed exact student-owned records despite another student ID in query parameters, populated categories, safe null event references, empty-account results and guest/organizer rejection.
- Headless Chrome against an isolated preview of the actual app/backend verified guest return, real name, honest initial loading, expected upcoming/past counts and sort order, next-event selection, unavailable/deleted references, category display, dashboard cancellation with actual database count update, keyboard dialog/focus restoration, success focus, registration/cancellation changes on revisit, cross-tab cancellation refresh, background and initial API failures/retry, start-date reclassification, a real empty account, organizer restriction and session-expiry redirect.
- Layout checks passed at 1440px, 900px and 390px. Mobile navigation, visible cancellation actions and reduced motion were checked. Physical touch devices, other browsers and production hosting were not tested.
- Every QA user/event/registration and owned session was removed. SHA-256 fingerprints of every pre-existing User, Event and Registration matched before and after testing. Seeded records were not changed.

## Boundaries

The current API returns all of a student's registrations, without pagination. This guarantees accurate client-derived totals today; future pagination should add server aggregates rather than counting/filtering a partial page. No dashboard-specific API cache, attendance tracking, retained cancellation history, student profile editor or organizer dashboard was added. Existing Mongoose `new: true` deprecation warnings remain non-blocking. No dependencies were added, and changes remain uncommitted.

## Files

Created:

- `client/src/pages/StudentDashboard.css`
- `client/src/components/StudentEventEntry.jsx`
- `client/src/hooks/useStudentRegistrations.js`
- `client/src/lib/studentDashboard.js` and `studentDashboard.test.js`
- This document

Modified:

- `client/src/pages/StudentDashboard.jsx`
- `client/src/App.jsx`
- `client/src/components/Navbar.jsx`
- `client/src/lib/registrationEvents.js`
- `server/src/controllers/registrationController.js` (category selection only)
- `client/src/pages/OrganizerDashboard.jsx` (unused import only)
