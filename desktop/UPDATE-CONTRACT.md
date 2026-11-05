# Companion update boundary

`app.1.3.0` connects the existing public website to a read-only local log API.

- The companion never automatically opens a browser. Its explicit Open STAM website button uses https://limmin3-sudo.github.io/stam-freight-control/.
- Authentication, browser storage, mission review, routing, packing and every website update stay on that public origin. Website updates do not require reinstalling the companion.
- The native package contains log processing, the local API, launcher and logo, with no bundled flight-deck HTML or browser application.
- The browser receives a per-session pairing token in the URL fragment, immediately removes it from the address and sends it only to the fixed loopback API. Public static resources never receive it.
- CORS permits authenticated GET status/snapshot reads only from the existing public origin. Preflight supports browser local-network permission; foreign origins and cross-origin controls remain denied.
- API protocol and snapshot schema remain 1. Native launcher/parser/transport changes require a separate companion release.
- Earlier loopback browser data and UI caches are left in place; public-site data is not migrated over or erased.

The selected visual theme is UEE control room. The user reviewed the actual Korean/English Windows captures and approved proceeding, with formal neutral interface wording. The final formal copy passed the Windows EXE, included-runtime, language-switching and capture checks (run 42031408917). app.1.3.0 may now be published as a new immutable release; app.1.2.0 remains available.
