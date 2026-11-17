# Native companion material assets

These PNGs are byte-for-byte copies of the approved material assets preserved in `origin/cinematic/companion-design-20261117`, under `docs/cinematics/companion-design-20261117/assets/`. That branch was a browser-only review draft; its old runtime files are not merged here.

- `black-gold-d-frame.png`: D black glass / thin gold frame, window body and selected actions.
- `flight-console-a-frame.png`: A recessed metal instrument, live connection status.
- `hologram-button.png`: earlier cyan glass button, common native actions.

`DeckTheme.cs` samples the original images and scales their nine regions at runtime, preserving frame thickness. Text stays in native controls using bundled Barlow/SUIT. These are not redrawn line-and-shape replacements. `scripts/build-desktop.mjs` explicitly includes the three materials and the panorama in the installer/ZIP payload.

`division-overview.png` is a byte-for-byte copy of `apps/control-room/src/assets/division/overview-approved.png`. It fills only the main connection window, with a dark readability overlay; the overlay window and settings retain their existing backgrounds.
