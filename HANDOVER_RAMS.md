# HANDOVER — RAMS Generator

**Version:** see `package.json` — auto-synced to `0.0.{git commit count}` by `scripts/sync-version.js`
**Status:** Active development — `develop` branch, no production deployment yet from this repo clone
**Last updated:** 2026-07-03

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

## Current State (2026-07-03)

- Repo forked to `github.com/Svuffer/rams`; PR #1 open against `dj-iv/rams:main`
- `develop` branch active — version auto-syncs to `0.0.{commit count}` via `scripts/sync-version.js`
- Git hooks live in tracked `scripts/hooks/` — activated by `npm install` (`prepare` script sets `core.hooksPath`); fresh clones must run `npm install` before committing
- No `.env.local` configured locally — app will not run until env vars are set
- No Vercel project linked yet

---

## Recent Fixes

| Date | Change | Detail |
|------|--------|--------|
| 2026-06-30 | Auto-sync version from git commit count (`scripts/sync-version.js`, pre-commit hook) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Add version display to page footer (`v{version}` via `package.json`) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Initial documentation pass -- SEC markers + handover files | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |

---

## Outstanding / Next Steps

- [ ] Set up `.env.local` with portal and Firebase credentials
- [ ] Test portal auth flow locally (`npm run dev`)
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
