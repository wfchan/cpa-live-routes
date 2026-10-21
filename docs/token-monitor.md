# Token Monitor integration

This fork keeps the original Go plugin and its Canvas animation engine. The
`token-monitor` branch adds an English frontend for hosting in Token Monitor.

Generate it with Node.js 22 or later:

```sh
node scripts/build-token-monitor.mjs
node --test scripts/build-token-monitor.test.mjs
```

Copy `web/token-monitor.html` to Token Monitor's
`public/live-routes/view.html`, together with `LICENSE` as `LICENSE.txt`.
The React page mounts this document in a same-origin frame, receives its natural
height, and unmounts it when navigating away. The original flow/timeline renderer
stays isolated from the dashboard's CSS. The page aborts outstanding data requests
when unloaded. Browser storage contains UI preferences only.

The dashboard server must expose exactly these read-only routes, using its own
CPA management credential server-side:

- `GET /api/live-routes/snapshot`
- `GET /api/live-routes/events?since=<opaque cursor>`
- `GET /api/live-routes/records?before=<opaque cursor>&limit=<1..2000>`

Forward them to the matching `/v0/management/live-routes/` endpoints. Preserve the
JSON contract, opaque cursors, epoch resets, eviction events, and errors. Do not
use the dashboard's database snapshot cache, persist traffic, forward browser
credentials to CPA, or expose the management key to the browser.

The generator validates its upstream integration points and fails on untranslated
Chinese text. Rendering, flight direction, waiting states, return animations,
timeline panning, session links and animation timing use the upstream code.

Original project: https://github.com/Roomen/cpa-live-routes

License: MIT, copyright (c) 2026 Roomen. See `LICENSE`.
