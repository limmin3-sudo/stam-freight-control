# Introduction film — Beta 1.0.0

The current film is the 44-second original-container-freighter edition: generated ground-base/orbital footage, a wormhole sequence, locally rendered 3D cargo, Korean editorial typography, instrumental music and mixed effects. The featured vessel is an original design, not a C2 or an exact Star Citizen ship. It illustrates the tool; the cargo graphics are not recordings of its live interface.

- `intro.mp4`: 1920×1080, 24 fps, H.264 / AAC stereo, fast-start metadata. The generated footage and cargo frames originate at 1280×720; typography is composed at 1080p. Web delivery is re-encoded from the approved 44-second master with two-pass H.264 at 5.6 Mbps video, retaining the original audio and edit. Keep every delivery file below the existing companion cache limit of 32 MiB; do not raise the native app limit for a film replacement.
- `poster.jpg`: a clean orbital frame of the same original freighter.
- `teaser.mp4`: six-second, 1280×720 silent ground-base preview. Existing reduced-motion handling remains in force.

All film imagery and audio are generated or locally authored for this production. No game screenshots, extracted models, official promotional footage, or manufacturer marks are embedded in this edition. The hosting site's independent/non-commercial fan-tool notice and game-data attributions remain intact.

The old `scripts/render-intro.*`, `scripts/intro/`, and four WebP illustrations belong to the archived alpha interim film. They do not rebuild this edition and must not overwrite it. The new film's production manifest and source hashes are in `production.json`; editing sources are retained in the production workspace outside the public repository.

Future replacement: update the film, poster and silent preview together and publish a website release to refresh stamped URLs. The companion executable does not need to change.
