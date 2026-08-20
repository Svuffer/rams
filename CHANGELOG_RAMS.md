# Changelog -- RAMS Generator

All entries newest-first. Every entry includes a **Rollback** line.

---

## 2026-08-20 -- v2.0.0: Remove auto-versioning (shallow-clone bug), first production deploy

The app went live at https://rams-six.vercel.app this session (via PR #2 -> `dj-iv/rams:main`, commit `90d66ec`). Once live, the footer showed `v0.0.18` instead of the real version -- traced to `scripts/sync-version.js` computing version as `0.0.{git rev-list --count HEAD}`, which is accurate in a full local clone but silently wrong under Vercel's shallow git checkout (confirmed: true count from a full clone was 52, Vercel's shallow clone only saw enough history to compute 18). The command doesn't fail in a shallow clone, it just returns incomplete data, so the earlier "keep existing version if git is unavailable" safety net never triggered.

- Deleted `scripts/sync-version.js`, `scripts/hooks/pre-commit`, generated `src/version.js`
- Removed `prepare`, `prestart`, `prebuild`, `version-sync` from `package.json` scripts
- `package.json` `version` is now a plain hand-bumped field (`2.0.0`), no longer git-derived
- Added committed `.env` with `REACT_APP_VERSION=$npm_package_version` -- CRA's own documented dotenv-expand pattern; npm sets `npm_package_version` automatically from `package.json` on every `npm run`, so no custom script is needed at all
- Un-ignored plain `.env` in `.gitignore` (was previously ignoring it alongside `.env.local`, which is non-standard CRA convention -- `.env` is meant to hold committed shared defaults, `.env.local` for private overrides)
- `src/App.js`: footer now reads `process.env.REACT_APP_VERSION` instead of importing a generated `./version` module
- Verified locally: `"2.0.0"` confirmed present in both the `npm start` dev bundle and a real `npm run build` output before committing

**Rollback:** `git revert <this commit>` restores the auto-sync mechanism -- reintroduces the shallow-clone bug, only do this if the replacement itself causes an unrelated problem. Note: per this session's other finding, a revert pushed by anyone other than an existing Vercel team member won't deploy until the per-committer block (see `HANDOVER_RAMS.md` §Current State) is resolved or worked around.

---

## 2026-08-20 -- v0.0.50: Fix `prepare` script hard-fail + pin `engines.node`

Both issues found live via a Vercel CLI dry-run deploy earlier this session (see the entry below). Fix verified by re-running the exact same dry-run -- build now completes (`readyState: READY`), where it previously failed with `npm error code 128`.

- `package.json` `prepare` script: `"git config core.hooksPath scripts/hooks"` → `"... || true"` -- no longer hard-fails `npm install` in a build environment with no `.git` directory
- `package.json` `engines.node`: `"24.x"` → `"22.x"` -- was already present but set to the version Vercel was actually warning about (`Found invalid Node.js Version: "24.x"`)

**Rollback:** `git revert <this commit>` on `develop`. Reintroduces both original bugs -- only revert if this fix itself causes an unrelated problem.

---

## 2026-08-20 -- Local testing session: sandbox Firebase project + two real deploy bugs found

No code committed this session -- investigation/testing only. Full detail in `HANDOVER_RAMS.md` (§Local Testing, §Current State, §Outstanding).

- Set up local dev environment against a new, dedicated sandbox Firebase project (`uctel-projects-sandbox`) instead of the real `rams-generator-bdcb7`, so testing doesn't need the developer's secrets:
  - `rams/.env.local` (gitignored, not committed): `RAMS_DEV_PORTAL_BYPASS=true` + `RAMS_FIREBASE_SERVICE_ACCOUNT` pointing at the sandbox service account key (stored outside the repo)
  - `src/firebase.js` locally edited to point at the sandbox project's web config -- **this file is tracked in git and must be reverted to the real `rams-generator-bdcb7` config before any commit**
  - Firebase Authentication had to be manually enabled via Console (Get Started) -- dev bypass alone isn't enough, `createCustomToken`/`getUser` fail with `auth/configuration-not-found` until Auth itself is provisioned
  - Verified end-to-end: `/api/session` dev-bypass token issuance, Firebase Auth sign-in with that token, Firestore write + read-back to `ramsDocuments`
- Confirmed `upstream` (`dj-iv/rams`) access, which had been temporarily blocked (private/no access), is restored -- was a permissions gap, not a deletion; `upstream/main` had zero new commits the whole time, PR #1 still `MERGEABLE`
- Diffed PR #1 (`develop`) against `upstream/main` in full to risk-assess a proposed "test locally, push straight to `main`" workflow: 10 of 12 changed files are comment-only (SEC markers), zero logic changes; the two real changes are additive (footer version display, version-sync build scripts)
- **Found via a real Vercel CLI dry-run deploy (`vercel --prod` under a personal Vercel team, not the shared one):**
  - `prepare` npm script (`git config core.hooksPath scripts/hooks`) has no error handling and hard-fails (`npm install` exit 128) in a build environment with no `.git` directory -- reproduced live, not fixed yet
  - Vercel warning: no `engines.node` pin in `package.json`, current setup resolves to a Node version Vercel flags as invalid
- PR #1's Vercel status check is `FAILURE` ("Authorization required to deploy") -- confirmed this is normal Vercel behavior gating first-time preview deploys from a fork, not a code issue; needs someone with "UCtel projects" Vercel team access to click Authorize (neither Svuffer nor this session has that access yet)

**Rollback:** Nothing was committed, so there's nothing to revert in git. To undo the *local* environment changes: delete `rams/.env.local` and revert `src/firebase.js` to the `rams-generator-bdcb7` config (see `HANDOVER_RAMS.md` history for the original values, or `git checkout -- src/firebase.js` since it was never committed with the sandbox config).

---

## 2026-07-03 -- v0.0.49: Fix PR review findings (build breaks + portability)

Fixes for issues flagged by automated review on `dj-iv/rams` PR #1:

- `src/components/ShareView.js`: restored `useEffect(() => {` opener that was accidentally
  removed during the SEC marker pass (unmatched brace -- syntax error)
- `src/App.js`: replaced `import { version } from '../package.json'` (CRA forbids imports
  outside `src/`, build would fail) with generated `src/version.js` module
- `scripts/sync-version.js`: now exits without writing when git is unavailable instead of
  clobbering the version to `0.0.0`; also generates `src/version.js`
- Pre-commit hook moved from untracked `.git/hooks/` to tracked `scripts/hooks/`,
  activated by the `prepare` npm script (`git config core.hooksPath scripts/hooks`) --
  fresh clones get the hook via `npm install`
- `package.json`: `build` script now uses `cross-env CI=false` (plain `CI=false` fails on
  Windows; `cross-env` was already a devDependency)
- `HANDOVER.md`: removed user-specific local path from session checklist
- `HANDOVER_RAMS.md`: version header no longer hardcoded (points at `package.json`)

**Rollback:** `git revert <this commit>` on `develop`.

---

## 2026-06-30 -- v0.0.47: Auto-sync version from git commit count

- Added `scripts/sync-version.js` -- sets `package.json` version to `0.0.{commit_count}`
  - `--next` flag: count + 1 (pre-commit hook, predicts post-commit version)
  - `--dry` flag: prints next version without writing (check before writing commit message)
- Wired `prestart` and `prebuild` npm hooks -- version syncs automatically on every start/build
- Added `.git/hooks/pre-commit` -- bumps and stages `package.json` before every commit
  (local-only; superseded in v0.0.49 by tracked hooks in `scripts/hooks/`)
- Commit message convention going forward: `component: vX.Y.Z -- description`

**Rollback:** `git revert c0ead07` on `develop`.

---

## 2026-06-30 -- v0.0.46: Add version display to page footer

- Imported `version` from `package.json` in `src/App.js` (SEC 100)
- Added `<footer>` element to main app page rendering `v{version}` (SEC 1100)
- Footer version stays in sync with `package.json` automatically

**Rollback:** `git revert 114436d` on `develop`.

---

## 2026-06-30 -- Handover doc gap fixes

- `HANDOVER_RAMS.md`: corrected Current State, added missing Recent Fixes section
- `CHANGELOG_RAMS.md`: corrected SEC ranges (`session.js` 100--400, `Step5.js` 100--300)

**Rollback:** `git revert 880f5b9` on `develop`.

---

## 2026-06-30 -- SEC header format: em dash replaced with `--`

- Replaced Unicode em dash with `--` in section map one-liner across all 10 SEC-marked source files

**Rollback:** `git revert a60d000` on `develop`.

---

## 2026-06-30 -- Initial documentation pass

- Repo cloned from `github.com/dj-iv/rams` to `c:/_VSC/UCtel_Portal/rams`
- Created `develop` branch for all ongoing development
- Created `HANDOVER.md`, `HANDOVER_RAMS.md`, `CHANGELOG_RAMS.md`
- Added SEC section markers to 10 source files over 200 lines:
  - `src/App.js` (2667 lines -- SEC 100--1200)
  - `src/components/PrintableDocument.js` (~1059 lines -- SEC 100--1100)
  - `src/components/ShareView.js` (240 lines -- SEC 100--400)
  - `src/components/PreviewModal.js` (219 lines -- SEC 100--300)
  - `src/components/steps/Step4.js` (276 lines -- SEC 100--400)
  - `src/components/steps/Step5.js` (239 lines -- SEC 100--300)
  - `src/pages/SavedRamsPage.js` (288 lines -- SEC 100--400)
  - `api/session.js` (278 lines -- SEC 100--400)
  - `api/generate-pdf.js` (257 lines -- SEC 100--400)
  - `api/utils/portalAuth.js` (250 lines -- SEC 100--500)
- No functional code changes -- documentation only

**Rollback:** `git revert f19d029` on `develop`. Removes all documentation files and SEC markers.
