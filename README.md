# Python Debug Exercises

A tiny, dependency-free set of static web pages for embedding runnable Python
"fix the bug" exercises into a website (e.g. Google Sites). Students write
and run real Python in the browser using [Pyodide](https://pyodide.org/) —
no server, account, or install required.

- **`index.html`** — the exercise player students see and interact with.
- **`exercises.json`** — every exercise (title, instructions, starter code, hint).
- **`editor.html` / `editor.js` / `editor.css`** — a simple local tool for
  teachers to create, read, update and delete exercises without hand-editing JSON.

## How it works

`index.html` reads an `exercise` key from its own URL and loads the matching
entry from `exercises.json`, which sits next to it in the same folder:

```
index.html?exercise=debug01
```

If no `exercise` parameter is given, it falls back to the `"default"` entry.
Students edit the code in a Monaco editor, click **Run**, and see output (and
Python tracebacks) in the browser — Pyodide runs Python entirely client-side.

## 1. Fork and host it

1. Fork/clone this repo.
2. In GitHub, go to **Settings → Pages** and set the source to your default
   branch (root folder). GitHub Pages will serve the files as static HTML —
   no build step needed.
3. Your site will be available at something like:
   `https://<your-username>.github.io/<repo-name>/index.html`

Any static host works (GitHub Pages, Netlify, your school's web host, etc.) —
just make sure `index.html` and `exercises.json` stay in the same folder.

## 2. Embed an exercise in Google Sites

1. Open your Google Site and go to the page you want the exercise on.
2. In the right-hand **Insert** panel, choose **Embed**.
3. Choose **By URL** and paste your hosted page with the exercise you want, e.g.:
   ```
   https://<your-username>.github.io/<repo-name>/index.html?exercise=debug03
   ```
4. Click **Insert**. Google Sites will embed it in an `<iframe>`.
5. Resize the embedded frame in the Sites editor so the editor and output
   area aren't cramped (roughly 700–900px tall works well).
6. Repeat on a new page/section for each exercise, just changing the
   `exercise=` value in the URL.

Because everything runs client-side, no data is sent anywhere — each student
gets their own private, in-browser Python session.

## 3. Create/edit/delete exercises with `editor.html`

`editor.html` is a small standalone page for managing `exercises.json` — you
don't need to hand-write JSON.

1. Open `editor.html` directly in **Chrome or Edge** (double-click the file,
   or visit it on your hosted site). Chromium-based browsers can save changes
   straight back to disk; other browsers can still open/view but will
   download an updated copy instead of saving in place.
2. Click **Open exercises.json** and select the `exercises.json` file from
   your local clone of the repo.
3. Use the sidebar to:
   - **View/Edit** — click an exercise to load it into the form (key, title,
     instructions, code, hint). Edits are applied as you type.
   - **Create** — click **+ New Exercise**, enter a unique key (e.g. `debug41`).
   - **Delete** — select an exercise and click **Delete Exercise**.
4. Click **Save** to write the changes back to `exercises.json` on disk.
   The next time you open `editor.html`, it will try to reload the same file
   automatically (Chrome/Edge remember the file permission), so you usually
   won't need to click **Open** again.
5. Commit and push the updated `exercises.json` to your repo so the hosted
   site (and any Google Sites embeds) picks up the changes.

### Exercise JSON format

Each exercise is a key in `exercises.json` mapping to an object:

```json
"debug01": {
  "title": "Debug 1",
  "instructions": "This program contains a mistake. Run it, read the error message carefully, and fix the program.",
  "code": "name = \"Sam\"\nprint(\"Hello\", nmae)",
  "hint": "Look carefully at the names used in the program."
}
```

| Field          | Purpose                                                        |
|----------------|------------------------------------------------------------------|
| `title`        | Shown as the exercise heading.                                  |
| `instructions` | Shown above the code editor, explains what to do.                |
| `code`         | The starter code loaded into the editor (`\n` for new lines).    |
| `hint`         | Optional hint text shown to students; leave `""` for no hint.    |

The key (e.g. `debug01`) is what you put in the URL as `?exercise=debug01`,
so keep it short and URL-safe (letters, numbers, underscores).

## License

Public domain — see [LICENSE.md](LICENSE.md) (CC0). Use, modify, and share
freely with no attribution required.
