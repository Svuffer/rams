# Changelog — RAMS Generator

All entries newest-first. Every entry includes a **Rollback** line.

---

## 2026-06-30 — Add version display to page footer

- Imported `version` from `package.json` in `src/App.js` (SEC 100)
- Added `<footer>` element to main app page rendering `v{version}` (SEC 1100)
- Version in footer now stays in sync with `package.json` automatically

**Rollback:** `git revert 114436d` on the `develop` branch.

---



- Repo cloned from `github.com/dj-iv/rams` to `c:/_VSC/UCtel_Portal/rams`
- Created `develop` branch for all ongoing development
- Created `HANDOVER.md` (master index), `HANDOVER_RAMS.md` (project handover), `CHANGELOG_RAMS.md` (this file)
- Added SEC section markers to 10 source files over 200 lines:
  - `src/App.js` (2667 lines — SEC 100–1300)
  - `src/components/PrintableDocument.js` (~1059 lines — SEC 100–1100)
  - `src/components/ShareView.js` (240 lines — SEC 100–400)
  - `src/components/PreviewModal.js` (219 lines — SEC 100–300)
  - `src/components/steps/Step4.js` (276 lines — SEC 100–400)
  - `src/components/steps/Step5.js` (239 lines — SEC 100–300)
  - `src/pages/SavedRamsPage.js` (288 lines — SEC 100–400)
  - `api/session.js` (278 lines — SEC 100–400)
  - `api/generate-pdf.js` (257 lines — SEC 100–400)
  - `api/utils/portalAuth.js` (250 lines — SEC 100–500)
- No functional code changes — documentation only

**Rollback:** `git revert HEAD` on the `develop` branch removes all documentation files and SEC markers in a single safe commit. No data or config was changed.
