# EventNexus authentication

The Login and Register pages use the existing Express session architecture. Login now includes an accessible Student / Organizer selector checked against the account's stored role before session creation. Cookie options, CSRF checks, session storage, and role authority remain unchanged. No dependencies were added. See [role login and development organizer notes](role-login.md) for the refinement's account details and validation.

## Contracts and session state

| Endpoint | Frontend use |
| --- | --- |
| `GET /api/auth/me` | Restore the current user on initialization; recheck on window focus after five seconds or on a cross-tab session change. A 401 is an anonymous session; a network/server failure is an unavailable check, not a guest login. |
| `GET /api/auth/csrf-token` | Obtain the current session's CSRF token before an authentication mutation. |
| `POST /api/auth/register` | Submit only `name`, normalized `email` and `password`. Creates a **student** account, without authenticating. Confirmation is validated locally and never sent. |
| `POST /api/auth/login` | Submit normalized `email`, `password`, and selected `role`. The server verifies credentials and role before rotating the session. Accept the actual user and freshly rotated CSRF token. Older API clients may omit role; it never assigns privileges. |
| `POST /api/auth/logout` | Destroy the server session, then clear frontend user state and the in-memory CSRF token on confirmed success. An ambiguous failure is reported rather than falsely claiming logout. |

`AuthProvider` exposes user, role, authenticated, initializing, status, pending, refresh, login, register and logout through `useAuth`. Initialization shares one in-flight request, including React StrictMode effect replay. Navbar, route guards and the existing Event Details registration panel consume that state rather than each requesting `/auth/me`. Existing event registration logic remains in place; no new registration workflow was implemented.

The unchanged Axios instance sends `withCredentials: true`. Express keeps the session in MongoDB's `sessions` collection and sends the HttpOnly `eventnexus.sid` cookie (SameSite=Lax; Secure in production; current lifetime 24 hours). Refresh restores the user from the cookie through `/me`, rather than persisting credentials or user identity in browser storage. Passwords exist only in the active form's memory. No passwords, session IDs or security tokens are stored in localStorage/sessionStorage. BroadcastChannel sends only a change notification, with no user or token payload. A backend 401 on a protected API call clears the shared user state.

## CSRF and failures

`authClient` deduplicates token acquisition and keeps the token in memory. Login replaces it with the token returned for the regenerated session; logout clears it. Only an exact `403 / Invalid or missing CSRF token` rejection retries once after obtaining a fresh token. This middleware rejection precedes controller execution. Network failures, general permission failures, 5xx responses and ambiguous writes are never automatically retried.

The forms distinguish invalid credentials, duplicate email, backend field validation, rate limits, CSRF failures and network/server failures. An unconfirmed signup tells the user to attempt login before resubmitting. Names, email format, confirmation, the eight-character registration minimum and bcrypt's 72 UTF-8 byte limit are checked locally; backend validation remains authoritative.

## Routes and roles

Guests reaching `/student/dashboard` or `/organizer/dashboard` are redirected to Login with the intended path preserved. Role mismatch shows an access explanation and a link to the user's own account; it does not render the other role's content or create a redirect loop. Return destinations are limited to known internal routes and the matching role's workspace.

Both roles have dedicated protected dashboards. Navigation preserves the student avatar menu and the organizer workspace entry. Public signup does not expose a role selector because the backend's strict registration contract creates students only. Existing organizers log in using the Organizer option; provisioning remains an administrative/backend responsibility. A valid password with the wrong login selection returns `403 ROLE_MISMATCH` before session regeneration or user assignment; existing valid sessions are not replaced by failed attempts.

Loading and unavailable session checks have separate UI states. After login, students default to `/student/dashboard` and organizers to `/organizer/dashboard`. A known, role-authorized return destination takes priority. Login/Register preserve that destination between each other. After student signup the user sees a success message on Login with Student selected, their email prefilled, and no password retained across pages.

## Design and accessibility

The asymmetric ink-and-paper composition uses existing fonts, brand mark and lime/sage accents. A compact mobile composition keeps the form readable. Inputs have explicit labels, autocomplete, descriptions, linked validation, visible focus and 16px input text. Password visibility controls are actual keyboard-accessible buttons. Invalid submission focuses the first invalid input; server errors focus an alert summary. Duplicate submissions are disabled while pending. Entrance motion respects reduced-motion preferences. The shared navigation uses a disclosure at tablet widths to accommodate role-aware links.

## Validation

- `cd client; node --test src/auth/auth.test.js src/lib/eventAvailability.test.js`: 13 tests passed (five new auth tests, eight existing availability tests).
- Scoped ESLint of all changed frontend JavaScript/JSX passed. Full client lint still reports two pre-existing unused React imports in the untouched dashboard placeholder files.
- Production Vite build passed.
- Live development API checks used the actual Express app, MongoDB session store and the frontend CSRF client. Student login, invalid credentials, student denial at the organizer endpoint, organizer access, rejected role escalation, missing/invalid CSRF rejection, real stale-token recovery, session rotation and server-side session destruction passed.
- Headless Chrome against an isolated Vite/API preview of the actual application passed real student signup/login, refresh persistence, logout, invalid credentials, duplicate email, both role restrictions, role-aware navigation, intended-route restoration, a single initialization request, keyboard Tab/Enter password controls, validation focus, offline errors, and reduced motion. Layouts were checked at 1440px, 900px and 390px; desktop/tablet/mobile screenshots were visually inspected. The preview uses the existing backend and development MongoDB, not mocked responses. One earlier run stalled during refresh and cleanup; exact-account recovery cleanup succeeded before the full suite passed on rerun.
- QA accounts use unique development-only addresses. Cleanup targets their exact identities and session IDs, checks that they own no events/registrations, and compares pre-existing User/Event/Registration fingerprints before and after testing.
- The successful browser runner stalled in its own finalizer while querying Chrome after closing it. That runner was stopped; a separately verified cleanup removed the exact two remaining QA accounts and their owned sessions. The final database check found zero authentication QA accounts, and SHA-256 comparisons confirmed that every non-QA User/Event/Registration record was unchanged. This was a test-harness shutdown issue, not an application logout failure.

## Remaining boundaries

No dashboard, organizer provisioning, password reset, email verification, upload or new event-registration UI is included. Deployment must configure the existing API URL, credentialed CORS origin, HTTPS and cookie settings for its topology; cross-site hosting is not configured by this milestone. The existing backend auth rate limiter applies to all `/api/auth` requests (20 per 15 minutes), including session/token reads; it was preserved. Browser checks do not establish coverage for physical touch devices, other browsers or a production deployment.

## Files

- Added `client/src/auth/{AuthContext.js,AuthProvider.jsx,authClient.js,authRules.js,auth.test.js,ProtectedRoute.jsx,AccountPlaceholder.jsx}`.
- Added `client/src/components/{AuthLayout.jsx,AuthForm.jsx}` and `client/src/pages/Auth.css`.
- Modified `client/src/App.jsx`, `pages/{Login.jsx,Register.jsx}`, `components/{Navbar.jsx,Navbar.css,EventRegistration.jsx}`.
- Added this document. Backend, database schemas, event records, seed data and dependency manifests are unchanged.
