# Firmware Portal

A firmware release-management and ticketing portal.

- **Roles:** one or more Admins, and Viewers.
- **Projects:** Production (old knob), Production (Current knob), Antunes, Dubai, AI, Life cycle testing — seeded automatically on first run. Admins can add more.
- **Releases:** Admin uploads a `.bin` + `.zip` + version + note. Files go to Google Drive (one sub-folder per project), named `<version>_<originalfilename>`.
- **4-stage approval pipeline** per release, shown as status lights:
  1. Firmware Team
  2. QC Team
  3. Kitchen Team
  4. Sandy Sir
  Each stage can be marked **passed** / **failed** with remarks. If **any** stage fails, the release shows as **Rejected** and nobody (except admin) can download it. Files only unlock for everyone once **all four stages have passed**.
- **Tickets:** anyone logged in can raise a ticket (designation, name, note, urgency, deadline). They get back a ticket ID (`TCK-00001`, ...) they can use to track status any time. Admin can list, update status (open / in progress / resolved / rejected) and add notes on any ticket.

---

## Stack

- **Backend:** Node.js + Express + PostgreSQL, JWT auth, file uploads via `multer`, storage in **Google Drive** via a service account (`googleapis`).
- **Frontend:** React + Vite (plain CSS, no framework lock-in), React Router.

```
firmware-portal/
├── backend/     Express API + Postgres schema + Google Drive integration
└── frontend/    React (Vite) single-page app
```

---

## 1. Prerequisites

- Node.js 18+
- A PostgreSQL server (local, Docker, or hosted e.g. Neon/Supabase/RDS)
- A Google Cloud project with a **service account** that has access to Drive

---

## 2. Google Drive setup (do this first)

Files are stored in Drive under one root folder, with an auto-created sub-folder per project.

There are two ways to authenticate, depending on what kind of Google account you have.

### Option A — Personal Gmail account (no Google Workspace) — recommended for most people

A bare service account has **0 bytes** of its own Drive storage and can't upload anywhere unless it's a Workspace Shared Drive. Since personal Gmail accounts can't create Shared Drives, the simplest fix is to authenticate as **yourself** via OAuth — uploads then count against your normal 15GB Google account storage.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create (or reuse) a project → **APIs & Services → Library** → enable the **Google Drive API**.
2. **APIs & Services → OAuth consent screen** → set it up as **External**, add your own Google account as a **test user** (this keeps the app unpublished/private, which is fine — no Google review needed).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Desktop app**. This gives you a **Client ID** and **Client Secret**.
4. In `backend/.env`, set:
   ```
   GOOGLE_OAUTH_CLIENT_ID=<your client id>
   GOOGLE_OAUTH_CLIENT_SECRET=<your client secret>
   ```
5. From the `backend` folder, run the one-time authorization helper:
   ```bash
   npm run get-refresh-token
   ```
   It prints a URL — open it, sign in with the Google account you want firmware stored in, click Allow. The script then prints a `GOOGLE_OAUTH_REFRESH_TOKEN=...` line — paste that into `backend/.env` too. You only need to do this once.
6. In Drive, create (or pick) a folder to be the root, e.g. "Firmware Portal". Copy its ID from the URL (`https://drive.google.com/drive/folders/<THIS_PART>`) into `GOOGLE_DRIVE_ROOT_FOLDER_ID` in `.env`. (You can also use `GOOGLE_DRIVE_ROOT_FOLDER_ID=root` to use the top level of your Drive.)

### Option B — Google Workspace account — service account + Shared Drive

If you're on a paid Workspace account, a service account works too:

1. In Google Cloud Console, enable the Drive API, then create a **Service Account** and download its JSON key.
2. Create a **Shared Drive** in Drive, add the service account's email (`...@...iam.gserviceaccount.com`) as a **Content Manager/Manager**.
3. Copy the Shared Drive's ID into `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
4. Place the downloaded key at `backend/google-service-account.json`, or paste its contents into `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` in `.env` — leave `GOOGLE_OAUTH_REFRESH_TOKEN` blank in this case, since the app prefers OAuth when both are set.

---

## 3. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env: DATABASE_URL, JWT_SECRET, GOOGLE_DRIVE_ROOT_FOLDER_ID, Google credentials, SEED_ADMIN_*
npm install
```

Create the database (adjust to your Postgres setup):

```bash
createdb firmware_portal
```

The schema (tables) and the 6 default projects are created automatically the first time the server starts — no manual migration step needed.

Create the first admin account:

```bash
npm run seed:admin
```

This reads `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`. Log in with those, then use **Admin → Users** in the app to create more admins/viewers (and change/retire the seed password).

Run the API:

```bash
npm start        # production
npm run dev       # auto-restart on changes
```

The API listens on `PORT` (default `4000`) under `/api/...`.

---

## 4. Frontend setup

```bash
cd frontend
npm install
```

By default the frontend calls `http://localhost:4000/api`. To point elsewhere, create `frontend/.env`:

```
VITE_API_BASE=https://your-api-domain.com/api
```

Run it:

```bash
npm run dev        # http://localhost:5173
npm run build      # production build in frontend/dist (serve as static files)
```

---

## 5. Deploying

- **Backend:** any Node host (Render, Railway, Fly.io, EC2, etc.) with a Postgres add-on/instance. Set all the `.env` values as environment variables there — for the Google key, use `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` (paste the whole JSON as one env var) rather than a file, since most PaaS hosts don't give you a persistent filesystem for secrets.
- **Frontend:** `npm run build` and serve `frontend/dist` from any static host (Vercel, Netlify, S3+CloudFront, or the backend itself via `express.static`). Set `VITE_API_BASE` to your backend's public URL at build time.
- **CORS_ORIGIN** on the backend must match the frontend's deployed URL.

---

## How the pieces fit together

- **Auth:** `POST /api/auth/login` returns a JWT; the frontend stores it in `localStorage` and sends `Authorization: Bearer <token>` on every request. Admin-only routes are protected both by frontend route guards and backend middleware (`requireAdmin`) — the backend is the real gate.
- **Releases & files:** uploading a release streams the two files straight from the multipart upload into Drive (temp files are cleaned up right after), then stores only the Drive **file IDs** in Postgres — Postgres never holds the binary data. Downloads are streamed back through the API (`/api/releases/:id/download/:type`) so access control (only after full approval) is enforced server-side, not just hidden in the UI.
- **Approval pipeline:** each release gets 4 `release_stages` rows on creation. Updating a stage recomputes the release's `overall_status` (`pending` → `approved` once all 4 pass, or `rejected` the moment any one fails).
- **Tickets:** `ticket_code` is generated from the Postgres sequence (`TCK-00001`, `TCK-00002`, ...) so it's guaranteed unique and sequential.

---

## Extending it later

- Add email/Slack notifications when a stage is updated or a ticket status changes.
- Add a "reason" history/audit trail per stage instead of overwriting remarks.
- Add per-project access control if you later want viewers restricted to specific projects.
