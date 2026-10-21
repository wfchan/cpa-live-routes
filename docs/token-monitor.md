# Token Monitor integration

This fork keeps the original Go plugin and its Canvas flow/timeline engine. The
`token-monitor` branch adds an English frontend for hosting in Token Monitor.

Generate it with Node.js 22 or later:

```sh
node scripts/build-token-monitor.mjs
node --test scripts/build-token-monitor.test.mjs
node --test scripts/token-monitor-motion.test.mjs
```

Copy `web/token-monitor.html` to Token Monitor's
`public/live-routes/view.html`, together with `LICENSE` as `LICENSE.txt` and
`web/LUCIDE-LICENSE.txt` for the vendored control icons.
The React page mounts this document in a same-origin frame, receives its natural
height, and unmounts it when navigating away. The original flow/timeline renderer
stays isolated from the dashboard's CSS. The page aborts outstanding data requests
when unloaded. Browser storage contains UI preferences only.

The dashboard server must expose exactly these read-only routes, using its own
CPA management credential server-side:

- `GET /api/live-routes/snapshot`
- `GET /api/live-routes/events?since=<opaque cursor>`
- `GET /api/live-routes/records?before=<opaque cursor>&limit=<1..2000>`

Responses may add `userLabels: [{fp, mask, name, color}]`, derived server-side
from Settings Users. `fp` is the first eight lowercase SHA-256 hex digits of the
raw API key; `mask` follows the plugin's redaction rules. Never send raw keys.
Exclude ambiguous fingerprints and project entries. The frontend requires both
fingerprint and mask, refreshes ownership on every poll, and draws the user's
name at the client bubble's upper right. Long names are ellipsized; the tooltip
retains the full name. Counts remain separate. Settings are read-only here;
traffic and identity mappings are not persisted by this frontend.

Forward them to the matching `/v0/management/live-routes/` endpoints. Preserve the
JSON contract, opaque cursors, epoch resets, eviction events, and errors. Do not
use the dashboard's database snapshot cache, persist traffic, forward browser
credentials to CPA, or expose the management key to the browser.

The generator validates its upstream integration points and fails on untranslated
Chinese text. Data ingestion, flow geometry, timeline panning and session links
use upstream code. `web/token-monitor-motion.js` customizes presentation:

- Native animation-frame cadence, with one speed multiplier on the motion clock.
- Default outbound/return journeys of 1.8/2.4 seconds, independent of actual latency.
- Arc-length sampling for uniform travel across unequal segments.
- A cached static Canvas layer for links, labels and nodes; live packets draw separately.
- Calm waiting markers, capped at five per port; the node's count remains exact.
- Active bubbles have a cyan border and tinted fill; a small moving underline
  renders separately from cached text, respecting pause and reduced motion.
- Fast responses finish the outward presentation before the return animation.
- Reduced-motion, pause, tab visibility and back/forward restoration are respected.

`web/token-monitor.css` provides the dashboard presentation. Icons are Lucide
Pause, Play and SlidersHorizontal, from lucide-react v1.14.0 (ISC license).

Original project: https://github.com/Roomen/cpa-live-routes

License: MIT, copyright (c) 2026 Roomen. See `LICENSE`.
