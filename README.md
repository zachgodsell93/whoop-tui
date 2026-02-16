# whoop-tui

Terminal UI for WHOOP API data (sleep, recovery, strain) built in TypeScript.

## Features

- OAuth login in browser (Authorization Code + PKCE)
- Local token/config storage (`~/.whoop-tui`)
- Terminal menu for:
  - Profile
  - Sleep data
  - Recovery data
  - Strain (cycle) data
- No database required

## Setup

1. Create a WHOOP developer app: https://developer.whoop.com/
2. Add redirect URI (default used by app):
   - `http://127.0.0.1:8787/callback`
3. Install + run:

```bash
npm install
npm run dev
```

On first run, enter your WHOOP OAuth client details.

## Notes

- Token and config are stored locally with restrictive file permissions.
- Scopes requested by default:
  - `read:profile`
  - `read:sleep`
  - `read:recovery`
  - `read:cycles`

## Scripts

- `npm run dev` — run app with tsx
- `npm run build` — compile to `dist`
- `npm start` — run app with tsx
