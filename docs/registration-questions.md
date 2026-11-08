# Event-specific registration questions

> Historical milestone notes: Milestone 9 supersedes deletion-based cancellation, active-only history assumptions and the old unique-index behavior. See [Registration lifecycle](registration-lifecycle.md) for current retention, status filters, audit/outbox and migration contracts.

Organizers configure questions in the existing event editor. The dashboard welcome area exposes Create event and Manage events; each owned event retains visible editing, details and lifecycle controls.

## Persistence and API

Existing event create/update endpoints accept `registrationQuestions`. Each definition contains a stable UUID `id`, plain-text `text`, `type`, `required`, zero-based `order`, and `options` containing stable UUIDs and labels. Supported types are `short_text`, `long_text`, `single_choice`, `multiple_choice`, and `dropdown`.

Limits: 10 questions, 240 characters per question, 2–8 unique options for choice questions, 100 characters per option, 200 characters per short answer and 1000 per long answer. Text questions have no options. HTML delimiters are rejected; React renders text normally. Definitions and responses are not HTML. Sensitive information must not be requested; guidance is provided, but there is no automated sensitive-information classifier.

Event question revisions increment only when definitions change. Editing questions on an event with registrations requires `X-Confirm-Question-Changes: true`, in addition to the existing optimistic event version. The editor warns and requires explicit acknowledgment. This does not rewrite existing registrations.

The existing registration endpoint accepts `answers: [{ questionId, value }]` plus `questionVersion`. Values are strings, or arrays of option IDs for multiple choice. The server validates against authoritative event definitions inside the existing capacity transaction. Unknown or duplicate question IDs, invalid types/options, missing required answers and excessive lengths are rejected. Stale versions return 409 `QUESTIONS_CHANGED` without consuming a seat.

Registrations save immutable answer snapshots: original question text/type/order/required state and submitted text or selected option IDs and labels. Optional unanswered questions are omitted. Confirmation uses those snapshots, never current question labels. Legacy events and registrations need no migration. Existing cancellation behavior is unchanged.

Public lists omit question definitions; event details expose definitions, never student answers. Existing owner-authorized registration access remains authoritative. Identity and ownership are derived from existing sessions, and CSRF protection remains enabled. JSON limits remain 10 KB generally, with bounded 64 KB bodies only for event creation/editing and registration submission.

## Frontend

The event editor supports adding, removing, editing and keyboard reordering, required flags and choice editing. Student questions follow standard profile information and appear in the existing review step. Changed definitions require explicit adoption and a fresh review; compatible answers and standard student information are retained. Confirmation renders saved answers. No new dependencies or parallel registration system were added.

Core new files: server `validators/registrationQuestions.js`, `models/registrationQuestionSchemas.js`, and `scripts/registration-questions.test.js`; client `lib/registrationQuestions.js` and its tests, `RegistrationQuestionBuilder`, `QuestionDefinitionSummary`, `RegistrationQuestionFields`, `RegistrationAnswerSummary`, and `RegistrationQuestions.css`.

Integration files: Event/Registration models, event/registration validators and controllers, Express body parsing, server package scripts, organizer event form/editor/dashboard/entries, student registration form/confirmation, owned-event refresh hook, and event-management utilities.

## Changed file inventory

New:

- `client/src/components/QuestionDefinitionSummary.jsx`
- `client/src/components/RegistrationAnswerSummary.jsx`
- `client/src/components/RegistrationQuestionBuilder.jsx`
- `client/src/components/RegistrationQuestionFields.jsx`
- `client/src/components/RegistrationQuestions.css`
- `client/src/lib/registrationQuestions.js`
- `client/src/lib/registrationQuestions.test.js`
- `server/src/validators/registrationQuestions.js`
- `server/src/models/registrationQuestionSchemas.js`
- `server/scripts/registration-questions.test.js`
- `docs/registration-questions.md`

Modified:

- `client/src/components/OrganizerEventEntry.jsx`
- `client/src/components/OrganizerEventForm.jsx`
- `client/src/components/StudentRegistrationForm.jsx`
- `client/src/hooks/useOwnedEvent.js`
- `client/src/lib/eventManagement.js`
- `client/src/pages/EventRegistrationPage.jsx`
- `client/src/pages/OrganizerDashboard.jsx`
- `client/src/pages/OrganizerEventEditor.jsx`
- `server/package.json`
- `server/src/app.js`
- `server/src/controllers/eventController.js`
- `server/src/controllers/eventManagementController.js`
- `server/src/controllers/registrationController.js`
- `server/src/models/Event.js`
- `server/src/models/Registration.js`
- `server/src/validators/eventValidator.js`
- `server/src/validators/registrationValidation.js`

## Validation performed

- 45 backend and 48 frontend automated tests passed, including 12 new question tests. Run the focused backend suite with `npm run test:questions` in `server`; frontend question tests use `node --test src/lib/registrationQuestions.test.js` in `client`.
- Full client ESLint and production Vite build passed. The server has no configured lint command. `git diff --check` passed.
- Real development Express/MongoDB checks passed for all types, definition creation/reordering/removal, required/optional/type/option validation, unknown and duplicate IDs, stale revisions, ownership/roles/CSRF/session expiry, private immutable snapshots, legacy registrations, capacity/duplicate/edit races and bounded Unicode request bodies.
- Headless Chrome exercised actual organizer creation/editing and acknowledgment, student validation/review/submission, confirmation after refresh and question edits, adoption of revised questions while retaining student fields, and dashboard Create/Manage actions. Layout checks ran at 320, 390 and 1440 pixels. Desktop builder, mobile builder, student form, confirmation and dashboard screenshots were inspected.
- Temporary test users, events, registrations and their sessions were cleaned up. Original User/Event/Registration/AvatarCleanup records and development seed manifests matched their pre-test fingerprints. A transient MongoDB outage required an exact-ID cleanup retry, which succeeded; the final complete run and cleanup both passed.

Physical touch devices, screen readers and every browser engine were not tested. Privacy guidance does not replace organizer review of the information requested. No participant management or attendance features are introduced.
