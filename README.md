# RAMS Generator v2.3.3

A React + Firebase app for building, sharing, and tracking sign-off on Risk Assessment and Method Statement (RAMS) documents for UCtel installation work. Part of the UCtel Portal ecosystem — deployed at [rams.uctel.co.uk](https://rams.uctel.co.uk).

## What it does

The generator walks a user through a 7-step wizard and produces a printable, shareable RAMS document backed by Firestore:

1. **Project Details** — client, site, and job information
2. **Project Team** — add team members from a saved company directory or type new ones inline; assign which engineers must sign off on the document
3. **Build Method Statement** — the sequence of work tasks, built from reusable job templates and standard tasks or written freeform
4. **Identify Risks** — pick hazards from a shared, company-wide risk library (with likelihood/severity scoring) or exclude specific ones per document
5. **Safety & Logistics** — site-specific safety and logistics notes
6. **Equipment & Materials** — PPE, plant/tools, and materials, drawn from reusable master lists
7. **Review & Generate** — final review, PDF/print output, and save/share

Saved documents live in Firestore and can be:
- Browsed and reopened from the **Saved RAMS** page
- Assigned to specific engineers, who see them under **Assigned RAMS** and must review and type-sign to accept before starting work
- Shared externally via a read-only link (`ShareView`)

Team members, job templates, standard tasks, hazards, PPE, tools, and materials are all managed as shared master lists — editing or deleting an entry from its management panel updates it everywhere; removing a person or item from a single document's form only affects that document.

## Authentication

In production, the app authenticates through the UCtel Portal: the portal hands off a signed token, which is exchanged for a Firebase custom token via `signInWithCustomToken()`. There is no separate RAMS login — access is controlled by UCtel Google Workspace sign-in at the portal level.

For local development without a running portal, set `RAMS_DEV_PORTAL_BYPASS=true` (see below) to skip the handshake and sign in as a fixed test user.

## Environment

Create an `.env.local` file (gitignored) in the project root. It is **not** committed and must be created locally or pulled from a team member/secrets manager — it holds real Firebase Admin credentials.

```bash
# Portal handshake (production auth)
PORTAL_SIGNING_SECRET=matching_secret_from_portal
REACT_APP_PORTAL_URL=https://portal.yourdomain.co.uk
PORTAL_URL=https://portal.yourdomain.co.uk

# Firebase Admin access for the API shim (inline keys or a JSON service account file)
RAMS_FIREBASE_PROJECT_ID=your-project-id
RAMS_FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
RAMS_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# or point to a JSON file instead
RAMS_FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json

RAMS_API_PORT=3101
RAMS_API_ORIGIN=http://localhost:3101
REACT_APP_RAMS_API_ORIGIN=http://localhost:3101

# Optional: skip the UCtel portal handshake for local development
RAMS_DEV_PORTAL_BYPASS=true
RAMS_DEV_PORTAL_UID=rams-dev-user
RAMS_DEV_PORTAL_EMAIL=dev.user@uctel.co.uk
RAMS_DEV_PORTAL_NAME=RAMS Dev User
```

The client-side Firestore config in `src/firebase.js` is a public web API key (safe to have in the bundle by design — access is controlled by Firestore security rules, not by the key's secrecy). Point it at a sandbox Firebase project instead of production when testing changes that write data.

### Local development

Run both the React dev server and the lightweight API shim with:

```bash
npm run dev
```

This starts the API on `http://localhost:3101` (configurable via `RAMS_API_PORT`) and the React dev server on `http://localhost:3304`, proxying `/api/*` calls automatically. To run them separately:

```bash
npm run serve-api   # API shim only, defaults to port 3101
npm start           # CRA dev server on port 3304
```

The app shows a setup warning if the dev API is unreachable.

## Available scripts

- `npm run dev` — run the API shim and the CRA dev server together
- `npm start` — CRA dev server only (`http://localhost:3304`)
- `npm run serve-api` — API shim only (`http://localhost:3101`)
- `npm run build` — production build to `build/`, with `REACT_APP_VERSION` injected from `package.json`'s version field
- `npm test` — CRA/Jest test runner

## Deployment

The app deploys to Vercel from the `dj-iv/rams` repository. Merges to `main` trigger a Vercel build automatically; on the Hobby plan, Vercel only auto-deploys commits authored by an identity with project access, so a merge commit from an outside contributor needs a small follow-up commit from a team member to actually trigger the deploy.

See `HANDOVER_RAMS.md` for the full architecture writeup, known issues, and change history, and `CHANGELOG_RAMS.md` for the detailed version-by-version changelog.
