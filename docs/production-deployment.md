# Production deployment review: Vercel + Render

Frontend: `https://event-nexus-one.vercel.app` (Vercel). API: `https://eventnexus-api-441o.onrender.com` (Render). This review changes local configuration code only; it does not deploy, change hosting settings or access/modify database records.

## Findings and code changes

| Check | Finding / resolution |
| --- | --- |
| Axios base | The original code already reads `VITE_API_URL` and sets `withCredentials: true`. The supplied `https://eventnexus-api-441o.onrender.com/api` value is correct. |
| `/api` prefix | Client calls use `/auth/me`, `/auth/csrf-token`, `/events`, etc.; Axios joins them to the base ending in `/api`. There is no duplicated prefix in these call sites. New tests verify the actual Axios URI joins. |
| Auth routes | Express mounts auth routes at `/api/auth`. Login, logout, register, me and csrf-token names match frontend calls. Anonymous `/api/auth/me` should return 401 JSON, not 404; 401 means the route exists and the user is a guest. |
| Production fallback | Previously, absent frontend configuration silently used localhost. The URL helper now rejects missing/unsafe production configuration at build time and client initialization. Development retains its localhost default. Missing or doubled `/api` is rejected. |
| CORS | Code already supports one exact origin and credentials via `CLIENT_URL`. Production now requires an explicit HTTPS origin, without path or trailing slash. Set the exact Vercel origin below; preview domains are not automatically allowed. |
| Cookies | The original SameSite=Lax cookie is unsuitable for credentialed fetch between unrelated vercel.app/onrender.com sites. Production now uses HttpOnly, Secure, SameSite=None, Path=/; local development retains Lax/non-Secure. Cookie deletion uses the same settings. No Domain attribute is added: the API owns its host-only cookie. |
| HTTPS proxy | Original Express configuration did not trust the TLS-terminating proxy, preventing Secure session cookies when the app sees internal HTTP. Added bounded numeric `TRUST_PROXY_HOPS`; use 1 for the direct Render edge-to-service setup. Default remains 0 locally. Never set blanket `trust proxy=true`. |
| CSRF | Existing token/header protocol is correct. CORS runs before sessions/CSRF, so OPTIONS preflights can return the required header permissions. The CSRF token and auth requests must use the same browser cookie; production cookie/proxy fixes enable that. CSRF validation stays enabled. |
| SPA routes | Added `client/vercel.json` with Vercel's Vite SPA rewrite to `/index.html`, covering direct navigation/refresh at `/events/past` and protected React Router routes. API calls continue directly to Render. |

Cookie configuration follows [express-session guidance](https://expressjs.com/en/resources/middleware/session/); proxy trust follows [Express's proxy guide](https://expressjs.com/en/guide/behind-proxies/). The rewrite follows [Vercel's Vite SPA instructions](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

## Required Vercel settings

### Read-only live observations

| Request/check | Observed result before deploying these local changes |
| --- | --- |
| Vercel `/` | 200 HTML |
| Currently deployed frontend JavaScript | Contains the supplied Render `/api` URL; does not contain the old `http://localhost:5000/api` string |
| Vercel `/events/past` | **404**, confirming the missing SPA fallback |
| Render `/api/auth/me` without a cookie | **401 JSON**, confirming the correct auth route exists |
| Render `/auth/me` or `/api/api/auth/me` | 404, as expected for incorrect prefixes |
| Render auth response CORS headers | Exact Vercel origin plus credentials=true: currently correct |
| Render OPTIONS `/api/auth/login` | 204; permits exact origin, credentials, and `content-type,x-csrf-token` |

No live response set a session cookie. The review did not call live `/api/auth/csrf-token`, signup, login or any other state-changing route. The previous API 404s cannot be attributed to a current prefix defect: the deployed base and correct auth route are now working. The previous “Retry account check” reflects a failed session check, not the normal logged-out 401 path; frontend code treats 401 as an anonymous user.

The production-cookie issue is confirmed in repository configuration; actual browser acceptance after redeployment still needs the owner checks below.

### Dashboard configuration

| Setting | Value |
| --- | --- |
| Root Directory | `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` (or Vercel's lockfile-based default) |
| Production environment variable | `VITE_API_URL=https://eventnexus-api-441o.onrender.com/api` |

Rebuild/redeploy after changing environment variables: Vite embeds `VITE_*` values at build time; changing a dashboard variable does not update an existing JavaScript bundle. With Root Directory set to `client`, Vercel reads `client/vercel.json`. Do not leave Root Directory at the repository root while using client-relative settings. No root Vercel configuration or API proxy is required for this direct-to-Render arrangement.

Set this value in the **Production** environment scope. A Preview deployment will have a different origin; do not broaden CORS to `*.vercel.app` to make arbitrary previews work. Never put `MONGO_URI`, `SESSION_SECRET` or Cloudinary secrets in `VITE_*` variables.

## Required Render settings

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Runtime | Node; supported Node 22.12+ / compatible Node 24 |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://event-nexus-one.vercel.app` |
| `TRUST_PROXY_HOPS` | `1` for the direct Render proxy path; review if adding another proxy |
| `MONGO_URI` | Preserve the existing private transaction-capable MongoDB configuration |
| `SESSION_SECRET` | Preserve the existing private stable signing secret |
| `PORT` | Use Render's injected value; do not replace it with the frontend port |

Redeploy the backend to apply code and environment changes. Keep the existing MongoDB session store; the in-memory store used in regression tests is not a production setting. No database migration, reseeding, data repair, password reset or session deletion is needed for these fixes. Existing cookies may be replaced when the browser next obtains a valid production cookie.

Render's [web-service instructions](https://render.com/docs/web-services) require listening on the injected port and a public interface. Existing `app.listen(PORT)` already supports that; no port/listener code change was needed in this review.

## Production verification after redeployment

1. Open the Vercel application and inspect Network. `GET https://eventnexus-api-441o.onrender.com/api/auth/me` should return 401 when logged out or 200 when logged in. It must not target Vercel, localhost, `/auth/me` without `/api`, or `/api/api/auth/me`.
2. On the API response/preflight, confirm `Access-Control-Allow-Origin: https://event-nexus-one.vercel.app` and `Access-Control-Allow-Credentials: true`. A login preflight must permit `content-type,x-csrf-token`.
3. During normal interactive login, inspect the `/api/auth/csrf-token` response's cookie in browser DevTools. It must be HttpOnly, Secure, SameSite=None, Path=/ on the Render host, and actually accepted by the browser. The subsequent login request must send that cookie and `X-CSRF-Token`. Login rotates both session identity and CSRF token. Do not paste cookies/tokens into screenshots or reports.
4. Refresh after login, visit a protected dashboard, log out and confirm `/api/auth/me` returns 401 again. Test a direct refresh on `https://event-nexus-one.vercel.app/events/past`; the page must load instead of Vercel's static 404.
5. If the browser blocks third-party cookies, these cross-site cookies may still be refused despite correct CORS and SameSite=None. Browser policy is separate from server configuration. A same-site custom-domain arrangement or reviewed same-origin API proxy would be needed for those browsers; neither was added in this configuration-only review.

Do these interactive checks as the deployment owner: requesting a CSRF token creates a MongoDB session, so the review does not perform that request or login against production under the no-database-writes constraint.

## Local validation

- Backend tests: 59 passed, including a production-mode HTTP test using the real session middleware and a test-only in-memory store. It verifies exact-origin CORS/preflight, Secure/None cookie issuance through a trusted HTTPS proxy, missing/stale CSRF rejection, successful CSRF-protected logout and consistent cookie deletion. With proxy trust disabled, the same forwarded HTTPS header cannot issue a Secure cookie.
- Frontend tests: 56 passed, including actual Axios joins and rejection of invalid production API URLs.
- Frontend lint passed.
- Production build with the supplied Render API URL passed.
- A second build attempt with a deliberately duplicated `/api/api` value was rejected before compilation, confirming the new configuration guard.
- No MongoDB integration scripts, seeding commands or live login/CSRF issuance are run for this review.

These local checks verify the code, not the values currently saved in the private Vercel/Render dashboards or real browser cookie acceptance on the deployed services.
