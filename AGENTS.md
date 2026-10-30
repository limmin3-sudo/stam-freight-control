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

## NEXT TASK (requested, not built yet): navigator voice choice
User wants to pick the assistant/run-mode voice. Add a setting (assistant first screen + 설정) `voice: 'military'|'aide'`,
store in localStorage, and route every line in `assistant.mjs` and `execution.mjs` through a `LINES[voice][key](vars)` table.
Approved examples shown to the user (keep this tone; never 반말; no flirting/sexual tone for the aide):
| key | 군인 항해사 (다나까) | 젊은 비서 (해요체) |
|---|---|---|
| welcome | 함장님, 항해사 보고드립니다. 화물 운송 준비를 시작하겠습니다. | 함장님, 오셨어요? 오늘 운송도 제가 옆에서 챙길게요. |
| ship | 금일 운용할 함선을 지정해 주십시오. | 오늘은 어떤 배로 나가세요? |
| start | 현 위치를 보고해 주십시오. 지명 일부만 말씀하셔도 확인하겠습니다. | 지금 어디 계세요? 대충 말씀하셔도 제가 찾아 드릴게요. |
| shots | 접수한 미션 화면을 넘겨 주십시오. 즉시 판독하겠습니다. | 받으신 미션 화면 보여 주세요. 바로 읽어 볼게요. |
| confirm | 판독 결과입니다. 이상 있는 항목은 정정 바랍니다. | 이렇게 읽었어요. 틀린 데 있으면 고쳐 주세요. |
| brief | 항로 산출 완료. 경유지 {n}곳, 예상 소요 {min}분, 예상 수익 {reward} aUEC입니다. | 경로 다 짰어요! {n}군데 들르고 {min}분 정도 걸려요. 예상 수익은 {reward} aUEC예요. |
| launch | 출항 준비 완료. 명령만 내려 주십시오. | 준비 끝났어요. 출발하실 때 말씀해 주세요. |
| pickup | 적재 확인. 다음 목적지 {next}, 약 {min}분 소요됩니다. | 실었어요! 다음은 {next}예요. {min}분쯤 걸려요. |
| delivery | 인도 완료 확인. 잔여 화물 {scu} SCU입니다. | 배송 완료! 이제 {scu} SCU 남았어요. |
| defer | 해당 거점은 후순위로 돌리겠습니다. 항로 재산출합니다. | 여긴 나중에 들를게요. 경로 다시 짜 놨어요. |
| undo | 직전 보고를 취소했습니다. | 방금 건 되돌려 놨어요. |
| replan | 현 적재 상태 기준으로 항로 재산출 완료. | 지금 실린 화물 그대로 남은 경로 다시 짰어요. |
| done | 전 화물 인도 완료. 수고하셨습니다, 함장님. 이상 보고 끝. | 다 끝났어요, 함장님. 오늘도 고생 많으셨어요! |
Keep the current neutral polite voice as the default until the user picks.

## Open ideas / next steps
- Mission types (multi-pickup / multi-dropoff) labels, mission stacking suggestions.
- Nearest refuel/repair, freight elevator / pad size per stop (sc-hauling.tools has these).
- Share link for a planned run; game-log watcher for auto import.
- Better OCR accuracy on PC screenshots; verify Hull B grid orientation with real in-game screenshots.
