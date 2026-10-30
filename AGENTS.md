# Project guidance

This is a browser-based hauling planner hosted on GitHub Pages.

- Keep UI text in natural, polite Korean. Conversation may be casual.
- Keep cargo ownership distinct by mission ID even when commodity and box sizes match.
- Render cargo grids with clear orientation guides. Hull B has port and starboard views. Do not add inaccurate ship exteriors.
- Keep bloom disabled. Stars use warm visible surfaces and a thin local corona; backgrounds distinguish red/orange Pyro, teal-blue Stanton and indigo/violet Nyx.
- The partner chooser precedes the selected persona introduction. Preserve existing missions. voice.mjs defines experienced senior navigator, loyal navigation officer, and lively adult female aide. Apply persona speech throughout planning and execution.
- assets/partners contains generated fictional adult portraits used in the chooser, intro and run view.
- performance.mjs applies drive and flight defaults per selected ship. S1 uses Atlas, S2 Hemera, S3 Erebos; larger slots use sourced factory equipment. Allow factory, recommended and manual settings with per-ship browser persistence. Custom grid profiles preserve performanceId.
- travel.mjs keeps quantum transit dependent on drive performance; SCM and NAV speeds affect approach estimates. Approach distances and average-speed factors are planning assumptions, not atmospheric simulation.
- locations.mjs and location-manager.mjs merge personal locations and aliases without inventing coordinates. Preserve those integrations and the scheduled coordinate validation workflow.
- Run npm test before publishing. The workflow packages public assets and deploys Pages. Never upload secrets, local account paths, private handoff details or user screenshots.
