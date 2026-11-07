# Development campus-event seed

This tool uses the existing User, Event, Registration models and database connector. It never changes React data, existing accounts or real event records. No new packages are required.

## Run

Run from `server`, with the existing `.env` pointing to a **development database** and explicitly declaring `NODE_ENV=development`. Do not override a production environment to make the guard pass.

PowerShell, for this repository's development database:

```powershell
$env:EVENTNEXUS_SEED_ALLOW = 'development-only'
$env:EVENTNEXUS_SEED_DB = 'eventnexus'
npm run seed:events
npm run seed:events:verify
```

`EVENTNEXUS_SEED_DB` must match the explicit database name in `MONGO_URI`. Use the actual development database name if yours differs. Unset, test and production `NODE_ENV` values are refused, as are system/production-named databases, production deployment indicators and missing opt-ins. The operator must confirm that the configured database really is development: a URI alone cannot prove a remote deployment's purpose. Neither the URI nor credentials are printed.

The database must support transactions (a MongoDB replica set or sharded cluster). Seed creation, its ownership manifest, and cleanup each commit atomically; standalone MongoDB is refused. The existing model indexes are initialized and all inserts use normal Mongoose validation. The application API and authentication architecture are unchanged.

## What it creates

| Category | Events |
| --- | ---: |
| Technology | 6 |
| Workshops | 5 |
| Competitions | 5 |
| Career | 5 |
| Community | 5 |
| Other | 4 |
| **Total** | **30** |

Events have distinct descriptions and campus venues. All are upcoming, scheduled 1–65 days relative to the first successful seed run, with campus wall-clock hours in UTC+05:00 stored as UTC instants. There are events inside the next seven days, inside the next calendar month, and beyond the next month. The frontend continues to display those instants in the viewer's local time zone.

Six events start fully booked, six have exactly two places left, and the others have plentiful seats, including two with no initial registrations. One organizer and 60 fictional students supply genuine User references. There are 765 initial Registration records. Every `registeredCount` corresponds to actual Registration records; students can be registered across multiple events but never twice in the same event. There are no synthetic counters or bypasses of the registration/cancellation invariants.

Each event description ends with `[Development sample: eventnexus-campus-events-v1]` and its catalog key. Fictional accounts use the reserved `eventnexus-seed.invalid` domain. The `development_seed_manifests` collection stores exact record IDs and identity fingerprints; the script does not add private metadata fields to the application schemas.

## Repeat runs and test activity

The fixed manifest ID makes the seed repeatable. An existing complete cohort is inspected and retained, without overwriting titles, dates, seat counts, or test activity. Valid registrations/cancellations are respected. Reruns do not add users, events or registrations. Competing invocations cannot commit duplicate cohorts; one may fail a unique constraint and can then be rerun.

Dates are intentionally **not** moved on each invocation, so an old cohort eventually becomes past. Use the guarded cleanup followed by seed to create a fresh relative-date cohort. If a cohort is partially damaged, ownership markers changed, or counters disagree with actual registrations, the script refuses to guess or repair existing data.

## Optional interactive test accounts

By default passwords are cryptographically random, bcrypt-hashed with cost 12, discarded, and never logged. These accounts are not usable with a known default password.

Before the **first** seed, optionally supply a private `EVENTNEXUS_SEED_PASSWORD` environment variable (12+ characters, at most 72 UTF-8 bytes). This applies only to:

- `organizer@eventnexus-seed.invalid` — organizer.
- `student-001@eventnexus-seed.invalid` — student.

The remaining fictional students always use an unguessable password. Never commit the environment variable, put it in a shell command shared with others, or reuse a production password. Remove it from your environment after seeding. Supplying a different value on a repeat run **does not** change any account password. Existing Login/Register screens are placeholders; this seed does not implement authentication UI.

## Guarded cleanup

For the later photography milestone, see [Event photography sources](../../../docs/event-photography.md). `npm run seed:events:images` attaches local images to the existing cohort in place, preserving IDs and registration data. There is no need to run cleanup or recreate events just to add photographs. Normal seeding also attaches missing photo fields when a cohort already exists.

Use the same three development checks, stop other writers during cleanup, and run:

```powershell
npm run seed:events:cleanup
```

Cleanup uses only manifest-listed IDs and verifies user identities, event organizer/description markers, and registration ownership before deleting anything. It tolerates already-removed owned records. A missing manifest is a no-op; it never falls back to deleting by title, email domain, description search or entire collection.

If a real student has registered for a seeded event, a sample account has created another event, or any untracked registration references the cohort, cleanup refuses the **entire** operation. Explicitly resolve those outside dependencies first, using the application or a separately reviewed operation; the seed will not remove records it did not create. Re-registering a fictional student after cancellation creates a new, untracked registration and is also protected. Cleanup leaves application sessions alone; sessions for removed sample users no longer authenticate.

After successful cleanup the manifest is removed too, and a second cleanup is harmless. No collections, indexes, unrelated users, or unrelated events are dropped.

## Validation commands

```powershell
npm run test:seed
npm run seed:events:verify
```

The offline tests verify environment guards, secret-safe errors, distribution, unique content, real API/Mongoose schema compatibility, relative date boundaries and planned attendance. They do not connect to MongoDB.

The verification command inspects actual database references and registration counts, then makes real HTTP GET requests to the running backend (default `http://localhost:5000/api`). A credential-free local `EVENTNEXUS_SEED_API_URL` can select another development port. Verification checks:

- Public listing and the exact 30-record seed cohort.
- All six category filters and title search.
- Seven-day and calendar-month filters.
- Both date sorts and deterministic ordering.
- Five pages of seven records: 7/7/7/7/2, with correct metadata.
- Event details with a populated organizer and a malformed-ID response.

Queries use the seed marker where appropriate, so pre-existing real events do not distort the expected category/page counts. Verification fails if the API points to a different database or the cohort has aged out of its expected windows. Browser checks are separate: open Home, Explore, filtered results and a card's `/events/:id` route at desktop/mobile widths. Do not infer browser or authenticated-registration coverage from these GET checks.

## Validation performed on 2026-11-07

- All eight offline tests, JavaScript syntax checks and Git whitespace checks passed.
- The configured development MongoDB was seeded successfully: 30 events, 61 sample users and 765 registration records.
- A repeat seed preserved the same cohort without adding records.
- Guarded cleanup deleted exactly those records. SHA-256 fingerprints and counts of all pre-existing User/Event/Registration documents matched the pre-seed audit afterward; the one pre-existing user was unchanged. A second cleanup was a no-op.
- A fresh final cohort was created and left in the database. The real API verification passed for every category, title search, seven-day filtering (10 events), calendar-month filtering (23 events), both sorts, pagination, details and invalid IDs. Database reference and seat-count checks also passed.
- The frontend production build passed. Full frontend lint retains four pre-existing unused React imports in the untouched Login/Register and dashboard placeholders. No frontend code was changed.
- Browser tooling was unavailable. Card links and the `/events/:id` route were inspected in source; actual browser clicks, layout and authenticated registration were not tested.


## Separate Previous Events cohort

Campus Rewind uses `npm run seed:archive`, `npm run seed:archive:verify`, and `npm run seed:archive:cleanup` under the same development guards. Its thirteen fictional historical fixtures and dedicated organizer have their own ownership manifest; the twelve eligible events are separate from the original thirty upcoming samples. See [Campus Rewind](../../../docs/campus-rewind.md) for lifecycle rules, recap validation, testing and cleanup behavior.
