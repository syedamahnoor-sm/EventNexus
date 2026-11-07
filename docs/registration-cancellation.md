# Student registration cancellation — Milestone 2

## Existing architecture and policy

The existing Registration model represents **active registrations only**. Its established cancellation endpoint removes the current student's registration in a transaction, then decrements the event count. There is no cancelled-status field, cancellation timestamp, retained snapshot history or audit collection. This milestone retains that deletion policy rather than creating a parallel registration/history system. Successful cancellation removes the registration-time attendee snapshot along with its owning registration. No migration or seed rewrite is performed.

Cancellation is now permitted only while the event is `upcoming` and its scheduled start is strictly in the future. Full events still permit cancellation. Past, completed and cancelled events show a closed state. There is no event end time or duration; the scheduled start is the documented cutoff. Historical registration records are left intact when cancellation is ineligible.

## Backend

The existing `DELETE /api/events/:id/register` remains authenticated, student-only and globally CSRF-protected. The route and response shape are unchanged. Its transaction:

1. Deletes only a record matching the authenticated student's ID and route event ID.
2. When supplied, also matches `body.registrationId`; the new frontend always sends the captured reference. This prevents a stale dialog or repeated request from cancelling a new registration created after the old one was cancelled. Older callers may omit this optional field; invalid references return 400.
3. Decrements the count only for the same upcoming, future event with a positive count.
4. Rolls back the deletion if the event is ineligible or its count cannot be released (409).

No matching owned registration returns 404 without a decrement. Concurrent cancellation attempts produce one successful transaction and one not-found result. Ownership never comes from request body values. Existing unique registration indexes, creation transactions and organizer authorization remain unchanged.

The existing model has no cancellation history to preserve; **this milestone does not add retained cancellation history**. A future retention/audit requirement would need a deliberate schema and lifecycle change.

## Frontend and reuse

`CancelRegistration` is the shared action/dialog used in Event Details and the registration confirmation page. `useCancelRegistration` owns the mutation and recovery states and can be reused by the future Student Dashboard. No dashboard/profile UI was implemented.

The native modal dialog includes actual event title/date, a clear explanation, Keep registration and Confirm cancellation. It uses the existing paper/ink/sage/lime palette with a restrained terracotta destructive action. It focuses Keep initially, contains Tab/Shift-Tab, restores focus to the initiating control or resulting status, supports Escape, locks background scrolling, and disables dismissal/actions during the pending request. Dialog height is bounded with internal scrolling on small screens, and reduced motion disables entrance animation. It does not dismiss on backdrop click.

The existing in-memory CSRF transport now also supports DELETE, including the body reference. Only an explicit CSRF middleware rejection refreshes the token and retries once. Network/server errors are never automatically retried.

After a confirmed 200 response, the active record is cleared, a success state appears, and event availability is fetched again rather than decremented optimistically. Lookup state is shared between registration submission and cancellation; the confirmation page no longer keeps an independent registration object that could override a fresh cancellation result. Revisit/refresh uses the authenticated lookup endpoint.

`registrationEvents` notifies mounted lookups/event details in the same window and other same-origin tabs. Messages carry only public event ID and random notification identifiers, not student details, cookies or tokens. Recipients fetch their own authorized data. Duplicate same-window broadcast delivery is ignored. Older in-flight lookup responses cannot overwrite an accepted mutation result. Account changes remount registration form/action state to avoid retaining another session's draft or dialog.

## Error and uncertainty handling

- 404 does not claim a successful cancellation: the UI asks for a lookup, which can find no record or a replacement registration. A replacement is never automatically cancelled.
- 409 refreshes the event and preserves the registered state; ineligible events expose status instead of an actionable cancellation control.
- 401 follows the existing session-expiry behavior. Protected confirmation pages return to Login with their intended destination; public Details update to guest controls. No success is fabricated.
- 403 reports the session/security failure after the transport's bounded CSRF recovery.
- Network/5xx failures show an **unconfirmed** result. The action becomes Check registration status. An existing record permits another explicit cancellation; absence is reported as an updated status, not as proof this request caused the cancellation. If closing an uncertain dialog, its label becomes Close dialog rather than Keep registration, and both registration and event data are rechecked.

## Validation actually performed

- Frontend: `node --test src/lib/cancellation.test.js src/lib/registration.test.js src/auth/auth.test.js src/lib/eventAvailability.test.js` — **20 tests passed**, including 3 new cancellation/DELETE-CSRF tests.
- Backend: `node --test scripts/registration.test.js scripts/seed-events/seed.test.js scripts/seed-events/archive.test.js` — **18 tests passed**.
- Production build and scoped ESLint passed. Full client lint retains the two pre-existing unused React imports in the untouched dashboard placeholders.
- Live Express/MongoDB API checks used temporary students, organizer, events and registrations: ownership/role/session denial; invalid and stale CSRF rejection; legacy snapshot cancellation; future full-event cancellation; past/cancelled/completed/start-boundary refusal with rollback; repeated cancellation; two simultaneous DELETEs producing one success/one 404 and exactly one decrement; stale captured reference refusal after re-registration.
- Headless Chrome against an isolated preview of the real application/backend verified both entry points, no deletion on dialog open or Keep, initial focus, Tab containment, Escape and focus restoration, responsive mobile dialog, reduced motion, offline lookup/retry recovery, double-confirm protection, fresh Details seat counts, cross-tab confirmation invalidation, refresh/revisit persistence, normal Milestone 1 re-registration, closed-event control suppression and expired-session return without a count change.
- A deliberately failed response **after the server committed DELETE** verified that the frontend did not show premature success or send another DELETE. A subsequent real lookup reconciled absence and the count remained correct.
- Desktop/mobile dialog screenshots were visually inspected. Physical touch devices, other browsers and production hosting were not tested. Some recovery/dismissal variants are implemented but were not individually exercised in a browser.
- All temporary fixtures and owned sessions were removed. SHA-256 fingerprints of every pre-existing User, Event and Registration matched before/after testing. No seeded registration data was modified.

## Files

Created:

- `client/src/components/CancelRegistration.jsx` and `CancelRegistration.css`
- `client/src/hooks/useCancelRegistration.js`
- `client/src/lib/cancellation.js`, `cancellation.test.js`, `registrationEvents.js`
- This document

Modified:

- `client/src/components/EventRegistration.jsx`
- `client/src/pages/EventRegistrationPage.jsx`
- `client/src/hooks/useMyEventRegistration.js`, `useEventDetails.js`
- `client/src/auth/authClient.js`
- `server/src/controllers/registrationController.js`

No model, dependency, auth/session configuration, route or seed changes. Existing Mongoose `new: true` options still emit a non-blocking deprecation warning. All changes remain uncommitted.
