# Registration cancellation and audit history — Milestone 9

## Lifecycle and capacity

New registrations use `active`. A cancellation transitions once to `cancelled_by_student` or `cancelled_by_organizer`. A missing/null legacy status is treated as active without rewriting the document. Old records that were physically deleted cannot be reconstructed; no history is fabricated.

Each retained registration keeps its original attendee and custom-answer snapshots. Re-registration creates a **new registration reference**; cancelled attempts are never reactivated or overwritten. Event `registeredCount`, organizer metrics, duplicate checks and capacity validation count active records only. Past registrations remain records of registration, not verified attendance.

Both cancellation roles are limited to future events whose event status is `upcoming`, matching the established student cutoff. Past, completed and cancelled events are read-only for participant cancellation. An already cancelled registration returns its saved terminal state without changing its reason, actor, timestamp, seat count or durable event.

## API

`POST /api/events/:id/registrations/:registrationId/cancel`

Body: `{ "confirmed": true, "reason": "A meaningful cancellation reason" }`. Reason is trimmed plain text, 5–500 characters. Unknown fields and client actor/organizer identities are rejected. Existing session authentication, organizer role, CSRF and ownership checks apply. The registration must belong to the owned event. Response includes the saved registration and `alreadyCancelled`.

`DELETE /api/events/:id/register`

The existing student route now retains history. Body **requires** `{ "registrationId": "..." }`; the established frontend already sends this captured reference. Older external callers that omitted it must update. This prevents an old request from cancelling a subsequent registration for the same event. No student reason is collected. The server derives the student from the session. Repeated requests for a cancelled owned reference are idempotent and cannot cancel a newer reference.

`GET /api/events/:id/registration` returns the student's active registration when present, otherwise their most recent cancelled attempt. `GET /api/registrations/me` includes their retained history. Student responses expose cancellation status/time/reason but omit actor IDs, initiator metadata and internal transition fields. The dashboard separates cancellation history from active upcoming/past metrics; Event Details and confirmation show the saved reason and offer a new form only when registration is open.

The existing organizer roster accepts `status=active` (default), `cancelled_by_student`, `cancelled_by_organizer`, or `all`, alongside search/sort/page/limit. `total` is filtered; `rosterTotal` includes all attempts; `activeTotal` counts active attempts. Status filters reset pagination. Detail responses include authorized cancellation audit fields and saved answer snapshots. No participant data is added to public event endpoints.

## Transaction and durable events

The shared cancellation service verifies event ownership or student ownership and targets a specific registration reference. Within one MongoDB transaction it:

1. Reads the registration and returns immediately if already terminal.
2. Conditionally releases one seat from an eligible event with a positive counter.
3. Conditionally transitions the still-active registration and stores its cancellation metadata.
4. Inserts a durable `registration.cancelled` fact in `CancellationOutbox`.

Failure in any step rolls everything back. Concurrent event writes cause transaction retry; the retry sees the terminal registration and does not release another seat. A partial unique active index protects concurrent enrollment/re-registration. A stale old cancellation reference never targets a newer attempt.

The registration audit contains initiator, responsible actor, timestamp, reason when provided, previous status and resulting status. The outbox also contains registration/event/student references, schema version and the same transition facts. `{ registration: 1, type: 1 }` is unique, so there is one cancellation fact per registration attempt. Outbox facts are immutable. A future dispatcher must use the outbox event ID for idempotent consumption and add delivery/claim bookkeeping; no delivery, broker, email, notification record or worker exists in this milestone.

## Index migration and deployment

The old full unique `{ student: 1, event: 1 }` index would block re-registration after retention. It is replaced with `unique_active_student_event`, using the same keys and `partialFilterExpression: { status: { $in: ['active', null] } }`. This includes missing legacy statuses. Unique constraints apply only to matching documents; see [MongoDB partial index documentation](https://www.mongodb.com/docs/manual/core/index-partial/).

The migration checks for unknown statuses, duplicate active pairs and inconsistent event counters. It builds and verifies the replacement, creates the outbox unique index, then removes **only** exact legacy full unique indexes. It never calls `syncIndexes`, drops unrelated indexes, backfills statuses, changes snapshots, repairs counters or rewrites manifests. Stop application writes during rollout, deploy the lifecycle-aware code, run check/apply, then resume writes. Do not run an older deletion-based cancellation service after this rollout.

Development CLI (from `server`, using the existing development `.env`):

```powershell
$env:EVENTNEXUS_SEED_ALLOW='development-only'
$env:EVENTNEXUS_SEED_DB='eventnexus'
npm run registrations:lifecycle:check
npm run registrations:lifecycle:apply
```

The CLI requires the existing development safety checks and an exact database confirmation. It rejects production; do not change environment labels to bypass that guard. Production rollout needs a separately authorized operator deployment of the reviewed migration. Readiness guards prevent cancellation/re-registration until the replacement is ready and the old full constraint is absent. First-time registration remains supported under a verified legacy full unique index during deployment.

**Development rollout performed on 2026-11-08:** `eventnexus` replacement verified, exact `student_1_event_1` legacy index removed, zero document rewrites. Fingerprints before/after confirmed existing users, events, registrations, audit data and seed manifests were unchanged. A later temporary Atlas API smoke test also passed and was cleaned up with the same preservation checks.

## Query audit

| Area | Lifecycle handling |
| --- | --- |
| Registration duplicate checks | Active only, including missing/null legacy statuses |
| Student cancellation | Specific owned attempt; conditional active transition, retained history |
| Organizer cancellation | Specific event-owned attempt; conditional active transition |
| Student per-event lookup | Active first; latest cancellation otherwise |
| Student dashboard API | All own attempts; UI excludes cancelled attempts from active metrics |
| Organizer dashboard aggregation | Active registration counts only |
| Event capacity edits | Active records only; never below active seats |
| Participant roster | Selected lifecycle filter; active/all totals computed server-side |
| Participant detail | All statuses, owner/event association enforced |
| Event deletion | Any history blocks deletion to preserve audit references |
| Question editing warnings | Any history, including cancelled answers; owned-event API provides a private `hasRegistrationHistory` flag |
| Seed seat verification | Active records only; original registration ownership checks retained |
| Seed cleanup | All reference checks retained; audit history blocks implicit cleanup |
| Archive seed cleanup | Any registrations still block removal |

Fresh seed cohorts explicitly create active registrations. Existing cohorts remain unchanged. Seed verification accepts old and retained records without rewriting identity/password fingerprints. Cleanup refuses cohorts referenced by cancellation audit history; it does not silently destroy history.

## Verification

- 109 unit tests passed: 55 server and 54 client. Full client lint and production build passed; server has no configured lint command. `git diff --check` passed.
- Real MongoDB 8 replica-set/API tests passed for migration ordering and unchanged documents, legacy uniqueness, validation/roles/ownership/CSRF, repeated/concurrent cancellation, student/organizer races, safe re-registration, stale references, enrollment/seat races, actual outbox-failure rollback, active totals/filters/pages, unchanged answer snapshots, student metadata redaction, and past/cancelled-event rejection.
- Real Atlas `eventnexus` smoke test passed registration, organizer cancellation with reason/audit/outbox, student lookup, re-registration with a new reference, retained student cancellation and consistent counters/history. Exact fixture cleanup preserved all original records and seed manifests.
- Chrome passed organizer reason validation, keyboard activation/Tab/Escape, offline uncertainty/status recovery, one confirmed cancellation, history filtering, audit/answers, student dashboard/confirmation/reason, released seat, safe new-form entry, preserved inputs during focus refresh and expired-session redirect. Desktop/mobile checks ran at 1440/390/320 pixels; dialog, roster, audit, saved-answer and student cancellation screenshots were inspected. No physical devices or screen readers were tested.

Focused commands: `npm run test:registration-lifecycle` in server; `node --test src/lib/registrationLifecycle.test.js` in client. The local integration test requires an explicit loopback replica-set URI:

```powershell
$env:EVENTNEXUS_TEST_MONGO_URI='mongodb://127.0.0.1:27179/?replicaSet=rs0&directConnection=true'
npm run test:registration-lifecycle:integration
```

That test never reads `.env`; it creates a unique `eventnexus_lifecycle_qa_*` database and verifies a private ownership marker. Final handover QA retains that isolated database for inspection instead of deleting it. Atlas/development records are never used for its race tests. The intentionally injected outbox error produces an expected 500 in the test log; rollback assertions verify the active seat remains intact. See the current [testing guide](testing.md).

No application dependencies were added. MongoDB 8 was used in a temporary Docker test container; no production storage architecture changed.

## Files changed

Created:

- client/src/components/OrganizerRegistrationCancellation.css
- client/src/components/OrganizerRegistrationCancellation.jsx
- client/src/components/RegistrationCancellationNotice.jsx
- client/src/lib/registrationLifecycle.js
- client/src/lib/registrationLifecycle.test.js
- docs/registration-lifecycle.md
- server/scripts/migrate-registration-lifecycle.js
- server/scripts/registration-lifecycle.integration.cjs
- server/scripts/registration-lifecycle.test.js
- server/src/models/CancellationOutbox.js
- server/src/utils/cancelRegistrationRecord.js
- server/src/utils/registrationLifecycle.js
- server/src/validators/cancellationValidation.js

Modified:

- client/src/components/CancelRegistration.jsx
- client/src/components/EventRegistration.jsx
- client/src/components/OrganizerConfirmDialog.jsx
- client/src/components/OrganizerEventForm.jsx
- client/src/hooks/useCancelRegistration.js
- client/src/hooks/useMyEventRegistration.js
- client/src/hooks/useParticipants.js
- client/src/lib/cancellation.js
- client/src/lib/participants.js
- client/src/lib/participants.test.js
- client/src/lib/studentDashboard.js
- client/src/lib/studentDashboard.test.js
- client/src/pages/EventRegistrationPage.jsx
- client/src/pages/OrganizerParticipants.jsx
- client/src/pages/StudentDashboard.jsx
- docs/organizer-participants.md
- docs/registration-cancellation.md
- docs/registration-questions.md
- docs/student-dashboard.md
- server/package.json
- server/scripts/organizer.test.js
- server/scripts/participants.test.js
- server/scripts/seed-events/store.js
- server/src/controllers/eventManagementController.js
- server/src/controllers/participantController.js
- server/src/controllers/registrationController.js
- server/src/models/Registration.js
- server/src/routes/registrationRoutes.js
- server/src/utils/organizerDashboard.js
- server/src/utils/participants.js
