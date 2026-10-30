# AGENTS.md — STAM FREIGHT CONTROL (repo: verse-hauler)

Handoff notes for any coding agent (Codex, Claude, …) continuing this project. Read this first.

## What this is
A browser tool for Star Citizen hauling missions, built for the **STAM fleet** (the user's org).
Upload mission screenshots → missions are read (browser OCR) and can be edited → the app plans a pickup/delivery
route across Stanton / Pyro / Nyx, a cargo-grid loading plan per ship, time and earnings.
Hosted on GitHub Pages: https://limmin3-sudo.github.io/verse-hauler/ (push to `main` deploys via `.github/workflows/pages.yml`).
Local copy on the user's PC: `C:\Users\limmi\Documents\Codex\2026-10-30\so\outputs\verse-hauler`.

## User preferences (must follow)
- Talk to the user in **Korean**, casual (반말) is fine in chat.
- **UI copy: never 반말.** Labels/hints = short 개조식 ("모르면 빈칸", "선택 사항", "비워 둠"), sentences/messages = polite 하세요/합니다.
  Never "비워 둬", "~해 줘", "~했어". Must read as **natural Korean, not translated** (번역투 금지). The navigator assistant speaks politely to "함장님".
- **Never mix boxes between missions.** Same commodity/size from different contracts are different cargo.
- **Do not draw ship exteriors** unless they can be exact. Cargo view is grid-only with orientation guides
  (앞/뒤/좌현/우현/위/출입구). Hull B uses two views (port/starboard); flat-hold ships use one view.
- **No bloom / light bleeding** on the map or cargo view (bloom pipeline exists but strength is 0).
- Map should feel like sc-hauling.tools in control/readability, but look realistic (procedural GPU planets, atmospheres, clouds, night lights).
- Quantum route should look Star Citizen-like: **straight lines** (bend only to go around a body, `avoidBodies`), revealed leg by leg, flowing pulse, waypoint markers, active leg amber.
- Map zoom/pan is limited (`rig.minR/maxR/bound` per level) so the user can't zoom absurdly far in/out or drift away.
- System changes go **via gateway stations** (e.g. Pyro Gateway → jump → Stanton Gateway).
- **No return-to-origin.** In game the contract completes when all deliveries are done. The return field/setting was removed from the UI; engine keeps `includeReturn` (always false from app).
- Cargo colours are **per destination in delivery order**: 1st blue, 2nd red, then yellow, green, purple, orange, … (12 colours, `DEST_COLORS` in app.mjs).
- Up to ~10 missions at once is the normal case.
- Show per-leg time + distance on each stop, total time, and earnings (total aUEC, aUEC/hour range, aUEC/SCU, measured rate from the run timer).

## Files
- `index.html`, `style.css` — layout and styles.
- `app.mjs` — UI glue: missions list, planning, itinerary, cargo panel, destination colours, earnings, settings.
- `engine.mjs` — routing (beam search, gateways, jumps), packing (`packBoxes`), delivery-aware placement
  (later deliveries deeper, earlier near the door/top), `blockersOf` (boxes that must be moved), load order.
- `route-only.mjs` — "간편 경로" mode (ignores ship/cargo).
- `ships.mjs`, `data/ships.json` — 51 ships (38 added from SuperCargo `cargoGrids.ts`, MIT, incl. Constellation Taurus, Ironclad, Hull C, Polaris, Carrack, M2/A2, Railen). Ship grids (`w,h,l,x,y,z,maxBoxSize,noUpright`), `access` side, `shareGrids`.
  Hull B: 16 grids of 2×2×8, external access, 16 SCU boxes cannot stand upright.
- `fleet.mjs` — ship picker + grid editor (access side, grid sharing, no-upright sizes).
- `starmap.mjs` — 3-level map (STARMAP › system › body), schematic-but-real-direction layout, camera rig
  (critically damped), sprite labels pinned to objects, route ribbons, search/focus/breadcrumbs, quality setting.
- `mapfx.mjs` — GPU planet/cloud/atmosphere/star shaders, route ribbon shader, label/icon sprites, backdrop.
- `bloom.mjs` — HDR target + ACES tone mapping (bloom passes skipped when strength is 0).
- `scene.mjs` — shared three.js setup + cargo grid view (holographic grids, framed containers, load-order badges).
- `ocr.mjs`, `workbench.mjs`, `recipes.mjs` — screenshot reading, editable manifest, saved box recipes per mission type.
- `execution.mjs` — run mode (운항 화면): one big button per stop (📦 접수 완료 / ✅ 배송 완료, Space/Enter), undo, "이 거점 나중에", replan from here (engine `settings.resume` / `avoidFirst`), leg log, summary. State in localStorage `sfc-run`.
- `assistant.mjs` — 항해사 비서 overlay (welcome → ship → start → shots → confirm → boxes → brief → 출항). Auto-opens on first visit only (`sfc-aide-seen`).
- `aliases.mjs` — `matchLocation(text, locations, {fuzzy})`. Fuzzy (opt-in; used by assistant, map search, manual inputs, not OCR) = Korean sounds-like skeleton vs English names (뉴배버지 → New Babbage, 그린 글레이드 정거장 → HUR-L1 Green Glade Station) + jamo typo match on Korean keys. Korean patch names → English (`KO_NAMES`, plus optional `data/ko-names.json`). **Pending:** user will provide the Korean patch `global.ini`; extract location names into `data/ko-names.json` (`{"한글":"English"}`).
- `icon.svg` — STAM crest (also inline in the header). Original design; swap if the fleet provides an official logo.
- `server/` — optional local server and Cloudflare Worker for AI screenshot reading (API key never in the client).
- `tests/` — `npm test` (node:test). Needs `data/locations.json` (CI downloads it; locally `node scripts/refresh-data.mjs`).

## Run / test / deploy
- `npm start` (or `start.cmd`) → http://127.0.0.1:4173 (downloads three.js + location data on first run).
- `npm test` must pass before pushing. Push to `main` → GitHub Actions builds and deploys Pages.
- Visual checks were done with Playwright + SwiftShader; real GPUs are much faster.

## Navigator voice (done)
`voice.mjs` holds three line sets: `standard` (default, neutral polite), `military` (군인 항해사, 다나까), `aide` (젊은 비서, 해요체).
`assistant.mjs` and `execution.mjs` read every spoken line through `V().key(...)`. Picked on the assistant welcome screen or in 설정 (`#voice`), stored in localStorage `sfc-voice`.
New lines must be added to all three sets. Never 반말; the aide stays professional (no flirting).

## Open ideas / next steps
- Mission types (multi-pickup / multi-dropoff) labels, mission stacking suggestions.
- Nearest refuel/repair, freight elevator / pad size per stop (sc-hauling.tools has these).
- Share link for a planned run; game-log watcher for auto import.
- Better OCR accuracy on PC screenshots; verify Hull B grid orientation with real in-game screenshots.
