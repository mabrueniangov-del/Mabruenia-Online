# Mabruenia Online

## Run
1. Install Node.js (LTS).
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start`.

## Files
- `main.js`: BrowserWindow and IPC handlers.
- `preload.js`: narrow bridge for the custom window buttons.
- `index.html`: browser chrome and webview host.
- `renderer.js`: tabs, navigation, and localStorage bookmarks.
- `style.css`: XP/90s appearance.
- `welcome.html`: local homepage and editable bulletin.

The renderer uses context isolation and a preload bridge instead of enabling Node integration in the UI. The embedded web pages run in webviews without Node integration.
