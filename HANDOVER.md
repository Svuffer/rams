# UCtel RAMS Generator — Master Handover Index

The RAMS Generator is a React/Node.js web application for creating, managing, and sharing Risk Assessment and Method Statement (RAMS) documents. It is part of the UCtel Portal ecosystem, authenticated via portal OAuth token exchange into Firebase Auth, with all data persisted in Firestore.

---

## Projects

| Project | Handover | Changelog | One-liner |
|---------|----------|-----------|-----------|
| RAMS Generator | [HANDOVER_RAMS.md](HANDOVER_RAMS.md) | [CHANGELOG_RAMS.md](CHANGELOG_RAMS.md) | Multi-step RAMS form → Firestore → shareable public link |

---

## Quick Reference

| Item | Value |
|------|-------|
| Firebase project | `rams-generator-bdcb7` |
| React dev port | `3304` |
| API dev port | `3101` |
| Production host | Vercel |
| Repo path (local) | `c:/_VSC/UCtel_Portal/rams` |
| Active branch | `develop` |

---

## Working Guidelines

These apply in every session. Full reference: `c:/_VSC/UCtel_Portal/UNIVERSAL_HANDOVER_TEMPLATE.md`

1. **Update handover + changelog at end of every session** where changes were made.
2. **Code map before any edit** — read the full file, identify exact edit point, note surrounding context.
3. **SEC markers** — files over ~200 lines carry embedded section markers (`[SEC NNN]`). `grep -n "SEC" <file>` gives instant structure.
4. **Surgical edits** — never `sed` on structured files; use the Edit tool with exact anchor strings.
5. **Ask then execute** — confirm risky/irreversible actions before proceeding.
6. **Dry-run before bulk operations** — show counts, confirm, then apply.

---

## Session Start Checklist

1. Read this file
2. Read `HANDOVER_RAMS.md` — current state, outstanding items
3. Check `c:/Users/Miroslav/.claude/projects/c---VSC-UCtel-Portal/memory/MEMORY.md`
4. Verify any file paths or function references before acting on them
