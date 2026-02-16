<h1 align="center">whoop-tui</h1>
<p align="center">
  A clean TypeScript terminal app for viewing your <strong>WHOOP</strong> metrics.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img alt="Node" src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-black" />
</p>

---

## ✨ What it does

`whoop-tui` lets you authenticate with your WHOOP account and inspect key metrics directly in the terminal:

- 😴 **Sleep** (performance, efficiency, sleep stages)
- 💚 **Recovery** (recovery score, RHR, HRV, SpO2)
- ⚡ **Strain** (cycle strain, avg/max heart rate)
- 👤 **Profile** (basic user info)

No database, no web app, no fluff — just terminal + local config.

---

## 🧱 Built with

- **TypeScript**
- **Node.js**
- [`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts) for terminal UI
- WHOOP OAuth2 Authorization Code + PKCE

---

## 🚀 Quick start

### 1) Clone and install

```bash
git clone https://github.com/zachgodsell93/whoop-tui.git
cd whoop-tui
npm install
```

### 2) Create a WHOOP developer app

- Go to: https://developer.whoop.com/
- Create an OAuth app
- Add this redirect URI (or your custom one):
  - `http://127.0.0.1:8787/callback`

### 3) Run

```bash
npm run dev
```

On first launch, the app will ask for:
- OAuth Client ID
- OAuth Client Secret (optional for PKCE-only setup)
- Redirect URI

Then it opens your browser for WHOOP login.

---

## 🗂 Local storage

App data is stored locally in:

```text
~/.whoop-tui/
├── config.json   # OAuth client settings
└── token.json    # access/refresh token
```

No external database is used.

---

## 🔐 Scopes requested

By default, the app requests:

- `read:profile`
- `read:sleep`
- `read:recovery`
- `read:cycles`

---

## 🖥 Menu actions

- **Login / Refresh session**
- **View profile**
- **View sleep data**
- **View recovery data**
- **View strain (cycle) data**
- **Update OAuth config**
- **Logout** (clears local token)

---

## 📜 Scripts

```bash
npm run dev    # run in development with tsx
npm run build  # compile TypeScript to dist/
npm start      # run app with tsx
```

---

## ⚠️ Notes

- Keep your WHOOP OAuth credentials private.
- `token.json` contains sensitive auth data — do not commit/share it.
- If your token expires, refresh is handled automatically when possible.

---

## 🛣 Roadmap ideas

- Date range filters
- Better table/card UI formatting
- CSV export
- Optional trend summaries

---

## 📄 License

MIT — see [LICENSE](./LICENSE).
