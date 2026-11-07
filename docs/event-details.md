# Event Details integration

The existing `/events/:id` route now displays the public event record with shared category artwork, full description, organizer name, local date/time, location, capacity and remaining seats. Explore cards preserve their filter URL in navigation state for the return link. No backend changes or new dependencies are required.

## API contracts used

- `GET /api/events/:id`: `{ data: event }`; malformed ID is 400, missing record is 404.
- `GET /api/auth/me`: `{ user }`; 401 means signed out. Other failures do not imply guest or student status.
- `GET /api/registrations/me`: `{ data: registrations }`; used only for an authenticated student, matching the populated `event._id`.
- `GET /api/auth/csrf-token`: `{ csrfToken }`; fetched immediately before registration.
- `POST /api/events/:id/register`: empty JSON body, session cookie, `X-CSRF-Token` header; 201 confirms registration. No automatic POST retries.

Registration closes for cancelled, completed, past and full events. The start-time boundary updates without polling. Duplicate/conflict responses refresh registration and event information. A timeout or server failure after submission requires a registration check before another attempt; the UI never assumes the request failed to reserve a seat. The backend remains authoritative for eligibility and concurrent seat allocation.

## Existing integration requirements

- Login/Register and the student dashboard remain existing placeholders. Guest links pass `{ from: '/events/:id' }` as router state; a future login implementation should honor that destination after server-confirmed login. A pre-existing valid student session can already use the registration panel.
- The backend registration controller uses MongoDB transactions: production and local registration testing need a transaction-capable MongoDB deployment (replica set or sharded cluster).
- Preserve the current credentialed Axios client, configured API origin, CORS client origin and session-cookie/CSRF protections. No credentials or CSRF tokens are persisted by this page.
- The model supplies a single start instant, with no end time, event time zone, price or image field. The UI labels date/time as local and does not fabricate those absent details. No waitlist or cancellation UI is introduced.

## Validation

Run from `client`:

```text
npm.cmd run build
npm.cmd run lint
node --test src/lib/eventAvailability.test.js
```

Five availability tests cover counts, over-capacity events, cancelled/completed precedence, the exact start-time boundary and unconfirmed details. Read-only live endpoint checks confirmed invalid/missing IDs and guest session/registration protection. The database contained no upcoming events during validation. No registrations or sample events were created.

Browser tooling and an authenticated student session were unavailable, so rendered responsive/motion behavior and successful registration still require an end-to-end review. Full lint reports four existing unused React imports in untouched authentication/dashboard placeholders; scoped lint passes.
