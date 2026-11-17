# Companion typography

- Barlow Medium: unchanged `apps/control-room/src/assets/fonts/Barlow-Medium.ttf` (SIL OFL).
- SUIT Medium: unchanged static font from https://github.com/sun-typeface/SUIT/releases/download/v2.0.5/SUIT-ttf.zip (SIL OFL). Use the official static font for .NET Framework rather than modifying a variable font under its reserved name.
- Both weights are 500, matching the approved web typography. Latin-only labels/numeric metrics use Barlow; Korean copy uses SUIT. No OS-wide font installation. Font files and licenses ship inside the app.

Rendering uses Windows GDI TextRenderer with ClearType. The bundled fonts are registered in process-private memory for both GDI and GDI+; no system installation is performed. The Windows capture check selects each font into a native HDC and asserts GetTextFace is Barlow/SUIT Medium and GetTextMetrics weight is 500. Evidence: `docs/cinematics/companion-15-design-20261117/review/font-selection.json`.
