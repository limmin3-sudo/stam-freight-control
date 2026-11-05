# Companion update boundary

`app.1.2.0` establishes the companion for the original flight deck and reviewed contract inbox.

- Native bridge protocol: 1. Snapshot schema: 1.
- The website publishes `web-release.json` and content-addressed `web-assets/`.
- The companion downloads browser resources only, verifies the complete manifest and all hashes, then applies them at the next launch.
- The current flight deck never changes underneath an active trip. Offline or damaged-cache startup falls back to a verified previous release, then the bundled deck.
- Browser resources are never loaded as Node modules. Selected log access stays in the bundled protected bridge.
- Website layout, mission review, route planning, cargo packing and display labels can update without replacing the EXE. Changes to the native launcher, protected log parser or bridge protocol require a companion release.
- Website and loopback browser storage have different origins. Keep existing public-site data; use existing backup/restore or account synchronization when moving to the companion deck.

Windows package validation compiles the EXE, uses the bundled Node runtime to read a synthetic accepted contract without changing its log, checks both languages and captures the actual forms.
