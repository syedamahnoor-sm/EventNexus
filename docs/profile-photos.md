# Student profile photos

The existing student identity card and navigation share `UserAvatar`. Students can preview a centre-cropped selection, cancel, save, replace, or explicitly confirm removal. Missing/broken photos fall back to initials. The account menu contains My campus, My profile, and the existing logout action; it supports keyboard navigation, Escape, outside-click dismissal, and mobile navigation.

## Configure persistent storage

No managed image provider was configured in the inspected environment. Uploading to a real provider has **not** been verified. The application deliberately disables saving/removal without configuration; previews remain available. There is no production filesystem or database image-data fallback.

Set these variables in the **server's** environment (see `server/.env.example`), then restart the server:

```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Use a Cloudinary account permitted to perform signed image uploads and destroy operations. No unsigned upload preset is used. Never use a `VITE_` prefix for these credentials. The `photoUpload.configured` flag indicates configuration presence, not verified credentials or provider health. A failed provider request never produces a frontend success message.

The server signs upload/destroy parameters with SHA-256 and calls Cloudinary directly using Node fetch; no storage SDK is required. See [Cloudinary authentication signatures](https://cloudinary.com/documentation/authentication_signatures) and the [image upload API](https://cloudinary.com/documentation/image_upload_api_reference). Node must support fetch/FormData/Blob/AbortSignal.timeout, and deployment installs must include Sharp's appropriate native platform packages.

Images use public, unguessable Cloudinary delivery URLs. Students should upload pictures suitable for public avatar display. Removal unlinks the photo immediately and requests CDN invalidation; provider caches and backups can outlive the database reference. Do not promise immediate global erasure. Configure appropriate provider retention policies for your deployment.

## API and safeguards

- `GET /api/students/profile` adds `photoUpload: { configured, maxBytes, types }`.
- `POST /api/students/profile/photo`: raw JPEG/PNG/WebP bytes, matching `Content-Type`, `X-Profile-Version`, and the existing `X-CSRF-Token` header. Not multipart, a remote URL, or base64 JSON.
- `DELETE /api/students/profile/photo`: existing CSRF header and `X-Profile-Version`.
- Both mutations return the safe current `user` after confirmation. Only the student's own session-derived account can change. No body/query user ID, storage key, or URL is accepted.

Existing session authentication, student authorization, CSRF validation, and mutation rate limiting protect these routes. The raw body is limited to 5 MiB. Server-side byte signatures and Sharp decoding validate actual content. Animated, mismatched, invalid, excessively large images are rejected (20 megapixel decode limit, 8192 pixels per side). A maximum of two decodes per server process and a processing timeout bound resource use. Images are orientation-corrected, centre-cropped, resized to 512 square, and re-encoded as WebP without EXIF/GPS metadata. Sharp is the only added dependency.

User `profilePhoto` optionally holds the managed key and delivery URL. Only `photoUrl` is exposed in the public student serializer; keys/credentials never reach the client. Existing accounts need no migration. Each object uses a server-generated UUID below the authenticated user namespace. Profile-version compare-and-swap and MongoDB transactions prevent concurrent updates from silently overwriting one another. Text edits can retain their unsaved draft when only the photo changes. Registration snapshots are untouched.

Successful responses update both profile and auth context; normal session restoration supplies `photoUrl` after refresh/login. Files remain in memory only while being processed; preview Blob URLs are revoked when discarded. Nothing is stored in localStorage. Uncertain requests require reloading saved photo state before another mutation.

## Retired-object cleanup

Run this from `server`, with the same database and Cloudinary environment, on a regular scheduler (for example hourly):

```sh
npm run avatars:cleanup
```

`AvatarCleanup` is a durable deletion journal. Upload intent is recorded before contacting the provider. Successful mapping removes that intent transactionally and journals any replaced object. Retired objects are deleted in the background; failures remain retryable. Interrupted/uncertain uploads become eligible after one hour so a late provider completion does not race immediate deletion. The worker handles up to 100 due records per run; increase scheduling frequency for larger queues. It never deletes an object still referenced by a user. Provider failures leave jobs intact, and database/storage error details are suppressed from command output.

This requires the same MongoDB transaction support already used by registrations/profile editing. Failed database/provider operations may leave orphan objects until the worker retries; schedule and monitor it before enabling uploads in production.

## Validation

Backend image/storage/model tests:

```sh
cd server
npm run test:avatars
node --test scripts/profile.test.js scripts/registration.test.js scripts/seed-events/seed.test.js scripts/seed-events/archive.test.js
```

Frontend validation and build:

```sh
cd client
node --test src/auth/auth.test.js src/lib/cancellation.test.js src/lib/eventAvailability.test.js src/lib/registration.test.js src/lib/studentDashboard.test.js src/lib/studentProfile.test.js src/lib/profilePhoto.test.js
npm run lint
npm run build
```

Final results: all 59 automated tests passed (27 backend, 32 frontend), full frontend lint passed, and the production build passed. The server has no configured lint command. The server dependency audit reported two existing moderate nodemon/minimatch advisories; this change does not force unrelated dependency upgrades.

Live development API/browser checks used temporary students/organizer/events and real sessions, CSRF, MongoDB mapping, and registration snapshots. The actual unconfigured application rejected uploads safely. An isolated injected in-memory adapter and intercepted test image delivery verified upload/replacement/removal, refresh persistence of the database reference, navbar synchronization, concurrent profile-version conflicts, cleanup retry, keyboard controls, and mobile layout. This contract test is **not** verification of managed object persistence or Cloudinary delivery. Temporary fixtures were removed and existing user/event/registration fingerprints compared unchanged. A configured-provider deployment still needs an end-to-end smoke test of signed upload, CDN image delivery, replacement, removal, and scheduled cleanup.

## Files in this enhancement

Created:

- `client/src/components/{UserAvatar,ProfilePhotoManager,AvatarNavigation}.{jsx,css}`
- `client/src/lib/profilePhoto.js` and `profilePhoto.test.js`
- `server/src/services/{avatarImages,avatarStorage,avatarCleanup}.js`
- `server/src/controllers/profilePhotoController.js`
- `server/src/models/AvatarCleanup.js`
- `server/scripts/{avatar.test,cleanup-avatars}.js`
- `server/.env.example` and this document

Updated:

- `client/src/components/{Navbar,StudentProfileEditor}.jsx`
- `client/src/pages/StudentProfile.jsx`
- `client/src/hooks/useStudentProfile.js`
- `client/src/auth/authClient.js`
- `server/src/models/User.js`
- `server/src/utils/publicUser.js`
- `server/src/middleware/requireAuth.js`
- `server/src/controllers/profileController.js`
- `server/src/routes/studentRoutes.js`
- `server/package.json` and `server/package-lock.json`

Earlier student-profile milestone changes were already uncommitted and remain intact. No registration snapshot, event, or seed schema was changed for photos.
