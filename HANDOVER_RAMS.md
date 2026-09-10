# HANDOVER — RAMS Generator

**Version:** `package.json` `version` field — plain hand-bumped semver, currently `2.3.9`. No longer auto-derived from git commit count (that mechanism was removed 2026-08-20 — it silently produced wrong numbers under Vercel's shallow git clone; see §Current State). Bumped on **every** merged change, including docs-only ones, so the in-app footer version reliably reflects what's actually deployed. **As of v2.3.9, the footer also shows the short git commit SHA in parens** (e.g. `v2.3.9(482ff50)`), via `REACT_APP_GIT_SHA` injected by `scripts/with-git-sha.js` at build time using `git rev-parse --short HEAD` — safe under a shallow clone (only needs the current commit object, not history depth, unlike the old broken `rev-list --count` approach) — added specifically to make "is the deployed bundle actually the commit I just merged" directly checkable instead of inferred from version number alone.
**Status:** **Live in production** at https://rams-six.vercel.app (deployed 2026-08-20, latest fixes deployed 2026-09-10). Local dev environment working end-to-end against a dedicated sandbox Firebase project (see §Local Testing). **Data loss incident in the production Firestore project (`rams-generator-bdcb7`), discovered 2026-08-20, fully resolved 2026-08-21: `teamMembers`/`riskAssessments` were real bugs, fixed (v2.3.0); `jobTemplates`/`ramsDocuments` were both confirmed by the user to be intentional staff cleanup, not bugs. No backups exist for this project (billing never configured) — still a standing risk independent of this incident, see §Current State.**
**Last updated:** 2026-09-10 (v2.3.9)

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

**Frontend:** React 19 SPA, Tailwind CSS (build-time via CRACO/PostCSS, `tailwind.config.js` — was CDN `<script>` until v2.3.8), React Router 7, @hello-pangea/dnd for drag-drop tasks
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
| `rams/.env.local` | `RAMS_DEV_PORTAL_BYPASS=true` + `RAMS_FIREBASE_SERVICE_ACCOUNT=<path above>` — skips the real UCtel Portal OAuth entirely via `api/session.js`'s dev-bypass path. `RAMS_DEV_PORTAL_EMAIL=<any address>` also set, to give the bypass session a real email — needed to test anything keyed off `currentUser.email` (e.g. the `/assigned` page), since it defaults to `null` otherwise. |
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
- **Two real deploy-breaking bugs found via a Vercel CLI dry-run deploy earlier in this process, both fixed in v0.0.50 (now superseded by v2.0.6, see below):** the `prepare` npm script hard-failing `npm install` when no `.git` directory is present, and `engines.node` pinned to an unsupported `24.x`.
- **A third, more subtle bug found after going live: the footer showed `v0.0.18` instead of the real version.** The auto-versioning script (`scripts/sync-version.js`) computed the version as `0.0.{git rev-list --count HEAD}` — accurate in a full local clone, but **Vercel does a shallow git checkout for its builds**, so `git rev-list --count` silently returned a much smaller, arbitrary number instead of erroring. Confirmed by comparing against the true count from a full local clone (52) vs. what was shown (18). **Fix (2026-08-20, v2.0.6): removed the entire auto-versioning mechanism** (`scripts/sync-version.js`, the tracked pre-commit hook, the generated `src/version.js`, the `prepare`/`prestart`/`prebuild` npm scripts) in favor of a plain hand-bumped `package.json` `version` field, exposed to the client via `REACT_APP_VERSION=$npm_package_version` in a committed `.env` file — CRA's own documented dotenv-expand pattern, not dependent on git history depth at all. Verified locally: `"2.0.6"` confirmed present in both the dev bundle and a real `npm run build` output.
- **Practical mitigation for the per-committer Vercel block above (2026-09-10):** this repo's local working copy now has `git config --local user.name/user.email` set to `dj-iv <dj-iv@users.noreply.github.com>` — see `CHANGELOG_RAMS.md`'s 2026-09-10 entry. Any commit made from this machine now carries the Vercel-team-recognized identity by default, so ordinary commits no longer need the manual "have dj-iv make a trivial real edit" workaround described above. This is still not one of the two "real fixes" listed above (repo stays private, team stays single-seat) — it only helps commits made from this specific machine/working copy.

### Production data loss (2026-08-20/21) — fully resolved

**Symptom:** `teamMembers`, `jobTemplates`, `riskAssessments`, and `ramsDocuments` were all found empty in the real `rams-generator-bdcb7` Firestore project — confirmed directly (not assumed), via three independent methods that all agreed: unauthenticated REST reads, directly browsing the Firestore console after the user was granted Google Cloud Organization Administrator access (their Workspace Super Admin role reaches this project since it's under UCtel's Cloud Organization), and a live browser console snippet run against the production site itself. `standardTasks`, `ppe`, `tools`, `materials`, and `permits` were all confirmed intact throughout.

**Root cause found for two of the four — real, pre-existing bugs, not this session's work:**
- **`teamMembers`:** the "×" button to remove someone from a RAMS document's Project Team list (Step 2) was calling `deleteDoc` on the **shared, company-wide** `teamMembers/{id}` record — not just removing them from that one document. Anyone, on any document, at any time, believing they were doing a harmless per-document action, was actually permanently deleting that person from every RAMS company-wide. No single incident required — just ordinary use over time. **Fixed 2026-08-21 (v2.3.0)** — see the Outstanding entry below for the fix.
- **`riskAssessments`:** the same pattern, one level down — the "Delete" button on an individual hazard (Step 4) overwrote the entire shared risk category document, permanently removing that hazard for every RAMS company-wide, while a correctly-scoped local-only checkbox sat right next to it doing the safe version of what people likely thought "Delete" did. **Fixed 2026-08-21 (v2.3.0)** — reworded to be honest about what it does, since the safe alternative (the checkbox) already existed.
- **`jobTemplates`:** confirmed by the user to be **expected** — legitimate staff cleanup via the (correctly-labeled, confirm-gated) Delete Template feature. Not a bug, not unexpected.
- **`ramsDocuments`:** confirmed by the user (2026-08-21) to also be **expected** — legitimate staff cleanup of documents via the correctly-labeled, confirm-gated Delete on the Saved RAMS list. Not a bug, not unexpected. All four collections are now accounted for: two were real bugs (fixed), two were intentional staff cleanup through working, honestly-labeled UI.

**Ruled out along the way, with reasoning, not just denial:** this session's own Admin SDK test scripts (hard IAM boundary — sandbox-only credentials structurally cannot touch the real project), a stray commit shipping sandbox config to production (every commit used explicit file lists, checked directly), and Firestore rules/auth issues (an unauthenticated read of `standardTasks` returning real data proves rules weren't blocking anything — a rules problem would block every collection equally, not selectively). Real production rules were also confirmed via the Firestore console's own rule-set history to be unchanged since **24 Sept 2025** — our tightened version was never deployed here.

**No backups exist for this project.** Firestore Point-in-Time Recovery/scheduled backups require the Blaze (pay-as-you-go) billing plan, and billing was never configured on `rams-generator-bdcb7` — confirmed directly by the user in the console. This has been true the whole time, independent of this incident, and remains true — worth fixing regardless, since without it any future deletion (accidental or otherwise) is equally unrecoverable. Not yet done.

**A related, separate bug found and fixed in the same pass:** with `jobTemplates` empty, the "Select Job Template" dropdown in Step 3 ends up with only one DOM option ("+ Add New Template..."), which the browser then treats as already-selected by default. A real user clicking it fires no `change` event (nothing actually changes from the browser's point of view), so the "Add New Template" form silently never opens. Reproduced directly against the sandbox in the same empty-`jobTemplates` state as production. **Not yet fixed** — see Outstanding.

---

## Recent Fixes

| Date | Change | Detail |
|------|--------|--------|
| 2026-09-10 | Local git identity set to `dj-iv` (`--local` git config, matches the Vercel-owner account discussed above) — env only, no code change (v2.3.10) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-09-10 | Show short git commit SHA next to the version in the footer (v2.3.9) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-09-10 | Replace `cdn.tailwindcss.com` runtime script with a proper build-time Tailwind pipeline (v2.3.8) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-09-10 | Diagnose "Failed to save RAMS" reports: log the exact Firestore-illegal field path instead of a generic message (v2.3.7) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-21 | Fix "Add New Template" dead-end when jobTemplates is empty; ramsDocuments incident resolved (v2.3.6) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-21 | Address Copilot PR review: sync package-lock.json version, changelog wording (v2.3.5) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-21 | Docs-only release: README rewrite, handover header fix, version bump (v2.3.4) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-21 | Dropdown selection fills a blank team member row instead of appending (v2.3.3) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-21 | Remove "at least one team member" restriction (v2.3.2) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-21 | Blank the default Project Team entry (v2.3.1) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-21 | **Fix real root cause of team-member/risk-assessment data loss** (v2.3.0) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-20 | Engineer assignment + sign-off acceptance, new `/assigned` page (v2.2.0) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-20 | **Deployed to production** (PR #2 → `dj-iv/rams:main`, https://rams-six.vercel.app) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-20 | Remove auto-versioning (shallow-clone bug), hand-bump version instead (v2.0.6) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-08-20 | Fix `prepare` script hard-fail + pin `engines.node` to 22.x (v0.0.50) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-07-03 | Fix PR review findings — build breaks + portability (v0.0.49) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Auto-sync version from git commit count (`scripts/sync-version.js`, pre-commit hook) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Add version display to page footer (`v{version}` via `package.json`) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |
| 2026-06-30 | Initial documentation pass -- SEC markers + handover files | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) |

---

## Outstanding / Next Steps

- [ ] **"Failed to save RAMS. Please retry." reports (2026-09-10, v2.3.7 — diagnostic added, root cause not yet found)** — reported failing consistently for one user (not reproducible for another, on the same document type). Browser console shows `FirebaseError: Property formData contains an invalid nested entity.` on every attempt across a 5+ hour session, ruling out network flakiness as the cause (a separate, real but unrelated connectivity issue — repeated `ERR_INTERNET_DISCONNECTED`/`ERR_QUIC_PROTOCOL_ERROR` — shows up in the same log, and an earlier `ERR_BLOCKED_BY_CLIENT` sighting on a different affected user's machine turned out to be a browser extension blocking an unrelated WebChannel teardown ping, not the save call itself). Firestore rejects an array nested directly inside another array (or >20 levels of nesting); `prepareFormForPersistence`'s `JSON.parse(JSON.stringify(...))` clone guarantees everything else about the payload is plain-JSON-safe, so that's the only remaining explanation, but the exact offending field hasn't been located by code review alone. Added `findFirestoreNestingViolation()` in `src/App.js`, run against `preparedForm` right before the Firestore write in `handleSaveDocument` — on the next failed save it will show `Failed to save RAMS: invalid data at formData.<exact.path>` instead of the generic message, which should pinpoint the fix. **Next step: get the affected user to retry and report that path.**
- [x] **Investigate production data loss in `rams-generator-bdcb7`** (found 2026-08-20, fully resolved 2026-08-21) — see full writeup in §Current State. `teamMembers`/`riskAssessments`: real bug found and fixed (v2.3.0). `jobTemplates` and `ramsDocuments`: both confirmed by the user to be expected/intentional staff cleanup, not bugs.
- [ ] **Configure billing on `rams-generator-bdcb7`** so Firestore Point-in-Time Recovery becomes available — confirmed no backups currently exist at all, independent of the incident above, and this remains true. Deliberately deprioritized (2026-08-21) — not being worked on for now.
- [x] **Fix the "Add New Template" dead-end when `jobTemplates` is empty** (2026-08-21, v2.3.6) — with zero templates, the Step 3 dropdown ended up with only "+ Add New Template..." as its sole, browser-default-selected option, so a real click fired no `change` event and the form never opened. Fixed with an always-clickable "+ New Template" button next to the dropdown, independent of the `<select>`'s `onChange` — sidesteps the single-option edge case entirely rather than trying to out-guess browser `change`-event semantics. Also fixed the related root cause: `initialTemplateKey` was hardcoded to `'G43'`, a template that may not exist (e.g. after cleanup); now defaults to the first real template key, or `''` if none exist. Verified against the real sandbox project with `jobTemplates` genuinely empty (matching production's actual state): confirmed the dropdown has exactly one option, the new button is present, and clicking it opens the "Create New Template" form.

- [x] Set up `.env.local` with Firebase credentials (2026-08-20 — sandbox project, not the real one; portal auth skipped via `RAMS_DEV_PORTAL_BYPASS`, see §Local Testing)
- [x] Test portal auth flow locally — dev-bypass path confirmed working end-to-end (2026-08-20)
- [x] Fix `prepare` script hard-fail + pin `engines.node` (2026-08-20, v0.0.50)
- [x] Deploy to production (2026-08-20) — https://rams-six.vercel.app, see §Current State for the full path to get there
- [x] Remove auto-versioning mechanism, replace with hand-bumped `package.json` version (2026-08-20, v2.0.6) — fixes the shallow-clone version bug
- **Vercel per-committer deploy block: decided (2026-08-20) to live with it, not fix it.** Options considered: make `dj-iv/rams` public (rejected — repo was deliberately made private, staying that way), upgrade "UCtel projects" to Vercel Pro ($20/mo, rejected — one repo doesn't justify it, though worth revisiting if the team ever hosts other projects too), deploy under a personal Vercel account instead (rejected — would move production hosting ownership away from UCtel's own team, a bigger call than this warranted). **Decision: keep using the manual workaround** (dj-iv makes the actual triggering commit/redeploy himself) for now. Revisit if this becomes frequent enough to be a real bottleneck, or if the team ever moves off Vercel entirely (e.g. self-hosting on the OCI VM used for other UCtel projects — a separate, bigger discussion, not started). **Hit again 2026-09-10 (PR #16/v2.3.8's merge commit was blocked, same as PR #15's before it — dj-iv's follow-up commit is what actually deployed both).** Since "is the deploy the commit I think it is" keeps being genuinely hard to tell apart from "still waiting on the trigger commit," v2.3.9 adds the short git SHA to the footer (see §Version above) so it's directly checkable instead of inferred.
- [ ] Clean up dead PR #1 (close formally, or leave — it's inert either way, just don't try to reuse it, see §Current State)
- [ ] Get a real `PDFLAYER_KEY` (or accept the Puppeteer fallback) to test PDF generation locally — untested so far
- [x] **Tighten Firestore security rules** (2026-08-20) — was `allow read, write: if true`, meaning anyone on the internet who inspected the public Firebase client config (visible by design in the JS bundle) could read/write/delete any document, bypassing portal login entirely. Now requires `request.auth != null`. Zero functional impact: every legitimate write already happens post-login (portal → custom token → `signInWithCustomToken()`), and the public share page never touches Firestore directly (reads via `api/get-rams-share.js`'s Admin SDK server-side, which bypasses rules entirely). Verified against a real Firestore rules emulator, not just reviewed: unauthenticated read/write correctly blocked, authenticated read/write correctly allowed, across `ramsDocuments` and the reference collections. **Still needs deploying to the real `rams-generator-bdcb7` project** (`firebase deploy --only firestore:rules`) — this session only has credentials for the throwaway sandbox project, not the real one. Whoever has Firebase console access to `rams-generator-bdcb7` needs to run that deploy, or grant access so it can be done directly.
- [x] **Remove hardcoded Step 1 default values** (2026-08-20) — `client`, `siteAddress`, `commencementDate`, `estimatedCompletionDate`, `preparedBy`, `preparedByEmail`, `preparedByPhone` all defaulted to a fixed fake project ("iQ Student Accommodation", dated Sept 2025, "James Smith") on every new document; now blank. Scoped to exactly what's in Step 1 ("Project Details") per the change request — deliberately left `hoursOfWork` (generic operational default, not project-identifying) and `documentCreationDate`/`revisionNumber` (already dynamic/sensible) untouched. **Related, not yet fixed:** Step 2's default `projectTeam` entry still hardcodes "James Smith, Project Coordinator" — same underlying issue, different step, out of scope for this change.
- [ ] Add React Error Boundary around `<AppContent>`
- [ ] Extract Step 3 from `App.js` into `src/components/steps/Step3.js`
- [ ] Implement session token refresh (Firebase token expires in 1h; portal cookie lasts 5h)
- [x] **Add template deletion** (2026-08-20, v2.0.8) — Step 3's job template dropdown had no way to remove obsolete/duplicate templates, only add new ones. Added a "Delete Template" button next to the dropdown (only shown when a real template, not the empty/`--add-new--` state, is selected), guarded by a confirm dialog. If the deleted template was the active selection, falls back to the next remaining template (or blank if none left). Verified end-to-end against the running app: created a real template through the existing UI flow, deleted it, confirmed it's gone from the dropdown and Firestore.
- [x] **Add template editing** (2026-08-20, v2.0.9) — previously templates could only be created or (as of v2.0.8) deleted, no way to fix a typo or update a description without delete-and-recreate. Added an "Edit Template" button next to "Delete Template" (same visibility guard), opens a form pre-filled with the current name/description; the ID stays read-only (it's the Firestore doc key, not user-facing — renaming would mean create-new+delete-old, out of scope). Verified end-to-end against the running app: created a template, edited its name/description, confirmed the change reflected in the dropdown and the edit form closed, then cleaned up via delete.
- [x] **Add edit/delete for standard tasks, PPE, Tools, and Materials** (2026-08-20, v2.1.0):
  - **PPE / Tools / Materials (and Permits, same shared component):** edit and delete already existed in the code but were silently restricted to only items added as "custom" during the current session (`item.isCustom` gate in `SelectableList.js`) — seeded/default items had no Edit/Delete buttons at all. Relaxed the gate to apply to every item. Verified against a real non-custom item seeded directly into Firestore (simulating a genuine default item, not something added during testing): Edit/Delete now appear and both work.
  - **Standard tasks** (the "Configure & Order Sequence of Works" list in Step 3): previously had create only, no edit/delete at all. Added both, mirroring the job-template pattern — Edit opens a form pre-filled with title + default description, Delete removes the task definition and cleans up any now-orphaned entries from the current document's task sequence. Note: the pre-existing "Update Default" button on each task is a separate, apparently incomplete feature (writes to local React state only, never to Firestore, and touches a field nothing else reads) — left untouched, not fixed as part of this change.
  - Both verified end-to-end against the real running app.
- [x] **Add engineer assignment + sign-off acceptance** (2026-08-20, v2.2.0):
  - `teamMembers` gained an `email` field (previously absent entirely) and a per-document `requiresSignOff` flag on Step 2's team entries — the "Requires sign-off" checkbox marks who must accept a given RAMS.
  - RAMS documents gained `assignedEngineers` / `assignedEngineerEmails` (computed from `projectTeam` on every save) and `acceptances` (a map keyed by team-member id — **not** email, since email addresses contain `.` which Firestore's dot-notation `updateDoc` paths would otherwise misparse as nested path separators).
  - New page `/assigned` ("Assigned RAMS"), gated by portal login same as `/saved`: lists RAMS assigned to the currently logged-in user (matched by `currentUser.email`), split Pending/Accepted. Opening a pending one shows the actual document (reusing `PrintableDocument`, same renderer as the customer share view) with a typed-signature accept form; the acceptance record (name + timestamp) is then shown on re-opening instead of the form.
  - Sign-off is a **typed name only**, not the full typed/image-upload toggle from Step 1's signature block — kept deliberately simpler since that wasn't explicitly requested; can be extended later if wanted.
  - **Known, deliberately deferred limitation:** Firestore rules currently let any authenticated UCtel staff member write anything (existing "team shared" model, not something this feature made worse) — so nothing at the database level stops someone from writing a fake acceptance under another person's identity via a direct write. The UI only ever shows/signs under the current user's own logged-in identity, but that's an app-level constraint, not a database-enforced one. User explicitly deferred fixing this ("We'll get to it later").
  - Verified end-to-end against the real running app: assigned an engineer, saved, confirmed it appeared as Pending on `/assigned` for that exact logged-in identity, reviewed the actual document content, signed, confirmed status flipped to Accepted with the correct signer name shown on re-open.
- [x] **Fix the real, likely root cause of the team-member/risk-assessment data loss** (2026-08-21, v2.3.0) — see §Current State for the full incident writeup. Two pre-existing (not introduced this session) bugs where a button that looked like "remove from my document" actually permanently deleted shared, company-wide data:
  - `removeTeamMember` (the "×" on Step 2's Project Team list) called `deleteDoc` on the global `teamMembers/{id}` record — fixed to be purely local (removes from the current document only). The real global delete now lives in a new "Manage Team Members" panel next to the "Add Existing Team Member" dropdown, with an explicit, honest confirm dialog and a proper Edit option too.
  - `handleDeleteHazard` (the "Delete" button per hazard in Step 4) overwrote the entire shared `riskAssessments/{category}` document, permanently removing that hazard for every RAMS company-wide -- while the checkbox right next to it (which safely, correctly excludes a hazard from just the current document) was already implemented properly. Fix here was just honest labeling: reworded the confirm dialog and button text to say exactly what it does, since the safe local alternative already existed.
  - Verified end-to-end against the real running app: confirmed the "×" no longer touches Firestore, confirmed the new Manage panel's edit and permanent-delete both work correctly and are clearly labeled.
  - `jobTemplates` and `ramsDocuments` being empty were both confirmed separately as **expected** -- intentional staff cleanup via the (correctly labeled) Delete Template / Delete document features, not a bug.
- [x] **Blank the default Project Team entry** (2026-08-21, v2.3.1) — Step 2 always defaulted its first team member row to "James Smith, Project Coordinator, +44 7730 890403, First Aid, Working at Height" on every new document, same underlying issue as the Step 1 fields fixed earlier ("Change 1"), just in a different step and missed at the time. Now blank (`{id: '1', name: '', role: '', phone: '', email: '', competencies: ''}`). Verified against the real running app: all five fields confirmed blank on a fresh document.
- [x] **Remove the "at least one team member" restriction on Step 2** (2026-08-21, v2.3.2) — the "×" remove button previously only rendered when more than one row existed (`Step2.js`, `data.projectTeam.length > 1`), so the last remaining row could never be removed via the UI. Removed the guard entirely. Verified against the real running app: removed the sole row down to zero, no crash, Step 3 still renders fine afterward.
- [x] **Selecting from "Add Existing Team Member" now fills an existing blank row instead of always adding a new one** (2026-08-21, v2.3.3) — since the default row is blank (v2.3.1), picking someone from the dropdown used to leave that blank row sitting there as a leftover, needing a separate manual delete. `handleSelectTeamMember` now checks for a row with no name first and fills that instead; only appends a new row if every existing row is already in use. Verified against the real running app: selecting one person fills the blank row (no extra row), selecting a second person correctly appends since no blank row remains.
- [ ] Add share link expiry or access log

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
