# Testing and fixture safety

Use Node 22.12+ (QA used Node 24). Install each package with `npm ci`. Windows users whose shell blocks `npm.ps1` can use `npm.cmd`.

## Offline tests and frontend checks

```sh
# From server/
npm test
# From client/
npm test
npm run lint
npm run build
```

Backend tests cover validators/models, ownership query construction, role/session contracts, upload decoding and storage signing, lifecycle/index safeguards, transaction propagation, seeds/archive fixtures, port configuration and live HTTP rate-limit/cache behavior. Offline tests do not read `.env` or connect to development MongoDB. Frontend tests exercise auth/CSRF transport, redirects, lifecycle/availability, dashboard calculations, profiles, drafts, questions, participants and uncertain requests. They are helper tests, not rendered-component tests.

The backend has no lint/build script. Validate its JavaScript syntax with `node --check <file>` for each tracked `.js`/`.cjs` file under `server/` (excluding dependencies). Use `npm audit` in each package for the advisory registry check; this requires network access. The patched minimatch override is shared by ESLint and nodemon; rerun lint and a nodemon configuration smoke check after updating it. Never use `npm audit fix --force` blindly.

## Real MongoDB/API integration

Use a **separate loopback-only MongoDB 8 replica set**, on a dedicated QA port such as 27179. Never supply the development/Atlas URI. This runner rejects remote hosts and URI credentials and ignores `server/.env` entirely.

From the repository root, create a new ignored directory, start MongoDB there, and initialize the new replica set once:

```sh
mkdir .cache/mongo-qa
mongod --dbpath .cache/mongo-qa --replSet rs0 --bind_ip 127.0.0.1 --port 27179
mongosh "mongodb://127.0.0.1:27179"
```

At the interactive MongoDB shell prompt initialize only this new QA instance:

```js
rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27179'}]})
```

Wait for primary election. In PowerShell, from `server/`:

```powershell
$env:EVENTNEXUS_TEST_MONGO_URI='mongodb://127.0.0.1:27179/?replicaSet=rs0&directConnection=true'
npm.cmd run test:registration-lifecycle:integration
```

The harness generates a unique `eventnexus_lifecycle_qa_*` database with an ownership marker. It creates only synthetic accounts/events and retains that database after the run for inspection; it never drops a database or rewrites existing development records. Migration tests change indexes only within that new fixture database. API event-deletion tests operate only on an empty event created by the same test. No seed manifest or supplied record is accessed. Stop the QA server after testing; retain its data directory unless you separately choose to remove it.

Integration coverage includes real session cookies and CSRF, signup/duplicate/role mismatch/logout/expired sessions, profile versions and snapshot immutability, invalid uploads, event creation replay, ownership, stale edits/deletion guards, valid long Unicode recaps, public privacy, MongoDB dashboard counts, legacy and partial uniqueness, simultaneous registration/cancellation, safe re-registration/stale references, capacity races, past/cancelled boundaries, roster totals/filtering/pagination, and rollback when durable outbox insertion fails. An intentional outbox exception is logged during the rollback test; that expected error is followed by assertions proving no partial seat/registration change.

## Real browser checks

Install Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe` on Windows. With the same dedicated QA replica set running and both packages installed, run from `server/`:

```powershell
$env:EVENTNEXUS_TEST_MONGO_URI='mongodb://127.0.0.1:27179/?replicaSet=rs0&directConnection=true'
npm.cmd run test:browser
```

The runner starts the real Express app on an ephemeral loopback port, Vite at `http://localhost:5179`, and Chrome headless using a fresh ignored `.cache/` profile. Port 5179 must be free. It uses actual MongoDB/API responses, with no route mocking. Screenshots are saved under `.cache/final-*.png` and `.cache/lifecycle-*.png`. Processes started by the runner are closed in its finalizer. QA databases and screenshots remain local and ignored. This is currently a Windows Chrome harness, not a portable cross-browser suite.

Coverage includes desktop (1440), tablet (900), mobile (390 and 320), public discovery/archive/empty states/404, mobile keyboard navigation, offline reads, organizer publishing/editing/cancelling, student profile changes, cross-role denial, participant cancellation validation, Escape/focus trapping, uncertain cancellation reconciliation, history and saved answers, all five question controls, student registration/review/cancellation, released seats, expired sessions and actual login/return destinations.

Inspect screenshots as well as assertion logs. Viewport overflow assertions alone do not prove visual quality. Physical touch devices, screen readers, Firefox/Safari and a deployed HTTPS/proxy environment remain outside this local test coverage.

## Development-data checks

`registrations:lifecycle:check` is a separate development-only, read-only preflight with explicit opt-ins; see [lifecycle documentation](registration-lifecycle.md). Do not run apply, seed cleanup or reseeding as a substitute for diagnosis. The final QA run does not connect to the configured development database. Earlier feature documents report historical development-data checks and must not be read as results from the final run.
