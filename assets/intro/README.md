# Replaceable introduction film

The current 40-second introduction is the user-approved image-based interim edition, with original synthesized music/effects, English tool-briefing titles and Korean subtitles. It is not continuous generated spacecraft footage.

To replace it, update `intro.mp4` (H.264 video / AAC audio with fast-start metadata), `poster.jpg`, and the silent `teaser.mp4`. Publish a website release so their stamped URLs change. The companion executable and its version do not need to change. Keep the non-commercial fan notice and underlying IP attribution in the film and hosting page.

The four final WebP scene illustrations are the render inputs. Rebuild with `node scripts/render-intro.mjs` or `python3 scripts/render-intro.py`, requiring Python 3, numpy and ffmpeg. Captions and original score are in `scripts/intro/`.

Official promotional video clips, extracted ship models, discarded concepts and user screenshots are not part of this media bundle.
