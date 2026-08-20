# HANDOVER — RAMS Generator

**Version:** see `package.json` — auto-synced to `0.0.{git commit count}` by `scripts/sync-version.js`
**Status:** Active development — `develop` branch. PR #1 open against `dj-iv/rams:main` (upstream `main` is live in production via Vercel, under the "UCtel projects" team). Local dev environment working end-to-end against a dedicated sandbox Firebase project (see §Local Testing). The two deploy-breaking issues found via Vercel dry-run (`prepare` script, `engines.node`) are fixed and verified as of v0.0.50.
**Last updated:** 2026-08-20

---

## What It Is

The RAMS Generator is a 7-step web form that produces professional Risk Assessment and Method Statement documents for construction and telecommunications fieldwork (primarily CEL-FI installations). Users select a job template, configure tasks, assess risks, specify PPE/tools/materials, and sign off. Documents are saved to Firestore and can be shared via a public link.

It sits behind the UCtel Portal authentication system and is deployed as a Vercel serverless application.

---

## Architecture

```
UCtel Portal (auth.uctel.co.uk)
  └─ portalToken (HMAC-SHA256 signed JWT)
       └─ /portal/callback  →  session cookie (HttpOnly, 5h)
            └─ POST /api/session  →  Firebase custom token
                 └─ signInWithCustomToken()  →  Firebase Auth
                      └─ Firestore (ramsDocuments, standardTasks, jobTemplates, ...)
```

**Frontend:** React 19 SPA, Tailwind CSS (CDN), React Router 7, @hello-pangea/dnd for drag-drop tasks
**API layer:** Express (dev) / Vercel serverless functions (prod) — `api/*.js`
**PDF:** PDFlayer API (prod) · Puppeteer fallback (dev)
**Public share:** `/share/:shareCode` — no auth, served via `GET /api/rams/share/:code`

---

## Key File Paths

| What | Path |
|------|------|
| Repo root | `c:/_VSC/UCtel_Portal/rams` |
| Main component (all state) | `src/App.js` |
| Document renderer | `src/components/PrintableDocument.js` |
| Form steps | `src/components/steps/Step1–7.js` |
| API endpoints | `api/session.js`, `api/portal-callback.js`, `api/logout.js`, `api/get-rams-share.js`, `api/generate-pdf.js` |
| API utilities | `api/utils/firebaseAdmin.js`, `api/utils/portalAuth.js` |
| Firebase client init | `src/firebase.js` |
| Version script | `scripts/sync-version.js` (writes `package.json` + generated `src/version.js`) |
| Git hooks (tracked) | `scripts/hooks/` — activated via `npm install` |
| Dev server | `server.js` (Express, port 3101) |
| Firestore index | `firestore.indexes.json` |
| Firestore rules | `firestore.rules` |
| Vercel config | `vercel.json` |

---

## Config and Secrets

Secrets are **never** in the repo. Locations:

| Secret | Location |
|--------|----------|
| `PORTAL_SIGNING_SECRET` | `.env.local` (dev) · Vercel env (prod) |
| Firebase service account | `.env.local` vars OR `firebase-service-account.json` (gitignored) |
| `PDFLAYER_KEY` | `.env.local` (dev) · Vercel env (prod) |
| Firebase client config | Hardcoded in `src/firebase.js` (public — safe for client SDK) |

Required env vars — full list in `HANDOVER_RAMS.md §Config`:

```
PORTAL_URL, PORTAL_SIGNING_SECRET
RAMS_FIREBASE_PROJECT_ID, RAMS_FIREBASE_CLIENT_EMAIL, RAMS_FIREBASE_PRIVATE_KEY
PDFLAYER_KEY
RAMS_DEV_PORTAL_BYPASS=true  (dev only)
```

---

## Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `ramsDocuments` | Saved RAMS — ownerUid, shareCode, formData, timestamps |
| `standardTasks` | Available task definitions with options |
| `jobTemplates` | Template → task list mappings |
| `riskAssessments` | Risk category and hazard templates |
| `ppe` / `tools` / `materials` / `permits` | Selectable item lists |
| `teamMembers` | Reusable team member profiles |

**Key index:** `ramsDocuments` composite on `(ownerUid ASC, updatedAt DESC)` — deploy via `firebase deploy --only firestore:indexes`.

---

## Local Testing — Sandbox Firebase Project

To test locally without the developer's real UCtel Portal / Firebase secrets, a dedicated **sandbox Firebase project** stands in for the real `rams-generator-bdcb7` project:

| Item | Value |
|------|-------|
| Firebase project | `uctel-projects-sandbox` (separate project, same Google account as another unrelated project — no shared data with `rams-generator-bdcb7` or the `monday-77390` project used by CELFI/OpenClaw) |
| Service account key | `C:/_VSC/UCtel_Portal/uctel-projects-sandbox-firebase-adminsdk-fbsvc-6185aad7bd.json` (outside the repo; the gitignore pattern `*-firebase-adminsdk-*.json` also covers it if ever moved in) |
| `rams/.env.local` | `RAMS_DEV_PORTAL_BYPASS=true` + `RAMS_FIREBASE_SERVICE_ACCOUNT=<path above>` — skips the real UCtel Portal OAuth entirely via `api/session.js`'s dev-bypass path |
| `src/firebase.js` | **Locally modified** to point at `uctel-projects-sandbox`'s web config instead of `rams-generator-bdcb7`. This file is tracked in git — **do not commit this change**; it must stay pointed at the real project for any push/PR. |
| Firestore | Enabled, empty (fresh project) |
| Firebase Authentication | Had to be explicitly enabled via Console → Authentication → "Get started" — `RAMS_DEV_PORTAL_BYPASS` alone isn't enough. Without it, the Admin SDK's `createCustomToken`/`getUser` calls fail with `auth/configuration-not-found`, even with no sign-in method configured. |

**Verified working (2026-08-20), via a scripted client-SDK test (kept in the session's scratchpad, not committed to the repo):**
- `GET /api/session` with dev bypass → returns a valid Firebase custom token (`uid: rams-dev-user`)
- Firebase Auth sign-in with that token (`signInWithCustomToken`)
- Firestore write to `ramsDocuments` + read-back — data matched
- Public share route (`GET /api/rams/share/:code`) → 200, correct document data returned
- Cleanup delete — no leftover test data in the sandbox project

**Not yet tested:** PDF generation (`api/generate-pdf.js` needs a real `PDFLAYER_KEY`, not set), full UI click-through in an actual browser.

**To run:** `npm run dev` from `rams/` (starts API on 3101 + React on 3304). If ports are already bound from a previous run, check with `netstat -ano | grep -E ":3101|:3304"` before starting a second instance — `npm run dev` fails outright (`EADDRINUSE`) rather than reusing the existing one.

---

## Current State (2026-08-20)

- Repo forked to `github.com/Svuffer/rams`; PR #1 open against `dj-iv/rams:main`, state `MERGEABLE`, **no drift on `upstream/main`** (confirmed via `git fetch upstream` — zero commits landed there while `develop` was ahead)
- `develop` branch active — version auto-syncs to `0.0.{commit count}` via `scripts/sync-version.js`
- Git hooks live in tracked `scripts/hooks/` — activated by `npm install` (`prepare` script sets `core.hooksPath`); fresh clones must run `npm install` before committing
- `.env.local` now configured against the sandbox Firebase project — see §Local Testing above. Local dev server confirmed working end-to-end for auth/session.
- No Vercel project linked locally (`.vercel/`) — but a Vercel project **is** already connected to `dj-iv/rams` via GitHub integration under the "UCtel projects" team (proven by the "Vercel" PR check existing at all; this supersedes the old "no Vercel project linked yet" note, which was only ever true for local CLI linking)
- **`dj-iv/rams` was briefly inaccessible (private, no access) between roughly 2026-08-17 and 2026-08-20.** Access restored — turned out to be a permissions gap, not a deletion. Nothing was lost; `upstream/main` was unchanged throughout.
- **PR #1's Vercel check is `FAILURE`** — not a code problem. Vercel requires manual one-time authorization for preview deploys from a fork/external contributor (link scoped to the "UCtel projects" Vercel team). Neither Svuffer nor this session currently has access to that team to click Authorize.
- **Real bug found via a Vercel CLI dry-run deploy** (`vercel --prod` under a personal Vercel team, uploading `develop`'s files directly, bypassing the team-access blocker above): the `prepare` npm script (`git config core.hooksPath scripts/hooks`) has no error handling. Vercel's CLI file-upload build environment has no `.git` directory, so `npm install` aborts with exit 128 (`fatal: not in a git directory`) and the whole build fails. **Not yet fixed** — see Outstanding. Whether this reproduces on a real GitHub-integration deploy (which typically clones with `.git` present) is unconfirmed either way, but the fix is cheap enough to apply regardless of the answer.
- Same dry-run surfaced a Vercel warning: `Found invalid Node.js Version: "24.x". Please set "engines": { "node": "22.x" }` — `package.json` has no `engines.node` pin, so local and Vercel Node versions can silently diverge.
- **Developer's proposed workflow: test locally, then push straight to `main`, skipping the PR-preview-approval bottleneck.** Diffed the whole PR against `upstream/main` to assess risk: 10 of 12 changed source/API files are comment-only (`[SEC NNN]` markers), zero logic changes. The two real behavior changes are additive (a version footer in `App.js`, the `sync-version.js` build scripts). Assessed as low-risk *if* the `prepare`/`engines.node` issues above are fixed first. A build-time failure is self-limiting on Vercel (production keeps serving the last good deploy if a new build errors), but a runtime-level bad deploy would need either Vercel Instant Rollback (needs "UCtel projects" team access — currently unavailable) or `git revert` on `main` + a fresh successful build.

---

## Recent Fixes

| Date | Change | Detail |
|------|--------|--------|
| 2026-08-20 | Fix `prepare` script hard-fail + pin `engines.node` to 22.x (v0.0.50) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-07-03 | Fix PR review findings — build breaks + portability (v0.0.49) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Auto-sync version from git commit count (`scripts/sync-version.js`, pre-commit hook) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Add version display to page footer (`v{version}` via `package.json`) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Initial documentation pass -- SEC markers + handover files | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |

---

## Outstanding / Next Steps

- [x] Set up `.env.local` with Firebase credentials (2026-08-20 — sandbox project, not the real one; portal auth skipped via `RAMS_DEV_PORTAL_BYPASS`, see §Local Testing)
- [x] Test portal auth flow locally — dev-bypass path confirmed working end-to-end (2026-08-20)
- [x] **Fix `prepare` script to not hard-fail when `.git` is unavailable** (2026-08-20, v0.0.50) — `"prepare": "git config core.hooksPath scripts/hooks || true"`. Re-ran the same Vercel CLI dry-run that caught the original break; build now completes (`readyState: READY`).
- [x] **Pin `engines.node` to `22.x`** in `package.json` (2026-08-20, v0.0.50) — was already present but set to `24.x`, which is what Vercel was actually warning about
- [ ] Resolve Vercel "UCtel projects" team access (Svuffer needs an invite from whoever administers it, likely the developer) — blocks both authorizing PR #1's preview deploy and having a fast rollback lever (Instant Rollback) if a direct-to-`main` push ever needs one
- [ ] Decide PR-merge vs direct-to-`main` path with the developer, after the two fixes above land
- [ ] Get a real `PDFLAYER_KEY` (or accept the Puppeteer fallback) to test PDF generation locally — untested so far
- [ ] Revert `src/firebase.js` to the real `rams-generator-bdcb7` config before any commit/push — currently locally modified for sandbox testing only, must not ship as-is
- [ ] Tighten Firestore security rules (currently `allow read, write: if true`)
- [ ] Add React Error Boundary around `<AppContent>`
- [ ] Extract Step 3 from `App.js` into `src/components/steps/Step3.js`
- [ ] Remove hardcoded default form values (client name, site address) in `App.js:603–647`
- [ ] Implement session token refresh (Firebase token expires in 1h; portal cookie lasts 5h)
- [ ] Add share link expiry or access log
- [ ] Link Vercel project and configure environment variables
- [ ] Deploy to Vercel (`npx vercel --prod`)

---

## Rollback Procedure

**To undo any change on `develop`:**
```bash
git log --oneline          # find the commit to revert to
git revert <commit-hash>   # creates a new revert commit (safe)
# or for the last commit:
git revert HEAD
```

**To discard all uncommitted changes:**
```bash
git checkout -- .
```

**To return to `main` (production state):**
```bash
git checkout main
```
