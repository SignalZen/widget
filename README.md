# SignalZen Widget

Embeddable customer support chat widget for [SignalZen](https://signalzen.com). Built with React 19, TypeScript, Vite, and Tailwind CSS v4. Compiles to a single self-contained IIFE (`signalzen.js`) that installs on any website via a one-line snippet.

## Architecture

| Path | Purpose |
|---|---|
| `src/widget/embed.tsx` | Widget entry point — mounts the React app into a Shadow DOM root |
| `src/components/signalzen/` | All widget UI components |
| `src/components/signalzen/screens/` | Individual screens (Welcome, AI Chat, etc.) |
| `vite.widget.config.ts` | Library build config — outputs `public/signalzen.js` |
| `public/index.html` | Hostile-CSS test page for local smoke-testing |

## Prerequisites

- Node.js 20+ or [Bun](https://bun.sh)
- Access to a running SignalZen backend (Rails API + Node API + ActionCable) — or point at the production API for read-only testing

## Setup

```bash
# Install dependencies
npm install          # or: bun install

# Copy and configure environment
cp .env.example .env.development
# Edit .env.development with your local backend URLs
```

## Development

```bash
# Watch-build the widget and serve the test page at http://localhost:8081
npm run dev:widget
```

This runs two processes in parallel:
- `build:widget:dev` — rebuilds `public/signalzen.js` on every source change
- `browser-sync` — serves `public/` and live-reloads on each rebuild

Open `http://localhost:8081` — the test page loads the widget using the local bundle.

## Building

```bash
# Production bundle → public/signalzen.js
npm run build:widget

# Development bundle with source maps (no minification)
npm run build:widget:dev
```

The built file is gitignored — do not commit it.

## Environment variables

All variables are prefixed `VITE_` and inlined at build time. See `.env.example` for documentation. Create `.env.development` for local dev and `.env.production` for production builds.

## Install snippet (production)

```html
<script type="text/javascript">
  var _sz = _sz || {};
  _sz.appId = "YOUR_APP_ID";
  (function () {
    var e = document.createElement("script");
    e.src = "https://cdn.signalzen.com/v1/signalzen.js";
    e.setAttribute("async", "true");
    document.documentElement.firstChild.appendChild(e);
    var t = setInterval(function () {
      if (typeof SignalZen !== "undefined") {
        clearInterval(t);
        new SignalZen(_sz).load();
      }
    }, 10);
  })();
</script>
```

Optional config keys on `_sz`: `language` (manual translation name), `renderInContainerId` (embed in a div instead of fixed position).

## Contributing

1. Fork the repo and create a feature branch
2. Run `npm run dev:widget` to start the watch build
3. Test changes in the browser at `http://localhost:8081`
4. Run `npm run lint` before opening a PR
5. Do **not** commit `public/signalzen.js` — the build artifact is gitignored
6. Do **not** run `build:widget` as part of a PR — production builds are handled separately
