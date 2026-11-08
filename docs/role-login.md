# Student and Organizer login

The existing editorial Login layout now contains a native Student / Organizer radio group with a restrained sliding forest-ink selection, readable supporting copy, keyboard focus, and reduced-motion support. It is disabled while submitting. The registration page keeps its student-only fields; its existing-organizer link opens Login with Organizer selected.

## Security and sessions

Both roles use the existing `POST /api/auth/login` and Express/MongoDB session architecture. The UI sends `email`, `password`, and `role`. Backend Zod validation accepts only `student` or `organizer` as role assertions; the role remains optional for older API clients. Omission authenticates the actual stored role, never a caller-supplied privilege.

The server finds the real account and verifies its bcrypt password **before** inspecting a role mismatch. Bad credentials remain generic 401 responses without account-role disclosure. Correct credentials with the wrong selection return `403` with `code: ROLE_MISMATCH` and a helpful instruction to use the matching login. No session regeneration, userId assignment, authenticated session save, role change, or account update occurs on mismatch. A failed attempt also cannot replace a prior valid session identity.

Successful login retains the existing session regeneration, real user serialization, CSRF rotation, credentialed Axios transport, session restoration, logout, and backend role middleware. The client navigates using the **returned user's actual role**, not its selected radio. Only explicit pre-controller CSRF rejection retries once; role mismatch is never silently retried. Passwords remain in the active form only and never enter browser storage.

Students default to `/student/dashboard`; organizers default to `/organizer/dashboard`. Existing known public return paths and role-authorized private paths take priority. External URLs, auth loops, traversal-like paths, control characters, backslashes, and the other role's workspace fall back to the account's own dashboard. A recognized organizer-only return path preselects Organizer for convenience, without granting access. Completing public signup always preselects Student for the subsequent login.

`POST /api/auth/register` remains strict and student-only: it rejects a `role` field and creates only a student. No organizer signup endpoint or new authentication architecture was introduced.

## Existing development organizer

- Email: `organizer@eventnexus-seed.invalid`
- Name: EventNexus Development Organizer
- Role: `organizer`
- Owned seeded events: 30
- Development database: the project's configured Atlas `eventnexus` database.

Read-only inspection confirmed the existing organizer and matching seed-manifest credential fingerprint; bcrypt cost is 12. No account or password was modified during this refinement, so no provisioning method was needed.

The original `server/scripts/seed-events/store.js` seed uses a random discarded password unless private `EVENTNEXUS_SEED_PASSWORD` is supplied **before first creation**. The current variable is absent and the manifest records that the original cohort did not enable a known demo password. That flag is historical; it does not disable login. This organizer subsequently received the user's approved secure local-development password reset, with its manifest fingerprint updated consistently. Use the password entered privately in that reset dialog. It is not stored in documentation or application configuration, and cannot be recovered from a bcrypt hash.

Setting the optional variable now or rerunning the seed does not change existing credentials. Do not delete/reseed the cohort to fix login. If the password is forgotten again, use an explicitly approved, one-account development reset that updates the seed fingerprint and invalidates only that organizer's sessions.

Login procedure:

1. Open `http://localhost:5173/login` (or visit `/organizer/dashboard` first to preserve that destination).
2. Select **Organizer**.
3. Enter `organizer@eventnexus-seed.invalid` and the privately configured password.
4. Choose **Log in as Organizer**. Normal login opens `/organizer/dashboard`.

Students select Student and use their own existing credentials. Public registration remains a student flow. The separate `archive-organizer@eventnexus-seed.invalid` account remains unchanged.

## Validation and files

81 automated tests passed: 43 frontend and 38 backend. Full frontend lint and production build passed. New tests verify strict role assertions, student-only signup, mismatch before any session mutation, generic invalid credentials, preserving a prior valid identity, actual-role session rotation, dashboard fallbacks, safe returns, selector defaults, and distinct mismatch/CSRF errors. Existing registration/profile/editor return-route tests were updated for the requested dashboard defaults. The server has no lint script.

Live development API checks passed using temporary student/organizer accounts and real MongoDB sessions: both role logins, mismatch without guest authentication, generic invalid credentials, session rotation/restoration, preserving a prior valid identity after a mismatched attempt, server-side logout, cross-role endpoint denial, and rejection of organizer signup payloads. Isolated actual-app instances retained the normal auth rate limiter; it was not disabled.

Headless Chrome passed native radio selection/arrow-key interaction, helpful mismatch feedback with no authenticated session, both default dashboard redirects, session persistence after refresh, student avatar logout and organizer logout, both protected-route role restrictions, an authorized student-profile return destination, the existing-organizer login link, student-only registration, and reduced-motion behavior. Screenshots at desktop/mobile sizes were inspected; widths 320, 390, and 1440 had no horizontal overflow. Physical-device and screen-reader testing were not performed.

An initial later-stage browser return check was interrupted by a database/network failure. The UI correctly showed a network error; exact-ID recovery removed the temporary test accounts and verified all baseline database fingerprints. The complete browser pass then succeeded with fresh temporary accounts. Final cleanup confirmed existing User, Event, Registration, AvatarCleanup, and seed-manifest records—including both seeded organizers and the approved main-organizer credential—were unchanged.

Known limitation: `connect-mongo` emitted `Unable to find the session to touch` warnings during rapid navigation/logout. All final role, persistence, logout, and authorization assertions passed. Session-store configuration was left intact; this concurrent-request warning was not suppressed or treated as a role mismatch.

Created:

- `client/src/components/LoginRoleSelector.jsx`
- `server/scripts/auth-roles.test.js`
- This document.

Modified:

- `client/src/components/AuthForm.jsx`
- `client/src/pages/Auth.css`
- `client/src/auth/authRules.js` and `auth.test.js`
- `client/src/lib/registration.test.js`, `studentProfile.test.js`, and `eventManagement.test.js` (dashboard fallback expectations only)
- `server/src/controllers/authController.js`
- `server/src/validators/authValidation.js`
- `server/package.json` (`test:auth-roles`)
- `docs/authentication.md`

Earlier uncommitted event-management work remains intact. No new dependencies, commits, pushes, or Git identity changes.
