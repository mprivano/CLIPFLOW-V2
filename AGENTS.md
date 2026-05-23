# ClipFlow Agent Instructions

This repository's visible app is the plain browser app in `index.html`, `app.js`, and `styles.css`, with backend routes in `server.ts`.

Do not implement visible ClipFlow UI changes in `src/App.tsx`, `src/main.tsx`, `ManualUpload.tsx`, or newly created loose TSX files. Those files are not the current live workspace UI.

When changing a visible screen, inspect and patch the existing `app.js` render function for that screen:

- Clip desk/cards: `renderClips()`
- Accounts: `renderAccounts()` / `renderVizardApiAccounts()`
- Videos library: `renderVizardLibrary()`
- Queue: `renderQueue()`
- Google Drive: `renderGDrive()`
- Publishing: `renderPublishWorkspace()`
- Optimization: `renderOptimizationWorkspace()`
- Analytics: `renderAnalyticsWorkspace()`
- Settings: `renderSettingsWorkspace()`

Use `styles.css` for reusable styling and `index.html` only for static structure or labels.
Use `server.ts` for backend/API behavior.

If a change does not appear, assume the wrong file or wrong render function was edited until proven otherwise.

