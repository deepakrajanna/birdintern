# Bird Records — multi-user app on Google Sheets

A Next.js app for processing bird ringing/recovery records. Three roles: interns claim records and copy them into Avifauna, supervisors review submissions, the admin handles blockers. Auth is Google sign-in (any Google account, gated by a `users` tab in the Sheet). Data lives in a Google Sheet you own.

## Stack

- Next.js 14 (App Router) + TypeScript
- NextAuth (Google provider, JWT sessions)
- `googleapis` for Sheets read/write via a service account
- Tailwind CSS

## How it fits together

```
User → Google sign-in → NextAuth checks `users` tab → role attached to session
       → /intern   (claim, work, submit)
       → /supervisor (review queue, Checked/Revert)
       → /admin   (blocked queue, edit + resolve)
```

All data — the records themselves, who's claimed what, audit log — lives in one Google Sheet. The app reads/writes it through a service account you control.

## Setup

### 1. Prepare the Sheet

See [`docs/sheet-setup.md`](docs/sheet-setup.md). Add the 14 workflow columns to your existing `records` tab and create `users` + `audit_log` tabs.

### 2. Create a Google Cloud project

If you don't have one already:

1. Go to <https://console.cloud.google.com> and create a new project.
2. Enable the **Google Sheets API**: *APIs & Services → Library → Google Sheets API → Enable*.

### 3. Create the OAuth client (for user sign-in)

1. *APIs & Services → OAuth consent screen.* Choose **External**, fill in app name + your email. You can leave it in Testing mode and add the user emails you want to allow under "Test users" — or publish it later.
2. *APIs & Services → Credentials → Create credentials → OAuth client ID.*
3. Application type: **Web application**.
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - (later) `https://your-prod-domain.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client secret** into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 4. Create the service account (for Sheets access)

1. *IAM & Admin → Service Accounts → Create service account.* Name it something like `bird-app`.
2. Skip the optional grant steps.
3. Open the new account → **Keys → Add key → Create new key → JSON**. A JSON file downloads.
4. Open the JSON. Copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `.env.local`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_KEY` in `.env.local` (keep the `\n` escapes; the app normalizes them)
5. **Share your Google Sheet with that service account email** as Editor. Without this, the app can't read or write the Sheet.

### 5. Configure env

```bash
cp .env.example .env.local
# Fill in the values from steps 3, 4, and your Sheet's URL.
# NEXTAUTH_SECRET: openssl rand -base64 32
```

### 6. Install + run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in with the Google account you added to the `users` tab as admin, and you should land on `/admin`.

## Project layout

```
src/
  app/
    page.tsx                       # login
    intern/                        # intern landing + record page
    supervisor/                    # supervisor queue + inspect
    admin/                         # admin blocked queue + resolve
    api/
      auth/[...nextauth]/          # NextAuth handler
      intern/{claim,submit}/       # claim a record, save status
      supervisor/review/           # Checked / Revert
      admin/resolve/               # admin resolves a blocked record
  components/
    Nav.tsx, RecordView.tsx, SessionProvider.tsx
  lib/
    auth.ts        # NextAuth options (signIn gate against users tab)
    sheets.ts      # Sheets API singleton + read/append/update helpers
    users.ts       # users tab access (cached)
    records.ts     # claim, submit, review, resolve, stats
    audit.ts       # append-only audit log
    lock.ts        # in-process mutex serializing the claim path
    types.ts       # shared types
  middleware.ts    # role-based route guards
```

## Workflow recap

```
unassigned
  → intern claims  → claimed
                       │
                       ├─ Copied to Avifauna ─┐
                       ├─ Duplicate ──────────┤── submitted_to_supervisor
                       │                      │     │
                       │                      │     ├─ Checked → approved (terminal)
                       │                      │     └─ Reverted → unassigned (back to pool)
                       │
                       └─ Blocked → blocked_admin_queue
                                      │
                                      └─ Admin resolves → unassigned
```

## Things you'll probably want to tweak

- **Supervisor permissions on intern routes.** `middleware.ts` currently lets supervisors and admins hit `/intern/*` (handy for testing, can be tightened).
- **Stats definition.** `computeInternStats` in `lib/records.ts` defines "worked on" and "approved" — easy to change.
- **Concurrency.** `lib/lock.ts` is an in-process mutex. Fine for 3-4 concurrent users on a single Vercel instance. If you ever spread across multiple instances, swap for an Upstash Redis lock.
- **UI.** Plain Tailwind, no component library. If you want fancier components, run `npx shadcn-ui@latest init` and replace the inline `<button>`/`<input>` markup as you go.

## Deploying to Vercel

1. Push to a GitHub repo.
2. Import the repo in Vercel.
3. Set the same env vars in Project Settings → Environment Variables. For `GOOGLE_SERVICE_ACCOUNT_KEY`, paste the full key including `\n` escapes — Vercel preserves them.
4. Set `NEXTAUTH_URL` to your Vercel URL.
5. Add the production callback URL to your OAuth client (step 3 above).
