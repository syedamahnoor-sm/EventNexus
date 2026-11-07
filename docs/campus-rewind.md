# Campus Rewind / Previous Events

## Architecture and lifecycle

`/events/past` is a dedicated React route, explicitly registered before `/events/:id`. It uses `PreviousEvents`, image-led `ArchiveEventCard` entries, the shared cancellable `useEvents` hook, existing photography and design tokens. It has its own asymmetric editorial grid and date rail rather than reusing the upcoming event grid. Navigation keeps the clear “Previous events” label; the page identity is Campus Rewind. Home’s hero, event preview/CTA, categories, journey and motion are retained; no extra homepage section was added.

The existing public endpoint now accepts `GET /api/events?scope=past`. Archive search, category filtering, date order, result counts and pagination all run through MongoDB. Default archive order is newest first, with `_id` ascending as the stable tie-breaker. The page requests six results per page and supports shareable URL filters. Oldest-first is also available. Month/year filtering is intentionally not added.

| Experience | Eligibility |
| --- | --- |
| Home / Explore | `status=upcoming`, scheduled `date > now` |
| Campus Rewind | scheduled `date <= now`, status `upcoming` or `completed` |
| Cancelled | Never included in Campus Rewind or ordinary upcoming discovery |
| Future date marked completed | Not included in either ordinary upcoming discovery or Campus Rewind |
| Explicit legacy `status=completed` API query | Scheduled date must have passed |

Archive requests reject incompatible future `period=week/month` and `status=cancelled` filters. Existing explicit cancelled-status queries remain available through the listing API, but cancelled records are never presented as completed experiences in the archive.

**Date-based limitation:** the model has only a scheduled start instant, with no end date, duration, attendance verification or proof an event occurred. The archive therefore describes records whose scheduled start has passed, excluding cancellations; it cannot prove an event finished or actually took place. The UI says “Past event” and does not invent an end time. Expired `upcoming` records are classified at read time rather than bulk-mutated into “completed”. The exact boundary is past at `date === now`, upcoming only after now. Registration already requires a future date server-side.

## Past event Details and optional recaps

Past Details uses `EventHistoryPanel` in place of `EventRegistration`: no Join/Register action, seat meter or remaining-seat invitation. It retains the real description, organizer, scheduled date/time, venue, event capacity and photograph, with links back to Previous Events and upcoming discovery. Archive filter state is preserved through the event link and breadcrumb. Cancelled Details keeps its explicit cancelled state.

Optional model fields support future organizer content:

- `recap`: trimmed plain text, up to 10,000 characters.
- `highlights`: up to eight non-empty strings of up to 240 characters.
- `gallery`: up to twelve `{ imageUrl, alt, caption? }` objects; valid HTTPS/local event-image URL, required alt text up to 200 characters, optional caption up to 240 characters.

`PATCH /api/events/:id/recap` uses the existing session, CSRF verification, organizer-role middleware, and an atomic owner/date/status filter. Only the event’s organizer may update it, only after its scheduled date, and never for cancelled records. Empty text/arrays can clear content. Unknown fields, unsafe URLs, missing gallery alt text and over-limit arrays are refused. The existing API JSON body-size limit still applies. Past schedule/capacity edits through the ordinary event PATCH are closed; recap updates have their own endpoint.

The archive offers “View recap” only when saved recap/highlights/gallery data exists; otherwise it says “View event”. `EventRecap` renders only actual saved content, with plain-text escaping, accessible gallery metadata and an image-error fallback. The recap deep link waits for API content before scrolling/focusing. No organizer editor, upload service, generated recap, testimonials, attendance statistics or fabricated gallery is included.

## Separate historical development seed

Run from `server`, with the existing `.env` already declaring `NODE_ENV=development` and pointing to the intended development database:

```powershell
$env:EVENTNEXUS_SEED_ALLOW = 'development-only'
$env:EVENTNEXUS_SEED_DB = 'eventnexus'
npm run seed:archive
npm run seed:archive:verify
# Separate cleanup, when desired:
npm run seed:archive:cleanup
```

The same explicit environment/database confirmation, production guards, transaction requirement and sanitized logging used by the existing seed apply. `historical.js` creates a dedicated `archive-organizer@eventnexus-seed.invalid` account using bcrypt cost 12 and a random discarded password. The existing optional private `EVENTNEXUS_SEED_PASSWORD` can be supplied before first creation; repeat runs never reset credentials.

The separate manifest is `eventnexus-campus-rewind-v1` in `development_seed_manifests`. It owns thirteen historical fixtures: **twelve archive-eligible records, two per supported category, plus one cancelled observing-session fixture excluded from the archive**. Two eligible records deliberately retain stale `upcoming` status to exercise date-based classification. All dates are genuinely in the past relative to creation. Repeats preserve IDs and content without duplication.

These are explicitly marked **fictional historical development records**, not verified campus history. They have zero registrations, no recap/highlights/gallery, and no attendee/outcome claims. Their licensed local photographs reuse the relevant assets and source credits documented in [event-photography.md](event-photography.md); they are illustrative, not documentation of the fictional events.

Historical cleanup validates the archive organizer fingerprint and each event’s exact manifest ID, organizer and marker. It deletes only those owned events, that owned user, and that manifest. Outside registrations or untracked events owned by the archive organizer cause an all-or-nothing refusal. Missing manifests are no-ops. Original and historical cohorts use separate organizers, so either cleanup does not absorb or delete the other cohort. Stop other writers during deliberate cleanup, as with the original seed tooling.

## Validation performed

- **23 automated tests passed:** four server archive/lifecycle/recap tests, eleven existing seed/schema/photo tests, eight frontend availability/recap tests. Coverage includes exact date-boundary operators, stale status handling, cancelled/future-completed exclusion, optional content, unsafe gallery URLs, limits and historical fixture consistency.
- Production frontend build and scoped lint passed. Full frontend lint retains the four existing unused React imports in untouched authentication/dashboard placeholders.
- Live database seed creation and repeatability passed. Fingerprints of all pre-existing users, events and registrations matched after creating the separate historical cohort: the 30 original events and 765 registrations were preserved. The final database contains twelve eligible archive records and the separate cancelled fixture; repeated archive seeding added nothing.
- Live archive API checks passed for six categories, newest ordering, six-per-page pagination, upcoming separation and cancellation exclusion.
- Temporary authenticated API actors tested real session/CSRF behavior: owner recap update succeeded; another organizer and a student received 403; future/cancelled recap edits received 409; unsafe gallery input received 400; past schedule edits received 409. Actual past/cancelled/completed registration attempts received 409, while ordinary future registration and cancellation succeeded. All temporary actors/events/registrations were removed, with pre-existing record fingerprints unchanged.
- **Browser verification, separately:** installed headless Chrome at desktop 1440px, tablet 900px and mobile 390px. Checked MongoDB/API-to-card IDs, loaded images, active navigation, route ranking, date-rail layout, category/page-reset behavior, pagination, no horizontal overflow, mobile menu, genuine empty search, network error/retry, and reduced-motion suppression. Past Details had no register actions, seat invitation or fabricated recap.
- A separate temporary saved recap verified “View recap”, actual text/highlight/gallery rendering, image loading and anchor focus after API load. The temporary record was removed and original event fingerprints matched afterward.
- Screenshots were captured and inspected: `.cache/campus-rewind-desktop.png`, `.cache/campus-rewind-mobile.png`, `.cache/past-event-details-desktop.png`. No physical-device or other-browser testing was performed.

## Main files

New frontend: `PreviousEvents.jsx/.css`, `ArchiveEventCard`, `EventHistoryPanel`, `EventRecap`, `Navbar.css`. Updated routing, navigation/footer links, shared hook/image sizing, availability helpers/tests and Details. Backend: `eventLifecycle.js`, listing/update/recap controller logic, recap route/model/validators. Seed/tooling: `historical.js`, `archive.test.js`, command dispatch and npm aliases. No new dependencies.
