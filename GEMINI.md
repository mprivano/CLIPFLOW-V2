# Gemini Instructions For ClipFlow

## Read This Before Editing

The visible ClipFlow app is not the React/TSX placeholder.

The live app is:

- `index.html` for static DOM structure
- `app.js` for browser UI rendering, state, and event wiring
- `styles.css` for visible styling
- `server.ts` for local backend/API routes

Do not create loose `.tsx` files for ClipFlow UI changes.
Do not edit `src/App.tsx`, `src/main.tsx`, or `ManualUpload.tsx` for visible UI changes unless you also prove that the current live app imports and renders them. In this project, they are placeholders and are not the visible ClipFlow workspace.

## How To Make Visible UI Changes

Before changing UI, inspect the existing render function in `app.js` and patch the real function that already builds that screen.

Important live render targets:

- Clip desk/cards: `renderClips()` in `app.js`
- Accounts: `renderAccounts()` and `renderVizardApiAccounts()` in `app.js`
- Videos/Vizard library: `renderVizardLibrary()` and `renderLibraryVideo()` in `app.js`
- Queue: `renderQueue()` in `app.js`
- Google Drive: `renderGDrive()` in `app.js`
- Publishing workspace: `renderPublishWorkspace()` in `app.js`
- Optimization workspace: `renderOptimizationWorkspace()` in `app.js`
- Analytics: `renderAnalyticsWorkspace()` in `app.js`
- Settings: `renderSettingsWorkspace()` in `app.js`

If a requested visual change is not showing in the browser, first check whether you edited an unused TSX file or invented a function name that does not exist in `app.js`.

## Verification Rules

- After editing `app.js`, `index.html`, or `styles.css`, refresh the browser.
- After editing `server.ts` or `.env`, restart ClipFlow.
- Before finishing, run:

```bash
node --check app.js
node --check server.ts
npm run build
```

## Secrets

Never expose API keys, service account JSON, passwords, tokens, or credential values in browser code.
Use server-side environment variables in `server.ts` for API calls.

