# Shafts Team Package Dashboard

A simple, self-contained dashboard for tracking construction packages and the actions/tasks
you're chasing on each one — built for the Align JV (HS2) Shafts Team, but works for any
package-based work.

## Features

- **By Package view** — every package as a card with a progress bar and status chips
  (overdue / waiting on others / blocked). Expand a card to see all its tasks.
- **Action With view** — every task across all packages currently "Waiting on Others", so
  you can see everything you need to chase in one list.
- **Overdue view** — every task past its due date, regardless of package.
- **Action With dropdown** — pick who a task sits with from a running list of names/companies
  instead of retyping them; add a new one inline the first time you need it.
- **Search & filters** — filter by status, priority, or free-text search across tasks,
  notes, people, and package names.
- **Add / edit / delete** packages and tasks via simple forms.
- **Export / Import** — data is stored in your browser (localStorage) as a fallback, and
  saved to your Claude account automatically when run as a Claude Artifact (see below).
  Use Export any time to download a JSON backup, and Import to restore it.

## Saving to your account

When this dashboard is opened as a Claude Artifact (the published link), it saves your data
server-side in the background — the header shows "Saved to your account" once connected, so
it persists across browser sessions and devices on that artifact link and doesn't depend on
one browser's local storage. The artifact is private to your account, so this storage is
effectively yours alone. If opened as a plain static page instead (e.g. via GitHub Pages or
a local file), there's no account-linked storage available, so it falls back to browser
localStorage only, same as before — the header will show "Saved in this browser" in that
case.

## Running it

No build step or server required — just open `index.html` in a browser.

To serve it locally (recommended, avoids some browsers' restrictions on local files):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

You can also host it for free on GitHub Pages: enable Pages on this repo (Settings →
Pages → Deploy from branch), pointing at the branch/folder containing `index.html`.

## Customizing your data

The dashboard ships with example placeholder packages (Shaft 1/2/3) so you can see how it
works. Replace them with your real packages and tasks directly in the UI — click **Edit**
on a package card to rename/delete it, or **+ Add Package** / **+ Add task** to create new
ones. There's no need to touch the code.

## Data model

Each **package** has: name, code, description, status (On Track / At Risk / Delayed /
Complete), and a list of **tasks**.

Each **task** has: title, notes, who you're chasing / who it's assigned to, priority
(Low/Medium/High/Critical), status (Not Started / In Progress / Waiting on Others /
Blocked / Complete), and a due date. Overdue tasks are automatically highlighted in red.

## Files

- `index.html` — page structure and modal forms
- `css/style.css` — styling
- `js/app.js` — all app logic (state, rendering, persistence)
