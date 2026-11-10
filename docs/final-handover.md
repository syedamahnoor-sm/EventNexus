# Final QA, security review and internship handover

Review date: 2026-11-10 (Asia/Karachi). Scope: existing functionality only. No email system, new product feature, redesign, commit, push or Git identity change.

## 1. Complete feature inventory

| Area | Delivered functionality |
| --- | --- |
| Discovery | Public home, upcoming event list, literal search, six categories, week/month filters, date sort, bounded pagination, detail/availability view |
| Campus Rewind | Past-event discovery, search/filter/pagination, historical details and optional persisted recap/highlight/gallery display |
| Authentication | Student signup, student/organizer role assertion at login, bcrypt credentials, regenerated MongoDB-backed sessions, CSRF rotation, restore/logout, safe role-aware return destinations |
| Student workspace | Upcoming/past/cancelled attempts, next event, genuine empty/error states, cancellation reasons, registration reference and saved answer history |
| Profile | Name/academic/contact editing, completeness from saved fields, optimistic version conflicts, future-registration prefill, read-only login email |
| Profile photos | Preview, initials fallback, optional managed save/replace/remove, bounded binary uploads, safe image decoding/re-encoding and cleanup intent journal |
| Registration | Student details, review/submit/confirmation, five question types, required/optional answers, versioned definitions and immutable question/answer snapshots |
| Lifecycle | Transactional seat reservation, duplicate prevention, student cancellation, reasoned organizer cancellation, retained attempts, safe re-registration and durable cancellation outbox facts |
| Organizer workspace | MongoDB overview/counts, lifecycle views, pagination, create/review/publish, idempotency/recovery, edit/version conflicts, capacity checks, cancel event, guarded deletion |
| Participants | Owner-only roster/search/sort/status filters/pagination, attendee and answer details, cancellation audit and individual cancellation |
| Presentation | Existing premium editorial design, responsive navigation, keyboard focus/menu/dialog behavior, reduced motion, form/loading/empty/error states |

Recap updates are API-only; no recap editor exists. Scheduled start dates determine past/upcoming presentation, not verified attendance. Email delivery, password reset, email verification/change, attendance, payments and public organizer signup are not implemented.

## 2. Issues found and fixed

| Finding | Resolution and evidence |
| --- | --- |
| Backend used bitwise OR for `PORT`, corrupting custom port values | Numeric conversion and range validation; startup tests exercise default, multiple custom values and invalid settings |
| Normal session/token reads exhausted the login rate limit | Safe methods excluded from the authentication limiter; real HTTP test verifies 25 reads, 20 permitted invalid writes, blocked next write, and continued reads |
| Student registration responses lacked explicit cache protection | API-wide `Cache-Control: no-store`; real HTTP assertions cover sensitive student endpoints |
| Public event details disclosed organizer email unused by the UI | Populate organizer name only; also removed unnecessary organizer email from student history; real MongoDB/API privacy assertions |
| Generic 10 KiB parser rejected valid long Unicode recap content | Dedicated bounded 128 KiB recap parser; tested with an 18000-byte, 9000-character recap persisted through the owner API |
| Public list silently ignored unsupported query keys | Reject unknown keys and non-string values; reproduced in first live run, then covered by HTTP regressions and successful integration rerun |
| Unknown frontend routes rendered no page content | Added a 404 state using existing typography/layout and an Explore link |
| Moderate minimatch denial-of-service advisory affected development tools | Patched transitive minimatch override in both packages; installed 11.0.5; moved nodemon to development dependencies; lint/build/nodemon checks and advisory recheck |
| Raw MongoDB startup error could include connection details | Replaced startup error output with a sanitized configuration/availability message |
| Unused dashboard placeholder, stylesheet and template logos remained | Confirmed no application imports and removed the obsolete placeholder, unused Vite stylesheet and two unused SVG assets |
| Organizer diagnostic route remained in the shipped auth API | Removed `/auth/organizer-test` and its unused role import; real ownership/role routes remain tested |
| Missing conventional test entry points and stale client template instructions | Added package `test` scripts and real setup/testing documentation |
| Backend package license disagreed with root MIT license | Aligned backend package/lock metadata with the existing root license |
| Integration finalizer dropped the disposable database | Test fixtures now remain for inspection; no database drop is performed |

The first real integration attempt failed on unsupported public query keys. The application was corrected, regression coverage added, and the full API integration rerun passed. Intentional outbox-failure stack traces are expected rollback-test output, not uncaught test failures.

## 3. Files changed

- Handover: `README.md` (preserved the concurrently expanded README and integrated current references/corrections), `client/README.md`, `client/.env.example`, `docs/api.md`, `docs/testing.md`, this report and the current fixture-retention note in `docs/registration-lifecycle.md`.
- Validation/dependencies: both package manifests and lockfiles; `server/scripts/security.test.js`, `registration-lifecycle.integration.cjs`, `handover-journeys.integration.cjs`, `browser.integration.cjs`, `browser-journeys.cjs`, `browser-registration.cjs`.
- Application fixes: `server/index.js`, `server/src/app.js`, `server/src/config/db.js`, `server/src/controllers/eventController.js`, `registrationController.js`, `server/src/routes/authRoutes.js`, `client/src/App.jsx`.
- Removed: `client/src/auth/AccountPlaceholder.jsx`, `client/src/App.css`, `client/src/assets/react.svg`, `client/src/assets/vite.svg`.

No supplied seed records, seed manifests, development accounts, images or `.env` files were changed. Test binaries, MongoDB files, screenshots and browser profiles live under the existing ignored `.cache/` directory.

## 4. Security findings

Authentication uses server-stored roles and session identity, not client assertions. Login rotates session/CSRF state; public signup rejects role escalation. CSRF precedes mutations, including login, signup, photo uploads and cancellations. Ownership scopes organizer edits, rosters and detail access. Strict validators reject protected fields and bounded literal searches avoid caller-controlled query operators. React renders submitted text as text; return URLs are restricted to known internal destinations. Uploaded files are byte-checked, pixel-bounded, decoded and re-encoded without original metadata; storage keys/signing secrets remain server-side.

The fixes above reduce public email disclosure, stale-response caching, accidental authentication denial and tooling exposure. No confirmed ownership bypass, capacity overbooking or lifecycle partial-write defect was found in the executed cases. This is a source and local functional review, not a penetration-testing certification.

No email transport, worker, SDK, SMTP configuration or partial delivery code was present. There was no uncommitted email implementation to remove. `CancellationOutbox` and transaction/audit infrastructure are intentionally preserved.

## 5. Automated validation results

| Executed check | Result |
| --- | --- |
| Backend `npm.cmd test` | PASS: 57/57, no skipped tests |
| Frontend `npm.cmd test` | PASS: 54/54, no skipped tests |
| Frontend `npm.cmd run lint` | PASS |
| Frontend `npm.cmd run build` | PASS; Vite production artifacts generated |
| Backend `node --check` validation | PASS for all shipped/test JavaScript files checked |
| nodemon `--dump` smoke check | PASS with patched minimatch |
| Real MongoDB 8.0.17 replica-set/API integration | PASS after public-query fix; no mocked database |
| Final `npm.cmd audit --json` in both packages | PASS: zero reported vulnerabilities in each package |
| Git whitespace / ignored-path checks | PASS |

API integration verifies real signup/login/logout/expiry, profile conflicts and snapshot preservation, upload rejection, event ownership/replay/stale edits/deletion guards, Unicode recaps, dashboard counts and privacy. Lifecycle scenarios cover legacy index replacement without document rewrites, partial uniqueness, repeated/concurrent cancellations, re-registration/stale references, seat races, active roster totals/filtering/pagination, unchanged answers and actual transaction rollback on failed outbox insertion.

Tests create fresh `eventnexus_lifecycle_qa_*` databases on a dedicated loopback-only replica set with a new ignored data directory. The configured development/Atlas URI is never loaded or contacted. Index changes and API fixture deletion occur only in these uniquely generated test databases. All QA databases remain retained; no database or collection is dropped.

## 6. Browser testing results

PASS: the complete real headless Chrome suite exited successfully against Express, Vite and MongoDB 8.0.17. No API responses were mocked.

- Public home, discovery, archive and 404 passed viewport overflow assertions at 1440, 900, 390 and 320 pixels. Empty search, mobile menu Enter/Escape, and offline discovery handling passed.
- Real forms passed student signup, student login, account-menu logout and organizer-role login. Organizer create/review/publish/edit/cancel actions were verified against persisted MongoDB state. Student profile changes saved and rendered correctly; cross-role access was denied.
- Participant cancellation passed reason validation, keyboard opening, Tab containment, Escape, offline/uncertain status recovery, exactly-once audit/seat changes, active/history filtering and saved answer/audit views.
- Students could see organizer cancellation history and released capacity, explicitly start a new registration, complete all five question controls, review and submit, then cancel the new attempt. The runner checked actual attendee/answer snapshots, terminal status and released seats in MongoDB.
- Session expiry redirected to login; actual credential submission rotated the session and restored the intended registration destination. Focus refresh preserved unsent form values.

Visually inspected current desktop roster/discovery, tablet organizer workspace, mobile home/archive/profile, cancellation dialog and 320-pixel answer screenshots. Typography, form controls and editorial identity remain consistent. Captures are retained under ignored `.cache/final-*.png` and `.cache/lifecycle-*.png`.

Earlier browser attempts stopped on an archive overflow assertion and two harness assumptions: a fixture-wide dashboard count, and a step that bypassed the explicit re-registration prompt. The runner now waits for archive results and scopes assertions/actions to the actual workflows; the overflow did not recur. No redesign or speculative CSS change was made. The final full rerun passed all cases; earlier partial runs are not counted as full passes.

## 7. Remaining limitations

- Live Cloudinary upload/delete was not exercised without provider credentials. Image decoding, signing, response validation, unconfigured behavior and unsupported uploads were tested.
- Same-site HTTPS hosting, TLS termination/proxy trust, production session behavior, DNS/network access and deployed SPA fallback still require deployment-specific configuration/validation. Express proxy trust is currently off; do not enable blanket trust.
- Student history loads all of that student's attempts; offset pagination and regex search need load profiling for large datasets. No load-test throughput claim is made.
- No physical-device, screen-reader, Safari or Firefox certification; Chromium device metrics provide viewport emulation only.
- The browser harness currently requires the documented Windows Chrome path and free localhost port 5179.
- No email system, password recovery, organizer provisioning UI, recap editor, attendance verification or end-time workflow. These are documented boundaries, not added features.
- Existing development data was preserved and not reconnected during final tests. Historical milestone data audits remain historical; this run does not assert fresh Atlas counter fingerprints.
- Local npm registry vulnerability checks and regex-based secret scans are time-bound and cannot prove absence of every unknown vulnerability or secret.

## 8. Documentation completed

The root README provides project overview/features, stack, architecture, environment variables, installation, MongoDB requirements, role workflows, API overview, tests and limits. New API documentation supplies payloads, permissions, query bounds, CSRF/version/idempotency headers and errors. The testing guide explains replica-set setup, repeatable commands and fixture safety. Client setup no longer uses the generic Vite template. `.env.example` files contain public defaults/empty placeholders only. Earlier milestone notes are retained as historical records, with the lifecycle fixture policy corrected.

## 9. GitHub readiness

Current-tree scan found no real credentials. Three heuristic matches were inspected: two Cloudinary placeholder strings and a fictional `.invalid` MongoDB test URI. High-signal key/token/private-key scanning across all 29 reachable commits found no matches. Git history contains no commits touching the root/server/client real `.env` paths. This is a bounded check, not a guarantee about unreachable objects or credentials in unknown formats.

No `.env`, `node_modules`, build or `.cache` files are tracked. Existing ignore rules correctly exclude real environment files, dependencies, builds and local QA artifacts while allowing `.env.example`. Development seed manifests and event-photo attribution/assets remain preserved. No commit, push or Git author change was performed. Review the working-tree diff before submission; all review changes remain uncommitted as requested.

## 10. Final submission checklist

- [x] Existing feature inventory and role workflows documented.
- [x] Verified backend/privacy/security issues fixed with focused coverage.
- [x] Offline suites, frontend lint/build and backend syntax checks executed.
- [x] Real local MongoDB lifecycle/API integration passed.
- [x] Complete browser suite passed; current desktop/tablet/mobile screenshots inspected.
- [x] No email feature added; cancellation audit/outbox preserved.
- [x] Development records/manifests preserved; no database drop performed.
- [x] API/setup/testing/limitations documentation prepared without real credentials.
- [x] Tracked artifacts, ignore rules, secrets and reachable history reviewed.
- [x] Changes left uncommitted; no push or Git identity changes.
- [ ] Evaluator supplies a private organizer credential or provisions one in their own development database.
- [ ] Maintainer reviews the final diff and chooses the submission commit; production deployment remains a separate task.
