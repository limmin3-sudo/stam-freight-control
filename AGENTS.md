# Project guidance

Read docs/CLOUD-HANDOFF.md before continuing work. It records implemented features, confirmed requirements, limits, storage keys, deployment and the pending authentication task. For a new Cloud task, use docs/CLOUD-START-PROMPT.md. README.md contains the short run guide.

## Working rules

- Use natural Korean in conversation and polite Korean in the UI.
- Preserve independent mission, shipment and box ownership. Identical commodities and box sizes are not interchangeable between contracts.
- Preserve aboard cargo positions when resuming or recalculating an active run. Never silently erase missions or progress.
- Keep cargo views grid-only unless exact authorized ship exteriors are available. Hull B uses port/starboard views; other holds use their appropriate view. Preserve orientation and access guides.
- Keep bloom disabled. Warm stellar surfaces and a thin corona replace white clipping. Pyro is red/orange, Stanton teal-blue, Nyx indigo/violet.
- Keep straight quantum routes with body avoidance and sourced gateway connections. No automatic return-to-origin in the UI.
- Show partner selection before the introduction. Keep senior navigator, loyal navigation officer and lively adult female aide voices throughout planning and execution. Reuse the committed portraits unless asked to replace them.
- Select drive defaults by actual slot: Atlas S1, Hemera S2, Erebos S3, sourced factory equipment for larger slots. Support factory/recommended/manual presets and per-ship overrides. Custom grid profiles retain performanceId.
- Quantum transit depends on the drive; SCM/NAV speeds affect approach estimates. Do not invent a generic large-ship speed multiplier. Approach distances and average-speed factors are planning assumptions.
- Preserve personal location management, aliases and the validated daily coordinate refresh workflow.
- Existing storage is browser-local. Google login and account synchronization are not implemented. Firebase was proposed, but no connection or project is confirmed. Do not claim login works before integrating and testing it.
- Do not assume this Cloud environment has earlier local chats, browser sessions, credentials, personal settings or screenshots.
- Never publish secrets, local account paths, private conversation dumps or user screenshots. Keep necessary operational handoff documentation free of personal-machine details.

## Run and validate

Use Node.js 22. Run node scripts/prepare.mjs on a clean checkout, then npm test. Start with npm start. There is no required framework dependency-install step. The last functional baseline passed 32 tests.

Preserve current main changes. GitHub Pages deploys through .github/workflows/pages.yml; verify Actions and the actual site after functional releases. Documentation-only work does not justify unrelated application rewrites.
