# Changelog -- RAMS Generator

All entries newest-first. Every entry includes a **Rollback** line.

---

## 2026-08-21 -- v2.3.2: Remove the "at least one team member" restriction

`Step2.js`'s remove ("x") button only rendered when `data.projectTeam.length > 1`, so the last remaining team member row could never be removed through the UI -- a soft, undocumented restriction with no validation message, just a missing button.

- Removed the `length > 1` guard -- the remove button now always renders, including on the last row
- Verified against the real running app: removed the sole row down to zero team members, no crash, Step 3 renders normally afterward with an empty team list

**Rollback:** `git revert <this commit>`.

---

## 2026-08-21 -- v2.3.1: Blank the default Project Team entry

Same issue as the original Step 1 blank-defaults change, just missed at the time -- Step 2 always defaulted its first team member row to a fixed fake person ("James Smith, Project Coordinator, +44 7730 890403, First Aid, Working at Height") on every new document.

- `src/App.js`: `initialFormState.projectTeam`'s default entry now `{id: '1', name: '', role: '', phone: '', email: '', competencies: ''}` instead of the hardcoded values
- Verified against the real running app: all five fields (name, role, competencies, phone, email) confirmed blank on Step 2 for a fresh document

**Rollback:** `git revert <this commit>`.

---

## 2026-08-21 -- v2.3.0: Fix the real root cause of team-member/risk-assessment data loss

Found while investigating why `teamMembers` and `riskAssessments` were empty in production (see `HANDOVER_RAMS.md` for the full incident writeup): two pre-existing bugs, not introduced this session, where a button that looked like "remove from my document" actually permanently deleted shared, company-wide reference data.

- **`removeTeamMember`** (the "x" on Step 2's Project Team list): was calling `deleteDoc` on the shared `teamMembers/{id}` record, not just removing the person from the current document. Fixed to be purely local -- `setFormData` only, no Firestore call at all.
- **New "Manage Team Members" panel** next to the "Add Existing Team Member" dropdown -- this is where the real, deliberate, global add/edit/delete now lives, with an honest confirm dialog ("Permanently delete ... from the company team list? This removes them from every future RAMS document and cannot be undone.") instead of the vague wording the old button had.
- **`handleDeleteHazard`** (the "Delete" button per hazard in Step 4): overwrote the entire shared `riskAssessments/{category}` document, permanently removing that hazard company-wide, while the checkbox right next to it (which correctly, safely excludes a hazard from just the current document) was already implemented properly. Fix here was just honest labeling -- reworded the confirm dialog and button ("Delete" -> "Delete Permanently") to say what it actually does, since the safe local alternative already existed and didn't need to be built.
- Verified end-to-end against the real running app: confirmed the "x" no longer touches Firestore, confirmed the new Manage panel's edit and permanent-delete both work and are clearly labeled, confirmed the new hazard-delete wording is present in the production build.

**Rollback:** `git revert <this commit>` -- reintroduces both bugs. Only do this if the fix itself causes an unrelated problem; the bugs it removes are real and already confirmed to have caused production data loss.

---

## 2026-08-20 -- Investigation: suspected production data loss (unresolved)

No code changed -- investigation only, documented per this repo's convention of recording sessions even when nothing gets committed. Full detail in `HANDOVER_RAMS.md` (§Current State, §Outstanding).

User reported the "Add Existing Team Member" dropdown empty on the live site, where it previously showed real staff. Checked directly against the real `rams-generator-bdcb7` project (not assumed):
- A known real document (shareCode `fsgopx8muow8c7`) now 404s via the app's own Admin-SDK-backed public share API -- confirms real data loss, not a permission/display bug
- `teamMembers`, `jobTemplates`, `riskAssessments`, `ramsDocuments` all read back empty via direct unauthenticated REST checks; `standardTasks` returns real data via the identical method -- rules out a blanket rules/auth explanation (a rules change would block everything equally, not selectively)
- No Firestore error appears in the browser console -- the app's own fetch `catch` block never fired, consistent with reads succeeding and genuinely coming back empty
- Ruled out, with reasoning: this session's Admin SDK scripts (sandbox-only service account, hard IAM boundary, cannot touch the real project) and any stray commit shipping sandbox config to production (every commit used explicit file lists, `src/firebase.js` never among them, checked directly)

Root cause not found. Recovery path not yet started (Firestore backups / Point-in-Time Recovery on `rams-generator-bdcb7`, needs real console access). **Explicitly deferred by user request** -- do not resume without checking in first.

**Rollback:** N/A -- nothing was changed, this is a documentation-only entry recording an open investigation.

---

## 2026-08-20 -- v2.2.0: Engineer assignment + sign-off acceptance

Request: assign a RAMS to the engineers doing the install, and let them acknowledge/accept it. Engineers confirmed to be existing UCtel staff with individual Google Workspace logins via the UCtel Portal (not external subcontractors) -- so acceptance can be gated by the already-authenticated `currentUser`, no new auth work needed.

**Data model (schemaless additions, no migration needed):**
- `teamMembers`: added `email` (previously absent entirely)
- RAMS documents: added `assignedEngineers: [{id, name, email}]` and `assignedEngineerEmails: string[]` (computed from `projectTeam` on every save, top-level like the existing `client`/`siteAddress` summary fields, for the same reason -- cheap to read without parsing nested `formData`), and `acceptances: {}` (initialized once at document creation only, never touched by the update path, so re-saving a document never wipes existing sign-offs)
- `acceptances` is keyed by **team-member id, not email** -- email addresses contain `.`, which Firestore's dot-notation `updateDoc` field paths treat as a nested-path separator, so `acceptances.a@b.co.uk` would not do what it looks like. Plain numeric-string ids have no such character, so they're safe.

**Step 2 (Project Team):**
- New Email field per team member row
- New "Requires sign-off" checkbox per row -- marks that member as needing to accept this specific RAMS (a per-document flag, deliberately *not* written to the shared global `teamMembers` record the way name/role/phone/email already are, since "must sign this RAMS" isn't a persistent fact about a person)

**New page `/assigned`** ("Assigned RAMS"), gated by portal login same as the existing `/saved` page:
- Lists RAMS where `assignedEngineerEmails` contains `currentUser.email` (filtered client-side from `useAllRamsDocuments`, matching this app's existing fetch-then-filter style rather than a Firestore query -- avoids needing a composite index)
- Split Pending / Accepted per document
- Opening a pending one fetches the full document on demand and renders it read-only via the existing `PrintableDocument` component (same renderer the customer share view already uses), with a typed-name signature field pre-filled from the engineer's own team-member name, and an "Acknowledge & Accept" button
- Accepting writes into `acceptances.{memberId}` via `updateDoc`'s dot-notation path -- touches only that one nested key, leaves other engineers' acceptances on the same document untouched
- Re-opening an already-accepted document shows the recorded signer name + timestamp instead of the form

**Deliberately kept simple:** sign-off is a typed name only, not the full typed/image-upload signature toggle already built for Step 1 -- narrower than what exists elsewhere in the app, but matches what was actually asked for; can be extended later.

**Known limitation, explicitly deferred by request ("we'll get to it later"):** Firestore rules currently allow any authenticated UCtel staff member to write anything (the app's existing "team shared" model -- not something this feature makes worse). Nothing at the database level stops someone from writing a fake acceptance under another person's name via a direct write; the UI only ever signs under the current logged-in user's own identity, which is an app-level constraint, not a database-enforced one.

**Verified end-to-end against the real running app** (not just a build check): assigned a test engineer via Step 2, saved, confirmed the document appeared as Pending on `/assigned` for that exact logged-in identity (had to add `RAMS_DEV_PORTAL_EMAIL` to `.env.local` so the dev-bypass session carries a real email to match against), reviewed the actual rendered document, signed, confirmed the status flipped to Accepted and re-opening showed the correct recorded signer name. Test data cleaned up from the sandbox project afterward.

**Rollback:** `git revert <this commit>`.

---

## 2026-08-20 -- v2.1.0: Edit/delete for standard tasks, PPE, Tools, Materials

Request: "I'd also like to be able to edit and delete these and everything within the Personal Protective Equipment (PPE), Plant / Equipment / Tools and Materials sections also."

**PPE / Tools / Materials (Step 6), and Permits (Step5, same shared component):**
- `src/components/ui/SelectableList.js`: `canEditItem`/`canDeleteItem` required `item.isCustom` -- edit/delete already existed and were already wired at every call site, just invisible for anything not added as a custom item during the current session. Dropped the `isCustom` requirement so it applies to every item.
- Confirm-dialog text "Remove this custom item?" -> "Remove this item?", since it's no longer custom-only.
- Verified against a real non-custom item seeded directly into Firestore (simulating an actual default/seeded item, not a testing artifact) -- Edit/Delete now appear and both work correctly.
- Side effect, flagged not hidden: Permits (Step5) shares this exact component and gains the same capability automatically, even though only PPE/Tools/Materials were named in the request.

**Standard tasks (Step 3, "Configure & Order Sequence of Works"):**
- Previously create-only. New `EditTaskForm` component (mirrors `NewTaskForm`), new `handleUpdateStandardTask`/`handleDeleteStandardTask` handlers in `App.js`.
- Edit updates `title` + the task's `options.default.description` only -- does not touch per-document task descriptions already customized in the RAMS currently being built (those are independent, user-edited text, not meant to be silently overwritten by a master-task edit).
- Delete removes the `standardTasks` doc and also drops any now-orphaned entries from the current document's `selectedTasks` (the existing code already rendered `null` for a missing task definition rather than crashing, but left a dead array entry -- now cleaned up).
- Found and deliberately left alone: the existing "Update Default" button on each task is a separate, seemingly incomplete pre-existing feature -- it only writes to local React state (never Firestore) and sets a `defaultDescription` field nothing else reads. Not in scope for this change.
- Verified end-to-end against the real running app: created a task, edited it, deleted it, confirmed removal.

**Rollback:** `git revert <this commit>`.

---

## 2026-08-20 -- v2.0.9: Add job template editing

Follow-up to v2.0.8 (template deletion) -- there was still no way to fix a typo or update a template's description without deleting and recreating it (losing the ID in the process).

- `src/App.js`: new `EditTemplateForm` component (mirrors `NewTemplateForm`'s style) -- pre-fills name/description, shows the ID read-only (it's the Firestore doc key, not user-facing; renaming is out of scope)
- New `handleUpdateTemplate(id, { name, description })` -- `setDoc` with `merge: true` (preserves `taskIds`), updates local state, syncs `formData.projectDescription` if the edited template is the active selection
- "Edit Template" button added next to "Delete Template" (same visibility guard: real template selected, not the empty/`--add-new--` state)
- Switching templates or deleting one now also closes the edit form if it was open, so it can't show stale data for a template that's no longer selected/no longer exists
- Verified end-to-end against the real running app: created a template, edited its name and description, confirmed the dropdown reflected the new name and the form closed on save, then cleaned up via delete

**Rollback:** `git revert <this commit>`.

---

## 2026-08-20 -- v2.0.8: Add job template deletion

Change request: "there is currently no straightforward way for the user to remove templates that are obsolete, duplicated, incorrectly created or no longer required... increases the possibility of an inappropriate or outdated template being selected."

- `src/App.js`: new `handleDeleteTemplate(templateKey)` -- deletes the Firestore `jobTemplates/{id}` doc, updates local `allTemplates` state, and if the deleted template was the currently active selection, falls back to the next remaining template (blank if none left) so the form never points at a deleted key
- Step 3's template dropdown gets a "Delete Template" button next to it, only rendered when a real template (not the empty state or the `--add-new--` sentinel) is selected -- guarded by a `window.confirm` naming the template, since this is a permanent delete unlike this codebase's other list-item removals which don't confirm
- Verified end-to-end against the real running app (not just a build check): created a test template through the existing "+ Add New Template..." flow, deleted it via the new button, handled the real confirm dialog, confirmed it's gone from both the dropdown and Firestore

**Rollback:** `git revert <this commit>`.

---

## 2026-08-20 -- Blank Step 1 (Project Details) fields by default

Change request: "RAMS must be specific to the individual site and project. Pre-populated or default project information creates a risk that details from a previous or generic project could be carried into a new RAMS document without being properly reviewed."

Every new document previously defaulted to a fixed fake project: client "iQ Student Accommodation", site "120 Longwood Close, Coventry", dated September 2025, prepared by "James Smith" with a specific hardcoded email/phone -- all silently carried into every new RAMS unless manually cleared first.

- `src/App.js`: `client`, `siteAddress`, `commencementDate`, `estimatedCompletionDate`, `preparedBy`, `preparedByEmail`, `preparedByPhone` now default to `''` instead of hardcoded values
- Deliberately left unchanged: `hoursOfWork` (generic 08:00-17:00 default, not project-identifying), `documentCreationDate` (already dynamic, defaults to today), `revisionNumber` (sensible default of `'1'`)
- **Related but out of scope:** Step 2's default `projectTeam` entry still hardcodes "James Smith, Project Coordinator" -- same underlying issue, a different step, not touched by this change

**Rollback:** `git revert <this commit>` restores the hardcoded defaults.

---

## 2026-08-20 -- Tighten Firestore security rules

`firestore.rules` was `allow read, write: if true` for every collection -- anyone who inspected the public Firebase client config (visible by design in the committed JS bundle) could read, write, or delete any RAMS document or reference list directly, completely bypassing UCtel Portal login.

- Changed to `allow read, write: if request.auth != null` -- every legitimate client write already happens after portal login -> Firebase custom token -> `signInWithCustomToken()`, so this has zero functional impact on real usage
- Confirmed the public share page (`ShareView.js`) never touches Firestore directly -- it fetches via `api/get-rams-share.js`, which uses the Admin SDK server-side and bypasses security rules entirely, so it's unaffected either way
- Verified against a real Firestore rules emulator (`@firebase/rules-unit-testing`, installed temporarily with `--no-save`, not committed to `package.json`): unauthenticated read/write correctly blocked (`PERMISSION_DENIED`), authenticated read/write correctly allowed, tested against both `ramsDocuments` and a reference collection (`standardTasks`)
- **Not yet deployed to the real `rams-generator-bdcb7` Firebase project** -- this session only has credentials for the throwaway `uctel-projects-sandbox` project used for local testing. Someone with console/CLI access to `rams-generator-bdcb7` needs to run `firebase deploy --only firestore:rules` (or grant access so it can be run directly). The rule change sitting in git does nothing on its own until that deploy happens.

**Rollback:** `git revert <this commit>` restores `if true` -- only do this if the tightened rule breaks something unexpected; re-check against the emulator test above first, since the change was verified to have zero functional impact on documented usage.

---

## 2026-08-20 -- v2.0.6: Remove auto-versioning (shallow-clone bug), first production deploy

The app went live at https://rams-six.vercel.app this session (via PR #2 -> `dj-iv/rams:main`, commit `90d66ec`). Once live, the footer showed `v0.0.18` instead of the real version -- traced to `scripts/sync-version.js` computing version as `0.0.{git rev-list --count HEAD}`, which is accurate in a full local clone but silently wrong under Vercel's shallow git checkout (confirmed: true count from a full clone was 52, Vercel's shallow clone only saw enough history to compute 18). The command doesn't fail in a shallow clone, it just returns incomplete data, so the earlier "keep existing version if git is unavailable" safety net never triggered.

- Deleted `scripts/sync-version.js`, `scripts/hooks/pre-commit`, generated `src/version.js`
- Removed `prepare`, `prestart`, `prebuild`, `version-sync` from `package.json` scripts
- `package.json` `version` is now a plain hand-bumped field (`2.0.6`), no longer git-derived
- Added committed `.env` with `REACT_APP_VERSION=$npm_package_version` -- CRA's own documented dotenv-expand pattern; npm sets `npm_package_version` automatically from `package.json` on every `npm run`, so no custom script is needed at all
- Un-ignored plain `.env` in `.gitignore` (was previously ignoring it alongside `.env.local`, which is non-standard CRA convention -- `.env` is meant to hold committed shared defaults, `.env.local` for private overrides)
- `src/App.js`: footer now reads `process.env.REACT_APP_VERSION` instead of importing a generated `./version` module
- Verified locally: `"2.0.6"` confirmed present in both the `npm start` dev bundle and a real `npm run build` output before committing

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
