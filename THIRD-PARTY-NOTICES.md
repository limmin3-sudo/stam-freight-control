# Sources and licences

STAM is an unofficial Star Citizen fan tool. Star Citizen and related marks belong to Cloud Imperium Games. No affiliation or endorsement is implied.

- Three.js and OrbitControls: MIT; licence in vendor/THREE-LICENSE.txt.
- SuperCargo cargo-grid reference data: MIT; licence in vendor/SUPERCARGO-LICENSE.txt.
- Star Citizen Wiki API: public English location and hauling mission reference data. Source URLs and versions are recorded in the data files. https://api.star-citizen.wiki/
- The confirmed hauling allocation references in integration/log/manifest.mjs cite their public source URLs and game builds. They do not establish the player's current inventory.
- Optional browser OCR uses Tesseract.js (Apache-2.0) and its trained language models, fetched only when image recognition is used. https://github.com/naptha/tesseract.js
- The portable Windows package includes Node.js with its own runtime/LICENSE.
- Korean display labels in data/ai-korean.json are authored from the English catalogue using data/ai-korean-lexicon.mjs. English canonical IDs and names remain the planning data.


## Introduction film and fan illustrations

The introduction uses AI-assisted fan illustrations and original synthesized music and effects. It does not include official promotional video footage, concept-art images, a redistributed ship model, or a third-party music recording. Star Citizen-related designs remain the property of Cloud Imperium Rights LLC / Ltd; no independent rights in that underlying IP are claimed. The hosting page contains the non-commercial fan-production notice.

Policies checked 2026-11-06:
- https://support.robertsspaceindustries.com/hc/en-us/articles/5422808416151-Fan-Film-and-Machinima-Policy
- https://support.robertsspaceindustries.com/hc/en-us/articles/360006895793-Star-Citizen-Fankit-and-Fandom-FAQ

The final scene artwork is created for this fan tool; source generation files and discarded concepts are not part of the public website bundle.

- SCMDB_DATA by KrovaxCode: public mission catalogue reference fields and base reward values, pinned to commit `937f66810a392aa5682b9615a1afbff20fe96e3f`, build `4.10.2-live.12913470`. https://github.com/KrovaxCode/SCMDB_DATA . Per-field source/version and differing values are retained in `data/mission-details.json`; see `docs/MISSION-DATA-RECONCILIATION.md`. Game content belongs to its respective owners.
