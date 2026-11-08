# Organizer participant management

## Routes and navigation

- `/organizer/events/:id/participants`: private, paginated roster.
- `/organizer/events/:id/participants/:registrationId`: private registration details, with a back link preserving roster search, order and page.
- Manage participants is visible on owned event entries and in the event editor. Past and cancelled events remain accessible. Existing creation, editing, lifecycle actions and dashboard metrics are unchanged.

Both pages use the existing organizer-only protected route, session restoration and authorized login return destinations. The participant page is loaded as a separate frontend chunk.

## API contract

`GET /api/events/:id/registrations` extends the existing endpoint with:

- `search`: trimmed literal substring, up to 120 characters. Searches submitted full name, email and student ID, case-insensitively. Regex syntax is escaped; control characters, nested values and unknown query fields are rejected.
- `sort`: `newest` (default) or `oldest`, with registration ID as a stable tie-breaker.
- `page`: positive integer up to 1,000,000, default 1.
- `limit`: positive integer up to 50, default 12. The frontend uses 12.

Response: `event`, `data`, `total` (matching registrations), `rosterTotal` (all registrations for this event), and `pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }`. An empty result has zero total pages. The UI returns an out-of-range page to the last available page when results remain.

One event-scoped aggregation stream computes matching totals, roster totals and bounded rows. The compound registration index `{ event: 1, createdAt: -1, _id: -1 }` supports both sort directions. Search is limited to registrations for the owned event; it is a substring scan, not a global student search.

`GET /api/events/:id/registrations/:registrationId` returns `event` and a single `data` registration. The query includes both the registration ID and the authorized event ID. A registration from another event returns 404. Both endpoints set `Cache-Control: no-store`, require a valid session, enforce organizer role, and verify the event owner from the session identity. Client-supplied organizer/student IDs are not accepted.

## Historical data and privacy

The roster projects only registration ID/date and submitted name, email, student ID, department and academic stage. The detail view additionally returns submitted contact number (if present), question revision and saved answer snapshots. Neither endpoint populates current User records or exposes student account IDs, photos, profile data, password hashes or session data. Public event endpoints return no participant information.

Saved `attendee` and `answers` are authoritative. All five custom answer types display using original question wording and selected option labels; current Event questions are not used to reconstruct answers. Missing legacy information reads “Not recorded”; it cannot be searched by a current profile name that was never submitted. No registration status field exists, so the interface describes a registration as “on record”, never verified attendance.

Student cancellation continues to delete its registration in the existing transaction and decrement capacity once. Deleted registrations are therefore excluded from roster/history. Event cancellation retains existing registrations and displays a clear cancelled-event notice. No attendance, approval, messaging, export or participant mutation features are added.

The frontend cancels obsolete requests, scopes state to identity/event/detail, refreshes on visibility/focus and existing event/registration notifications, clears rows on identity/query changes, preserves the same query during background refresh to retain keyboard focus, and clears rows if verification fails, and uses the existing authentication interceptor on session expiry. Refresh/revisit reads MongoDB again. This is not a live push subscription.

## Files

Created:

- `server/src/controllers/participantController.js`
- `server/src/utils/participants.js`
- `server/scripts/participants.test.js`
- `client/src/pages/OrganizerParticipants.jsx`
- `client/src/pages/OrganizerParticipants.css`
- `client/src/hooks/useParticipants.js`
- `client/src/lib/participants.js`
- `client/src/lib/participants.test.js`
- `docs/organizer-participants.md`

Modified:

- `server/src/controllers/registrationController.js` (delegates the roster to the new controller)
- `server/src/routes/registrationRoutes.js`
- `server/src/models/Registration.js` (compound index only)
- `server/package.json` (`test:participants` command)
- `client/src/App.jsx`
- `client/src/auth/authRules.js`
- `client/src/components/OrganizerEventActions.jsx`
- `client/src/components/OrganizerEventManagement.css`
- `client/src/components/RegistrationAnswerSummary.jsx` (configurable heading/description; existing student defaults preserved)
- `client/src/pages/OrganizerEventEditor.jsx`

No dependencies, account/schema migrations or seed changes are required. The new index should be included in normal deployment index management where automatic indexing is disabled.

## Verification

- All 99 automated tests passed: 48 backend and 51 frontend. Six new tests cover participant query validation, regex escaping, scoped pagination/projection, legacy presentation and authorized return destinations. Backend command: `npm run test:participants`; client focused command: `node --test src/lib/participants.test.js`.
- Full client lint, production build and `git diff --check` passed. The server has no configured lint command. The participant page is a separate lazy-loaded bundle.
- Real Express/MongoDB checks passed for owner-only list/detail access, guest/student/cross-organizer denial, registration-to-event association, search by submitted name/email/ID, literal regex characters, stable oldest/newest sorting, accurate totals/pages, bounded inputs, historical answers after question/profile changes, legacy snapshots, cancelled events, student cancellation deletion/counter updates, minimized fields, no-store headers and absence of participant content from public event details.
- Headless Chrome completed roster/detail navigation, Enter-key activation, search, sorting, pagination, back-link query restoration, historical answer display, legacy/empty/cancelled states, offline failure/retry, dashboard action navigation, cross-organizer/student denial and expired-session redirect. Viewport/overflow checks ran at 1440, 390 and 320 pixels. Desktop roster/detail and mobile roster screenshots were inspected.
- Temporary fixture users/events/registrations/sessions were removed. Original User/Event/Registration/AvatarCleanup data and seed manifests matched baseline fingerprints. Later repeat checks encountered transient Atlas DNS failures; the final focused screenshot retry failed before creating fixtures.

Limitations: a mobile detail screenshot taken during viewport resizing captured a blank frame. The settled screenshot recheck was blocked by Atlas DNS, so final mobile-detail visual sign-off remains incomplete. The long detail surface is static, with entrance motion confined to its heading. Physical devices, screen readers and other browser engines were not tested. Existing cancellation emits a Mongoose deprecation warning for its `new` option; cancellation verification passed and that unrelated implementation is unchanged.
