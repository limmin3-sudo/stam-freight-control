# Introduction film — Beta 1.1.1

The current film is the 35.5-second megafreighter-fleet edition: generated convoy footage, wormhole entry and emergence, a short tunnel insert, real STAM interface screenshots with example data, Korean editorial typography, instrumental music and mixed effects. The freighter visuals are cinematic illustrations; they do not represent a playable ship or in-game flight capture.

- `intro.mp4`: 1920×1080, 24 fps, H.264 / AAC stereo, fast-start metadata. New source clips are 1080p; the 1.5-second tunnel insert originates at 720p. Web delivery uses CRF 21 with a 6.5 Mbps video ceiling. Every file remains below the companion cache limit of 32 MiB.
- `poster.jpg`: a clean orbital frame from the new fleet footage.
- `teaser.mp4`: six-second, 1280×720 silent convoy preview. Existing reduced-motion handling remains in force.

The interface inserts show the actual STAM interface with illustrative data. Film assets and audio were generated or locally composed. Source material and editing files remain in the production workspace outside this repository. Hashes and media details are recorded in `production.json`.

The old `scripts/render-intro.*`, `scripts/intro/`, and four WebP illustrations belong to the archived alpha interim film and must not overwrite the current edition. Future replacements must update film, poster and silent preview together and stamp a website release. No companion executable update is needed.
