# Changelog -- RAMS Generator

All entries newest-first. Every entry includes a **Rollback** line.

---

## 2026-06-30 -- v0.0.47: Auto-sync version from git commit count

- Added `scripts/sync-version.js` -- sets `package.json` version to `0.0.{commit_count}`
  - `--next` flag: count + 1 (pre-commit hook, predicts post-commit version)
  - `--dry` flag: prints next version without writing (check before writing commit message)
- Wired `prestart` and `prebuild` npm hooks -- version syncs automatically on every start/build
- Added `.git/hooks/pre-commit` -- bumps and stages `package.json` before every commit
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
