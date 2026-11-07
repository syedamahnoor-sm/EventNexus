# Student event registration — Milestone 1

## Flow and architecture

Event Details → **Register now** → `/events/:id/register` → student details → **Review my details** → **Submit registration** → server-confirmed registration.

The Details CTA is now a link, never a mutation. Neither opening the page nor entering the review step reserves a seat. Guests go to Login with the full registration destination preserved. Student role is checked by the frontend route and, authoritatively, by the existing backend middleware. Organizers cannot submit or open the student form.

The dedicated page uses actual event data, photography, date/time, venue and availability. It follows the existing paper/ink editorial composition and responsive visual system. A dedicated page avoids modal focus/scroll/dismissal complications. Inputs have labels, descriptions, autocomplete, length bounds, validation focus, visible focus, pending feedback and reduced-motion support. Review focuses its heading; confirmation focuses its heading. No dashboard, cancellation UI, profile page, QR ticket, email notification or attendance system is included.

## Data and validation

| Field | Rule |
| --- | --- |
| Full name | Required, trimmed, 2–100 characters; prefilled from the authenticated user. |
| Contact email | Required, valid email, trimmed/lowercase, maximum 254; prefilled from the authenticated user. |
| Student ID / roll number | Required, trimmed, maximum 80; free text, with no university-specific pattern. |
| Department / academic program | Required, trimmed, 2–120 characters. |
| Semester / year (`studyStage`) | Required, trimmed, maximum 60; free text rather than a fixed semester/year enum. |
| Contact number | Optional, maximum 40 characters, 7–15 digits when supplied; optional leading +, spaces, parentheses, dots and hyphens. Empty values are omitted. |

The User model currently has only name, email, password and role. There are no academic profile fields to prefill. This milestone saves one `Registration.attendee` snapshot containing the submitted fields; it does **not** silently edit User or create another profile copy. Name/contact email are captured so the event's contact record does not change when a future profile changes. The snapshot is contact metadata, not a verified student identity; authorization always uses the session user. Student IDs are not verified against a university directory. Contact email may differ from the account email; it neither changes the login address nor triggers an email.

`studentDetailsSchema.js` and the exported `attendeeSchema` validation are reusable by a future Student Profile implementation. That profile can prefill this same contract without migrating registration documents. Snapshot data remains event-specific and organizer-visible through the existing ownership-checked attendee endpoint. No new public PII endpoint is introduced.

Existing registrations/seed records have no attendee snapshot and remain valid/readable. The nested field is optional in Mongoose for compatibility; the public registration POST requires it for **all new submissions**. No migration, backfill, seed rewrite or account modification is needed.

## API changes

`POST /api/events/:id/register` keeps its URL, session/CSRF requirements, student role check and `201 { message, data: registration }` response. It now requires this strict payload:

```json
{
  "attendee": {
    "fullName": "Submitted full name",
    "email": "student@example.edu",
    "studentId": "University-issued identifier",
    "department": "Academic program",
    "studyStage": "University semester/year convention"
  }
}
```

`contactNumber` is optional. Empty `{}` requests now return 400 rather than creating a one-click registration. Unknown fields, including supplied student/event IDs, roles and seat counts, are rejected. The event ID comes from the validated route; the student ID/role comes from the real session. Zod validation uses the established middleware and field-error response shape.

The existing transaction still atomically reserves a seat only for an upcoming event with `date > now` and `registeredCount < capacity`, then creates its registration. The existing unique `(student,event)` index remains. A transaction-scoped duplicate check also identifies an existing registration when the event has since filled. Unique-index failure rolls back the seat increment. Cancellation API behavior and student ownership checks remain unchanged; no cancellation interface is added.

Added `GET /api/events/:id/registration`, authenticated student-only, returns `{ data: registration | null }` for **that session user**. It supports preflight checks, real confirmation restoration after refresh and ambiguous-result reconciliation, without fetching every registration. Existing organizer attendee access remains ownership-restricted.

## Submission and recovery

- The final button is disabled while pending, with a synchronous guard against double activation; database uniqueness remains authoritative across tabs/concurrent requests.
- The existing CSRF transport obtains a token in memory, sends credentials, and retries only an explicit middleware CSRF rejection once. It never automatically retries network/5xx mutations.
- A 201 response displays success and the real MongoDB registration reference, then refreshes event data. Existing registrations display their actual recorded confirmation without resubmission. Past/cancelled records use record-oriented wording rather than inviting attendance.
- 400 displays backend field errors; 409 refreshes eligibility and the current registration. Full, past, cancelled or completed events cannot be submitted. An already registered student sees their existing record.
- 401 clears shared auth state and returns to Login with the registration path. Unsaved draft details are not persisted across logout/refresh.
- A network/5xx result is explicitly unconfirmed. Submission is blocked until an explicit status lookup succeeds. If a registration exists, its real confirmation is shown; otherwise the student may submit again. The unique index protects against a late first response.
- Missing/invalid events, unavailable session checks, unavailable registration checks, event-load failures and retry states are handled without fake data.

## Validation performed

- Backend: `cd server; npm run test:registration` — 3 new tests passed. Existing seed/archive tests also passed (15 tests). Tests cover strict fields, university formats, normalization, model validation, legacy compatibility and the unique index.
- Frontend: `cd client; node --test src/lib/registration.test.js src/auth/auth.test.js src/lib/eventAvailability.test.js` — 17 tests passed, including 4 new registration tests.
- Scoped ESLint passed. Production Vite build passed. Full lint retains two pre-existing unused React imports in the untouched dashboard placeholders.
- Live development MongoDB/Express checks used temporary users/events and real session/CSRF cookies: malformed/spoofed details rejected, guest/organizer denied, stale/invalid CSRF denied, full/past/cancelled/completed/date-boundary events rejected, duplicate legacy registration preserved, and concurrent students competing for one place produced exactly one 201, one 409, one registration and a count of one.
- Headless Chrome against the actual application and backend verified guest return-to-form, real session prefills, required and phone validation, zero registrations after open/review, review focus, mobile width without overflow, offline ambiguous-result reconciliation with retained fields, double-submit prevention, real saved snapshot/reference, confirmation after refresh, refreshed Details seat count, closed-event form suppression, expired-session return and organizer restrictions. Desktop form/review/confirmation and mobile screenshots were visually inspected.
- All temporary fixtures and owned sessions were cleaned up. Before/after SHA-256 fingerprints of **every pre-existing User, Event and Registration document** matched. Development seed records were not modified.

Physical-device touch, other browsers, production deployment and a university identity/directory integration were not tested. Existing Mongoose `new: true` options emit a non-blocking deprecation warning; transaction behavior was verified. No dependencies were added; changes are uncommitted.

## Files

Created frontend: `pages/EventRegistrationPage.jsx`, `pages/EventRegistrationPage.css`, `components/StudentRegistrationForm.jsx`, `hooks/useMyEventRegistration.js`, `lib/registration.js`, `lib/registration.test.js`.

Modified frontend: `App.jsx`, `components/EventRegistration.jsx`, `auth/authRules.js`.

Created backend: `models/studentDetailsSchema.js`, `validators/registrationValidation.js`, `scripts/registration.test.js`.

Modified backend: `models/Registration.js`, `controllers/registrationController.js`, `routes/registrationRoutes.js`, `server/package.json` (test command only). Added this document. User, Event, session configuration, auth architecture, seed data and dependency versions are unchanged.
