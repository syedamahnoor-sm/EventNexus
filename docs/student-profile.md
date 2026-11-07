# Student Profile — Milestone 4

## Student experience

`/student/profile` is a student-only route using the existing session context and protected routing. Students reach it through the new **Profile** navigation link or **Your student profile** on My campus. My campus and all event routes remain available; organizer navigation exposes no student profile link.

The page uses the established ink/paper editorial layout, expressive typography and restrained lime/sage accents. It includes real account name/email, an initials avatar, actual account creation date when present, saved academic/contact details, a completeness indicator, and an explicit edit/save/cancel flow. Missing values say Not added yet. There is no upload, invented photo, achievement, attendance score or university-verification claim.

Profile essentials are **name, email, student ID, department/program and semester/year**. The indicator counts non-empty **saved** fields out of five; optional phone does not affect it. A basic name/email account is 2/5 (40%), not a fabricated participation metric. Draft values do not increase completeness before a confirmed save.

## Model and API

The existing User remains the only account identity. Name and email stay canonical top-level fields. Added optional embedded `User.studentProfile` fields:

| Field | Validation |
| --- | --- |
| Name (`User.name`) | Trimmed, 2–100 characters for profile updates. |
| Student ID / roll number | Optional/clearable, maximum 80 characters; no university-specific pattern. |
| Department/program | Optional/clearable, otherwise 2–120 characters. |
| Semester/year (`studyStage`) | Optional/clearable, maximum 60 characters; free text. |
| Contact number | Optional/clearable, maximum 40 characters; 7–15 digits when present, optional leading + and ordinary spaces/parentheses/dots/hyphens. |

`profileVersion` is a non-negative integer for optimistic concurrency. Legacy documents lacking it are treated as version zero; missing academic fields remain empty. There is no bulk migration or automatic backfill from historical registrations. The new Zod profile validator reuses the existing attendee validation bounds while allowing incomplete saved profiles. The embedded profile omits duplicated name/email and has no independent ID.

- **GET `/api/students/profile`** returns `{ user }` for the authenticated student.
- **PATCH `/api/students/profile`** accepts a strict partial update containing `version` and at least one of `name`, `studentId`, `department`, `studyStage`, `contactNumber`. Empty academic/contact strings clear those fields. Omitted editable fields are preserved. It returns `{ message, user }` only after MongoDB confirms the update.

Example payload (illustrative interface contract, not seeded profile data):

```json
{
  "version": 0,
  "name": "Submitted student name",
  "studentId": "University-issued identifier",
  "department": "Academic program",
  "studyStage": "University semester/year convention",
  "contactNumber": ""
}
```

Both endpoints use existing authentication and student-role middleware. The write target always comes from `req.user._id`; no URL/body user ID is used. Role, email, password, timestamps, nested mass-assignment objects and unknown fields are rejected. Profile updates retain global CSRF protection. The existing in-memory CSRF transport now supports PATCH and still retries only an exact middleware token rejection once, never an ambiguous network/server failure.

The update is an atomic compare-and-set on the current student and profile version; it increments the version and writes only explicitly allowed fields with model validators enabled. A stale/concurrent update returns 409 instead of overwriting the other save. The existing password hash, account creation date and session are not modified. Email editing remains disabled because no verified email-change flow exists.

`publicUser` is a shared explicit allowlist for signup, login, session restoration and profile responses. It exposes name/email/role/ID/account creation date and, for students, academic details/version. It never returns password hashes, internal document versions or session secrets. The auth middleware selects only the safe fields needed by protected controllers. Auth and profile routes send `Cache-Control: no-store` for private responses. Session/cookie configuration, password hashing, auth rate limits and authorization architecture remain unchanged.

## Editing, drafts and conflicts

The editor keeps a separate draft, baseline and version. Saved data may refresh in the sidebar/context without resetting inputs. Editable fields have labels, autocomplete where appropriate, hints, field errors, visible focus and pending feedback. Email is read-only and excluded from the update payload. A synchronous submission guard and disabled pending controls prevent duplicate activation.

Drafts live **only in memory in the current tab**, keyed by the authenticated user. They survive SPA navigation away/back, but are cleared on successful save, explicit cancellation or account/logout changes. No profile data, password or tokens are put in localStorage/sessionStorage. A before-unload warning protects dirty edits on refresh/close where the browser permits it; save before refreshing, closing or signing out. Draft persistence across browser restarts is intentionally absent.

When another tab saves, the existing auth channel sends a change notification without profile data. The receiving tab restores the current user from the backend. Open drafts remain unchanged and stale-version saves are blocked. The editor offers a saved-value comparison and an explicit Keep my edits and review action: changed draft fields are retained, untouched fields take the latest saved values, and a new explicit Save is required. Backend compare-and-set still protects a subsequent race.

Network/5xx failures never show an assumed save. The draft remains, automatic PATCH retry is blocked, and Check saved profile performs a real GET. Matching persisted values can then be reported as verified; otherwise the current saved profile is loaded while the draft remains for review. Cancelling an uncertain draft also rechecks saved data rather than claiming the server was unchanged. Initial loading, API errors/retry and session-expiry redirects are handled separately.

## Session and registration integration

The existing HttpOnly session cookie and MongoDB session store remain authoritative. Profile saving does not regenerate or replace the session. Confirmed user responses synchronize AuthProvider immediately and notify other tabs; older session/profile responses cannot downgrade newer profile data. A profile response for a different current session identity triggers session revalidation rather than mixing account data.

Login and `/auth/me` now include the saved student details. `initialStudentDetails` prefills future registration forms with canonical name/email plus saved student ID, program, year and phone. Incomplete profiles still yield an editable registration form with blank unknown fields; event-registration validation continues to require its own academic details.

Already-open registration drafts are not silently overwritten by a background profile update. Students can still change their registration-time details, review and submit them independently. Profile updates touch only User: no Registration update/backfill is performed. Existing snapshots stay exactly as submitted, including historical name/contact details, even after later profile changes. Registration-only edits likewise do not update the profile.

## Validation performed

- Frontend: `node --test src/lib/studentProfile.test.js src/lib/studentDashboard.test.js src/lib/cancellation.test.js src/lib/registration.test.js src/auth/auth.test.js src/lib/eventAvailability.test.js` — **30 tests passed**, including five new profile/prefill/draft/PATCH-CSRF tests.
- Backend: `node --test scripts/profile.test.js scripts/registration.test.js scripts/seed-events/seed.test.js scripts/seed-events/archive.test.js` — **21 tests passed**, including three new profile validation/model/serialization tests.
- Full client lint and production Vite build passed.
- Live Express/MongoDB tests used temporary student/organizer accounts, events and real sessions: legacy missing-version/profile reads and updates; self-only writes; mass-assignment/email/role/password rejection; invalid data/CSRF rejection; password/session/other-student preservation; stale and concurrent version refusal; immutable existing registration snapshot.
- Headless Chrome against the actual app/backend verified guest return, initial loading, real profile values, incomplete/saved essentials, readonly email, validation focus and Enter submission, persistent saved values after refresh, dashboard name/navigation synchronization, same-tab draft recovery and cancellation, cross-tab conflict/merge without input replacement, offline and committed-but-lost-response recovery, initial API error/retry, all six registration prefills and editable registration-only overrides, unchanged old/new registration snapshots after further profile edits, a second student account, organizer denial, and session expiry without a write.
- Layouts were checked at 1440px, 900px and 390px. Desktop view/edit/save and mobile screenshots were visually inspected; reduced motion was checked. Physical touch devices, other browsers, native before-unload prompts and production hosting were not tested.
- API and browser phases used separate instances of the existing application so the unchanged auth rate limiter was not exhausted by the combined QA sequence. Interrupted QA fixtures were recovered with exact manifest checks. Final cleanup removed temporary users/events/registrations and their identifiable authenticated sessions; every pre-existing User/Event/Registration SHA-256 fingerprint matched. Seed records were not changed.

## Boundaries

No organizer feature, photo upload, public student directory, social profile, password reset, email verification/change or attendance feature is included. Academic identifiers and phone ownership are not independently verified. Drafts are memory-only; production deployment and additional browsers/devices remain unverified. Existing registration code still emits its prior non-blocking Mongoose `new: true` deprecation warning. No dependencies were added. No commits or pushes were made.

## Files

Created frontend:

- `client/src/pages/StudentProfile.jsx` and `StudentProfile.css`
- `client/src/components/StudentProfileEditor.jsx`
- `client/src/hooks/useStudentProfile.js`
- `client/src/lib/studentProfile.js` and `studentProfile.test.js`

Modified frontend:

- `client/src/App.jsx`
- `client/src/auth/AuthProvider.jsx`, `authClient.js`, `authRules.js`
- `client/src/components/Navbar.jsx`
- `client/src/pages/StudentDashboard.jsx` (profile link)
- `client/src/lib/registration.js` (saved-profile prefill)

Created backend:

- `server/src/models/studentProfileSchema.js`
- `server/src/validators/profileValidation.js`
- `server/src/controllers/profileController.js`
- `server/src/routes/studentRoutes.js`
- `server/src/utils/publicUser.js`
- `server/scripts/profile.test.js`

Modified backend:

- `server/src/models/User.js`
- `server/src/middleware/requireAuth.js`
- `server/src/controllers/authController.js`
- `server/src/routes/authRoutes.js`
- `server/src/app.js`

Added this document. Event/Registration models, registration controllers, seed catalogs, dependency versions and Git configuration are unchanged.
