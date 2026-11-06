# Guide screen captures

These are captures of STAM's own interface, not screenshots copied from a player's computer. Korean and English variants are captured separately by `scripts/capture-guide.mjs`.

- Ordinary examples use synthetic contract ownership IDs. The 112 SCU two-destination and 452 SCU interstellar quantities reproduce mission content supplied for this guide. Their combined 564 SCU example is illustrative; container breakdowns are chosen for explanation and are not claimed as observed game containers.
- `actual-inbox-*` and `actual-editor-*` was captured through the companion's real receiving path using the user-supplied Game.log. Only inbox cards and the incomplete contract editor are shown; runtime identifiers are replaced for publication. Missing quantities remain missing. No raw log, player identity or personal installation path is included.
- The Game.log folder illustration is HTML in the guide, labelled as an illustration. It explains hidden extensions and is not presented as a Windows screenshot.
- `aide-present.webp` is the user-selected updated AI-assisted bridge-operator illustration (2026-11-06), with matching source imagery in `assets/partners/aide.png`. The WebP is a lossless format conversion of that selected image. `navigator-present.webp` is unchanged. Amanda, the separate tutorial flight director, has not replaced either hauling partner.

The private log is not part of the repository or public build. To intentionally refresh the actual receipts locally, supply `STAM_GUIDE_LOG` to the capture script; review and anonymise the resulting visible content before publishing. Normal example captures work without a private log and do not overwrite the actual-receipt images.

Optional capture controls: `STAM_GUIDE_LANG=ko|en`, `STAM_GUIDE_ONLY=name,name`, and `STAM_GUIDE_RESUME=1` (skip previously written JPEG intermediates). Chromium captures are converted to WebP at the end; pre-existing WebP files are not repeatedly recompressed. `STAM_CHROMIUM_PATH` and `STAM_PLAYWRIGHT_MODULE` select installed tools.

New guide slides refer to each photographed state once. Remaining explanations use text and diagrams rather than repeating the same full settings screenshot.
