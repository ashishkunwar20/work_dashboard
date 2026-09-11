# Shafts Team Package Dashboard

A simple, self-contained dashboard for tracking construction packages and the actions/tasks
you're chasing on each one — built for the Align JV (HS2) Shafts Team, but works for any
package-based work.

## Features

- **By Package view** — every package as a card with a progress bar and status chips
  (overdue / waiting on others / blocked). Expand a card to see all its tasks.
- **Chasing view** — every task across all packages currently "Waiting on Others", so you
  can see everything you need to chase in one list.
- **Overdue view** — every task past its due date, regardless of package.
- **Search & filters** — filter by status, priority, or free-text search across tasks,
  notes, people, and package names.
- **Add / edit / delete** packages and tasks via simple forms.
- **Export / Import** — data is stored in your browser (localStorage). Use Export to
  download a JSON backup, and Import to restore it (e.g. on another device or browser).

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
