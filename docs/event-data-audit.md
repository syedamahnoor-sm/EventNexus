# Event data audit and Home noticeboard CTA

## Findings

No runtime event fixtures, hardcoded event records, manually chosen event IDs, or title/category-to-photograph tables were found in the frontend. React renders actual API responses. The development catalog and photography manifest live in the backend seed tooling and write real MongoDB records; neither is imported by the frontend.

| Feature | Actual data path | Audit result |
| --- | --- | --- |
| Home noticeboard | `Home` → `useEvents` → `GET /api/events?status=upcoming&sort=soonest&page=1&limit=3` → `Event.find` | Three records selected by MongoDB, not fetched wholesale or manually curated. |
| Upcoming eligibility | `getAllEvents` builds `{ status: 'upcoming', date: { $gt: now } }` | Cancelled/completed/past records are excluded. |
| Explore listing | `Events` reads URL parameters and passes them to the same hook and endpoint | No client-side filtering or slicing of event pages. |
| Category discovery/filtering | Static supported labels generate `category` query parameters; backend validates the enum and filters MongoDB | Category labels/taglines are interface configuration, not event records. |
| Search | `search` query → escaped MongoDB regex across title, description and location | A 300ms input debounce; no local fake results or subset search. |
| Date periods | `period=week/month` → server date bounds | Next seven days / next calendar month; evaluated by the server. |
| Sorting | `sort=soonest/latest` → MongoDB date sort, then `_id` ascending | Deterministic tie ordering; no frontend sort. |
| Pagination and result count | `page/limit` → database skip/limit; matching `countDocuments` → `pagination` | UI reads `total`, `totalPages`, `page`, `hasNextPage` from the API. Filter/search/sort changes reset the page. |
| Event Details | Route ID → `useEventDetails` → `GET /api/events/:id` → `Event.findById` plus populated organizer | Actual requested record, with invalid/missing/network states. |
| Titles, descriptions, category, date/time and location | API event fields → shared cards / Details; dates formatted locally | No static event-content substitutes. Honest missing-field labels remain. |
| Organizer | Backend populates the event’s User reference | UI shows the returned name or explicitly states it is unavailable. |
| Photography and alt text | MongoDB `imageUrl/imageAlt` → API → `EventArtwork` | Same record image on cards and Details. `srcset` derives size variants from that URL; it does not choose photos by event/category/index. |
| Seats and availability | API capacity, registeredCount, status and date → `eventSeats` / `eventAvailability` | Calculated from actual returned fields. Backend registration transaction is authoritative. |
| Session/registration eligibility | `/auth/me`, `/registrations/me`, CSRF token and registration POST | No invented user session or registration success. Unchanged by this pass. |

## Changes

- Added “Explore more events” under the Home noticeboard cards, within the existing section. It links to `/events`, with a fine editorial divider, outlined arrow, keyboard focus, hover and pressed feedback. Bottom padding is reduced to 40px desktop / 32px mobile. Existing photo, reveal, marquee and category treatments remain.
- Made Home’s upcoming/soonest/page-one/three-record request explicit. The shared hook now sends the already-supported `status=upcoming` parameter. No backend API change was necessary.
- Removed the assumption that an absent `registeredCount` means zero registrations. A shared `eventSeats` calculation now returns unconfirmed availability for missing/invalid counters. Cards and Details no longer manufacture open seats; Details also suppresses its meter when counts are unknown. A regression test covers missing, null, negative, fractional, string and NaN counters while preserving valid zero.
- No hardcoded event objects or photo mappings needed removal. Static category labels, general UI copy, loading skeletons and decorative missing-image artwork were retained intentionally. None replaces a failed API call with invented event content.

## Loading and refresh behavior

Home and Explore share real loading, error/retry, empty and successful states. Requests use timeouts and AbortController cancellation. Details preserves invalid-ID, missing-event and network-error states, with a stale-data warning when a revalidation fails. Existing data is refetched on navigation/reload, filter changes and explicit retry; this application does not currently subscribe to MongoDB changes or poll continuously. Out-of-band edits are therefore visible on the next fetch rather than silently arriving on an already-idle screen.

## Files changed in this pass

- `client/src/pages/Home.jsx`
- `client/src/pages/HomeContinuity.css`
- `client/src/hooks/useEvents.js`
- `client/src/lib/eventAvailability.js`
- `client/src/lib/eventAvailability.test.js`
- `client/src/components/EventCard.jsx`
- `client/src/components/EventRegistration.jsx`
- `docs/event-data-audit.md`

No dependencies, routes, backend queries, authentication middleware or seed records were changed by this implementation.

## Validation performed

- Frontend production build and scoped ESLint passed. Six availability tests and eleven server seed/schema/photo tests passed (17 total), including the new unknown-counter regression. Full frontend lint still reports the four pre-existing unused React imports in Login/Register and the two dashboard placeholders.
- A live development-only audit used the configured MongoDB, actual Express GET endpoints, and installed headless Chrome at 1440px desktop / 390px mobile widths. It compared Home's displayed IDs/content/images/seats to both the API response and an independent MongoDB query ordered by future date and `_id`. Network capture confirmed `status=upcoming`, `sort=soonest`, `page=1`, `limit=3` on the Home request.
- Actual Explore responses and browser results matched for category, search, both date periods, latest sorting and page two. The visible totals and pagination matched backend metadata. A real unmatched search displayed zero cards and an honest empty state.
- One uniquely marked temporary Event was created through the real Mongoose model, referencing the existing development organizer. It appeared first on Home without any frontend code/data change. Editing its title, description, category, location, date and image propagated through the API and into Home/Details on re-fetch.
- One temporary Registration referencing a valid development student was inserted in the same transaction as its event counter increment. Home changed from three to two places; reducing that temporary event's capacity to its one actual registration produced “Fully booked” in cards and Details. No synthetic counters or existing seed registrations were modified.
- Cancelling that temporary event removed it from upcoming listings while Details reported cancellation. Removing only that event and its temporary registration produced API 404 and the Details not-found state. Full pre/post fingerprints of **all** pre-existing User, Event and Registration documents matched; the seed cohort remained unchanged.
- Chrome offline mode caused a genuine request failure. Explore showed an error with no substitute cards; restoring the network and retrying loaded real API results again.
- The CTA received visible keyboard focus and opened `/events` with Enter. Mobile-width navigation and overflow checks passed. Desktop/mobile screenshots were captured and inspected at `.cache/homepage-explore-cta-desktop.png` and `.cache/homepage-explore-cta-mobile.png`.

The lifecycle mutations were isolated development **model writes** followed by real API/browser reads; this pass did not exercise authenticated HTTP create/update/delete endpoints or weaken their session/CSRF/role protection. Browser verification used Chrome viewport emulation, not physical devices or other browsers. Existing screens observe out-of-band database edits on their next fetch; no real-time subscription was added.
