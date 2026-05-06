# Google Sheet setup

The app expects three tabs in your Sheet: `records`, `users`, `audit_log`.

## 1. `records` tab

Keep all your existing CSV columns as-is in row 1 (`ID`, `Ring_concat`, `year_ringing`, ...). The app looks columns up by header name, so order doesn't matter.

Then add **14 new workflow columns** to the right of your existing data. The header row (row 1) needs these exact names:

```
assigned_to_email
assigned_to_name
assigned_at
intern_status
intern_remarks
intern_submitted_at
supervisor_email
supervisor_status
supervisor_remarks
supervisor_reviewed_at
last_revert_reason
last_revert_by
admin_resolution_note
state
```

Leave all of these empty for now. The app populates them as records move through the workflow.

> Tip: Set the `state` column to `unassigned` for every existing data row (drag-fill or paste). The app treats empty `state` the same as `unassigned`, but explicitly populating it makes the sheet easier to read at a glance.

## 2. `users` tab

Create a new tab called `users` with this header row:

| email | google_sub | name | role | active | added_at |
|-------|-----------|------|------|--------|----------|

- `email` (lowercase, exact match against the Google account)
- `google_sub` — leave blank for now (reserved for future use)
- `name` — display name
- `role` — one of `intern`, `supervisor`, `admin`
- `active` — `true` or `false`
- `added_at` — ISO timestamp or any date

Add yourself as the first row with `role=admin` and `active=true`. Add interns and supervisors here as you onboard them.

## 3. `audit_log` tab

Create a third tab called `audit_log` with this header row:

| timestamp | actor_email | action | record_id | details |
|-----------|------------|--------|-----------|---------|

Leave it empty. The app appends to it on every claim, submit, review, and admin resolve.

## 4. Share the sheet with the service account

After you create the service account in Google Cloud (see README), it will have an email address like `bird-app@your-project.iam.gserviceaccount.com`. Share the Sheet with that email and grant **Editor** access. The app uses this account for all reads and writes.
