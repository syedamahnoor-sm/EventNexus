# API reference

Base URL: `http://localhost:5000/api`. JSON is used except raw photo uploads. Authentication uses the HttpOnly `eventnexus.sid` cookie, not bearer tokens. Send credentials on browser requests. API responses use `Cache-Control: no-store`.

## Sessions and CSRF

First call `GET /auth/csrf-token` and retain its cookie and returned `csrfToken`. Every POST/PATCH/DELETE requires that cookie and `X-CSRF-Token`, including signup/login. Login rotates the session cookie and returns a new token; use that token afterwards. Tokens and passwords must not be persisted in browser storage. Only the exact pre-controller CSRF rejection can be retried once with a fresh token; ambiguous writes require status reconciliation.

| Method / path | Body or result | Access |
| --- | --- | --- |
| GET `/auth/csrf-token` | `{ csrfToken }` | Public |
| POST `/auth/register` | `{ name, email, password }`; returns `{ user }`, does not log in | Public + CSRF; student only |
| POST `/auth/login` | `{ email, password, role? }`; returns `{ user, csrfToken }` | Public + CSRF |
| POST `/auth/logout` | Empty object; destroys session | CSRF |
| GET `/auth/me` | `{ user }` | Signed in |

`role`, when supplied to login, asserts the existing account role (`student` or `organizer`); it never grants a role. Signup rejects it. Password signup minimum is eight characters, maximum 72 UTF-8 bytes. `403 ROLE_MISMATCH` is returned only after valid credentials. Authentication writes share a limit of 20 per 15 minutes per IP; safe session/token reads do not consume it.

## Events and organizer workspace

| Method / path | Contract | Access |
| --- | --- | --- |
| GET `/events` | `{ data: Event[], pagination }` | Public |
| GET `/events/:id` | `{ data: Event }`; organizer name, no organizer email | Public |
| POST `/events` | Event fields below; `{ event }` | Organizer |
| PATCH `/events/:id` | Nonempty subset of editable event fields; `{ data }` | Owner |
| POST `/events/:id/cancel` | `{}`; retains registration records | Owner |
| DELETE `/events/:id` | `{}`; only future scheduled event without any registration history | Owner |
| PATCH `/events/:id/recap` | Nonempty `{ recap?, highlights?, gallery? }` | Owner; past non-cancelled event |
| GET `/organizer/dashboard` | `{ data: { overview, next, events }, pagination }` | Organizer |
| GET `/organizer/events/:id` | `{ data }` including `hasRegistrationHistory` | Owner |
| GET `/organizer/events/creation/:key` | `{ data: Event or null }` | Organizer; own UUID key |

All writes also require CSRF. Create fields:

```json
{
  "title": "Campus Design Workshop",
  "description": "Bring a campus idea and explore it together.",
  "category": "Workshops",
  "location": "Campus Studio",
  "date": "2030-05-12T09:00:00Z",
  "capacity": 30,
  "registrationQuestions": []
}
```

Use a future date. Categories: `Technology`, `Workshops`, `Competitions`, `Career`, `Community`, `Other`. Optional `imageUrl` accepts validated HTTPS or local event paths; nonempty `imageAlt` is required with an image. Title bounds are 3–120, description 10–2000, location 3–200 characters. Capacity is a positive safe integer. The server owns organizer identity, counters, status and question revision; unknown request fields are rejected.

Event PATCH/cancel/delete require `X-Event-Version` with the current integer `__v`. Stale edits return 409. Question changes with registration history require `X-Confirm-Question-Changes: true`; existing snapshots remain intact. Create accepts `X-Idempotency-Key` (UUID v4): replay with identical fields returns the same event; different fields return 409. Recover uncertain creation using the private creation-key endpoint.

Public list parameters: `search` (literal text, max 100), `category`, `period=week|month`, `scope=upcoming|past`, `status=upcoming|cancelled|completed`, `sort=soonest|latest`, `page` (1–1000000), `limit` (1–50, default 12). Past scope rejects period and cancelled-status filters. Listing excludes question definitions; details includes them. Pagination includes `page`, `limit`, `total`, `totalPages`, `hasNextPage`.

Organizer dashboard parameters: `view=upcoming|past|cancelled|review`, `page`, `limit` (maximum 24, default 8); unknown parameters are rejected. Totals derive from owned events and active registration records, never from client counts. Passing a scheduled date does not verify attendance or completion.

Recaps accept up to 10000 characters, eight highlights (240 characters each), and twelve gallery entries `{ imageUrl, alt, caption? }`. Recap JSON is bounded to 128 KiB; ordinary JSON to 10 KiB; event/form writes to 64 KiB.

## Registration and participants

| Method / path | Contract | Access |
| --- | --- | --- |
| POST `/events/:id/register` | Attendee/answers below; `{ data: Registration }` | Student |
| GET `/events/:id/registration` | Own active attempt, otherwise latest cancelled attempt, otherwise null | Student |
| DELETE `/events/:id/register` | `{ registrationId }`; retains attempt and releases seat | Student; own attempt |
| GET `/registrations/me` | All own attempts with populated event; no internal cancellation actor | Student |
| GET `/events/:id/registrations` | Roster, event summary, totals and pagination | Owning organizer |
| GET `/events/:id/registrations/:registrationId` | Saved attendee/answers and cancellation metadata | Owning organizer |
| POST `/events/:id/registrations/:registrationId/cancel` | `{ confirmed: true, reason }`; reason 5–500 plain-text characters | Owning organizer |

```json
{
  "attendee": {
    "fullName": "Example Student",
    "email": "student@example.edu",
    "studentId": "CS / 2026 / 001",
    "department": "Computer Science",
    "studyStage": "Year 2"
  },
  "answers": [],
  "questionVersion": 0
}
```

`contactNumber` is optional. Supply the current event question revision and answers when definitions exist. Each answer is `{ questionId, value }`; text questions use strings, single-choice/dropdown use one option ID, multiple-choice uses option-ID arrays. Supported question types are `short_text`, `long_text`, `single_choice`, `multiple_choice`, `dropdown`. Definitions contain stable UUID IDs, `text`, `type`, `required`, contiguous `order`, and `{ id, label }` options for choice questions. See [question contracts](registration-questions.md) for bounds and examples. Submitted question definitions, student identity and seat counts are never accepted.

The API checks the authoritative question revision inside the registration transaction. Changed questions return `409 QUESTIONS_CHANGED`. Full, started or cancelled events reject new registrations. Duplicate active registration returns 409. Cancellation needs the exact attempt reference; repeating a terminal cancellation is read-only, and cannot cancel a later attempt.

Roster query: `search` (max 120 literal characters), `sort=newest|oldest`, `status=active|cancelled_by_student|cancelled_by_organizer|all`, `page`, `limit` (max 50, default 12). `total` is matched rows; `rosterTotal` includes history; `activeTotal` counts only active/legacy attempts. Roster rows exclude answer payloads; detail loads saved answers. Other organizers cannot access this data.

## Student profile and photos

| Method / path | Contract |
| --- | --- |
| GET `/students/profile` | `{ user, photoUpload: { configured, maxBytes, types } }` |
| PATCH `/students/profile` | `{ version, name?, studentId?, department?, studyStage?, contactNumber? }`; returns saved user |
| POST `/students/profile/photo` | Raw JPEG/PNG/WebP body, matching `Content-Type`, `X-Profile-Version` and CSRF headers |
| DELETE `/students/profile/photo` | `X-Profile-Version` and CSRF headers |

All require student authentication. Profile version is mandatory; stale changes return 409. Incomplete academic fields can remain empty. Account email/role/identity cannot be changed here. Profile changes do not rewrite existing registration snapshots. Photo changes are limited to ten per 15 minutes per IP, accept at most 5 MiB, and require configured managed storage. Storage credentials/owned keys are never returned to the browser. Cleanup intent is journaled for interrupted storage changes.

## Errors and consistency

400 invalid input, query or reference; 401 unauthenticated; 403 failed CSRF, role or ownership; 404 absent record; 409 stale version, duplicate or lifecycle conflict; 413 oversized body; 415 unsupported photo type; 422 unsafe/corrupt image; 429 rate limited; 500 internal error; 503 unavailable storage or lifecycle migration required. Responses normally include `message`; validation may include field errors or `errors.fieldErrors`. A missing CSRF token is rejected before authentication, so an expired session mutation may return 403 first.

Registration lifecycle constraints, cancellation seat changes and durable audit insertion are transactional. Missing/incorrect indexes cause `503 REGISTRATION_MIGRATION_REQUIRED`, with no partial cancellation. Do not recover uncertain writes by blindly resubmitting different payloads.
