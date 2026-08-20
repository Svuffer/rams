# HANDOVER — RAMS Generator

**Version:** `package.json` `version` field — plain hand-bumped semver, currently `2.0.0`. No longer auto-derived from git commit count (that mechanism was removed 2026-08-20 — it silently produced wrong numbers under Vercel's shallow git clone; see §Current State).
**Status:** **Live in production** at https://rams-six.vercel.app (deployed 2026-08-20). Local dev environment working end-to-end against a dedicated sandbox Firebase project (see §Local Testing).
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
| Version | `package.json` `version` field, exposed to the client via `REACT_APP_VERSION=$npm_package_version` in the committed `.env` — read in `src/App.js` as `process.env.REACT_APP_VERSION` |
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

**The app is live in production:** https://rams-six.vercel.app, deployed from `dj-iv/rams:main` at commit `90d66ec`. Getting there took a few real detours, documented below because the cause of each isn't obvious from the code alone.

- `.env.local` configured against a sandbox Firebase project for local dev — see §Local Testing above. Local dev server confirmed working end-to-end for auth/session.
- **`dj-iv/rams` was briefly inaccessible (private, no access) between roughly 2026-08-17 and 2026-08-20.** Access came back, but `Svuffer/rams` (the fork) never re-registered as a fork of it afterward (`fork: false, parent: null` via the GitHub API) — this turned out to matter a lot, see below.
- **PR #1 (the original fork-based PR) is dead — do not try to reuse it.** Pushing a new commit to it caused GitHub to auto-close it, and every attempt to reopen it (via `gh pr reopen`, via direct REST `PATCH state=open`) failed with `"state cannot be changed. The repository may be missing relevant data. Please contact support"`. Creating a *fresh* cross-repo PR from the same fork also failed (`"No commits between dj-iv:main and Svuffer:develop"`, `"not all refs are readable"`) — root cause was the severed fork relationship above; GitHub couldn't compute the cross-repo comparison anymore. No code or history was ever lost; this was purely a GitHub metadata problem.
- **Fix: Svuffer already had `write` (collaborator) access directly on `dj-iv/rams`** (confirmed via `gh api repos/dj-iv/rams/collaborators/Svuffer/permission` → `"permission":"write"`). Pushed `develop` directly into `dj-iv/rams` as its own branch (`git push upstream develop:develop`), sidestepping the broken fork link entirely, then opened **PR #2** same-repo (`develop` → `main`) and merged it normally. This is now the working pattern — don't route through a fork for this repo again.
- **Vercel deploys are blocked per-committer, not per-repo-permission — this is the important one to remember.** Even with GitHub write access and a clean merge, Vercel refused to deploy anything committed under Svuffer's GitHub identity, with an explicit bot comment: *"@Svuffer is attempting to deploy a commit to the UCtel projects team on Vercel, but is not a member of this team... Upgrade to pro and add @Svuffer as a member. A Pro subscription is required to access Vercel's collaborative features."* **Root cause: the "UCtel projects" Vercel team is on the free Hobby plan, which is single-user only** — it doesn't matter who has GitHub access, Vercel independently checks its own (paid-tier-gated) team membership before deploying. This blocked both PR #2's preview and the actual merge-to-`main` production deploy.
- **Workaround used to actually ship (2026-08-20): had the repo owner (dj-iv) make a trivial, real edit himself** (renamed the README title, commit `90d66ec`), committed under his own already-privileged GitHub identity. That deploy went through immediately (`state: success`, confirmed live). This is a one-off unblock, not a fix — **every future commit authored by anyone other than an existing paid Vercel team member will hit this same wall.** Two real fixes exist (neither applied yet): make `dj-iv/rams` public (Vercel's team-membership restriction doesn't apply to public repos), or upgrade "UCtel projects" to Vercel Pro and add other contributors as members.
- **Two real deploy-breaking bugs found via a Vercel CLI dry-run deploy earlier in this process, both fixed in v0.0.50 (now superseded by v2.0.0, see below):** the `prepare` npm script hard-failing `npm install` when no `.git` directory is present, and `engines.node` pinned to an unsupported `24.x`.
- **A third, more subtle bug found after going live: the footer showed `v0.0.18` instead of the real version.** The auto-versioning script (`scripts/sync-version.js`) computed the version as `0.0.{git rev-list --count HEAD}` — accurate in a full local clone, but **Vercel does a shallow git checkout for its builds**, so `git rev-list --count` silently returned a much smaller, arbitrary number instead of erroring. Confirmed by comparing against the true count from a full local clone (52) vs. what was shown (18). **Fix (2026-08-20, v2.0.0): removed the entire auto-versioning mechanism** (`scripts/sync-version.js`, the tracked pre-commit hook, the generated `src/version.js`, the `prepare`/`prestart`/`prebuild` npm scripts) in favor of a plain hand-bumped `package.json` `version` field, exposed to the client via `REACT_APP_VERSION=$npm_package_version` in a committed `.env` file — CRA's own documented dotenv-expand pattern, not dependent on git history depth at all. Verified locally: `"2.0.0"` confirmed present in both the dev bundle and a real `npm run build` output.

---

## Recent Fixes

| Date | Change | Detail |
|------|--------|--------|
| 2026-08-20 | **Deployed to production** (PR #2 → `dj-iv/rams:main`, https://rams-six.vercel.app) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-20 | Remove auto-versioning (shallow-clone bug), hand-bump version instead (v2.0.0) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-20 | Fix `prepare` script hard-fail + pin `engines.node` to 22.x (v0.0.50) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-07-03 | Fix PR review findings — build breaks + portability (v0.0.49) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Auto-sync version from git commit count (`scripts/sync-version.js`, pre-commit hook) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Add version display to page footer (`v{version}` via `package.json`) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Initial documentation pass -- SEC markers + handover files | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |

---

## Outstanding / Next Steps

- [x] Set up `.env.local` with Firebase credentials (2026-08-20 — sandbox project, not the real one; portal auth skipped via `RAMS_DEV_PORTAL_BYPASS`, see §Local Testing)
- [x] Test portal auth flow locally — dev-bypass path confirmed working end-to-end (2026-08-20)
- [x] Fix `prepare` script hard-fail + pin `engines.node` (2026-08-20, v0.0.50)
- [x] Deploy to production (2026-08-20) — https://rams-six.vercel.app, see §Current State for the full path to get there
- [x] Remove auto-versioning mechanism, replace with hand-bumped `package.json` version (2026-08-20, v2.0.0) — fixes the shallow-clone version bug
- **Vercel per-committer deploy block: decided (2026-08-20) to live with it, not fix it.** Options considered: make `dj-iv/rams` public (rejected — repo was deliberately made private, staying that way), upgrade "UCtel projects" to Vercel Pro ($20/mo, rejected — one repo doesn't justify it, though worth revisiting if the team ever hosts other projects too), deploy under a personal Vercel account instead (rejected — would move production hosting ownership away from UCtel's own team, a bigger call than this warranted). **Decision: keep using the manual workaround** (dj-iv makes the actual triggering commit/redeploy himself) for now. Revisit if this becomes frequent enough to be a real bottleneck, or if the team ever moves off Vercel entirely (e.g. self-hosting on the OCI VM used for other UCtel projects — a separate, bigger discussion, not started).
- [ ] Clean up dead PR #1 (close formally, or leave — it's inert either way, just don't try to reuse it, see §Current State)
- [ ] Get a real `PDFLAYER_KEY` (or accept the Puppeteer fallback) to test PDF generation locally — untested so far
- [ ] Tighten Firestore security rules (currently `allow read, write: if true`) — now more urgent since the app is live in production, not just a PR
- [ ] Add React Error Boundary around `<AppContent>`
- [ ] Extract Step 3 from `App.js` into `src/components/steps/Step3.js`
- [ ] Remove hardcoded default form values (client name, site address) in `App.js:603–647`
- [ ] Implement session token refresh (Firebase token expires in 1h; portal cookie lasts 5h)
- [ ] Add share link expiry or access log
- [ ] Link Vercel project and configure environment variables
- [ ] Deploy to Vercel (`npx vercel --prod`)

---

## Rollback Procedure

**To undo any change on `main` (now the live production branch):**
```bash
git log --oneline          # find the commit to revert to
git revert <commit-hash>   # creates a new revert commit (safe)
# or for the last commit:
git revert HEAD
git push upstream main     # "upstream" = dj-iv/rams in this local clone
```

**Important: a revert pushed by anyone other than an existing "UCtel projects" Vercel team member will hit the same per-committer deploy block described in §Current State.** GitHub-side the revert lands fine; Vercel just won't build it until either that access gap is resolved or dj-iv makes the actual triggering commit himself (or approves it via the Vercel dashboard). Don't assume a pushed revert has actually gone live without checking the commit's Vercel status (`gh api repos/dj-iv/rams/commits/<sha>/status`).

**To discard all uncommitted changes:**
```bash
git checkout -- .
```
