# SnapDiff implementation and UI plan

There is no single 'best' visual tool for every use. Use Playwright's reproducible browser capture model and visual review patterns from Percy as references, then test against ForgeOS's privacy/local comparison requirements.

Primary references:
- https://playwright.dev/docs/test-snapshots
- https://www.browserstack.com/percy
- https://github.com/mapbox/pixelmatch

## Local comparison slice

Inputs: PNG/JPEG/WebP baseline and candidate with explicit file-byte and decoded-pixel limits. Reject unsupported/animated files rather than silently picking a frame. Require matching dimensions by default; any future alignment/resize policy is explicit and included in the result. Decode asynchronously, release ImageBitmap/object URLs and guard races when an input changes during decode/compute.

UI: labeled source pickers with names/dimensions/bytes; view tabs Side by side / Overlay / Wipe / Difference; fit/zoom controls that preserve alignment; channel/perceptual threshold help; optional masks later; changed pixels/percentage and bounding box; comparison settings and algorithm version in the exported report. Provide actual PNG download and JSON evidence rather than a pop-up data URL. Reset results on every input or parameter change. Error states preserve the previous valid input but cannot display it as the newly chosen image.

Use a dedicated worker for pixel work and transferable buffers. Limit source pixels and output allocations, cancel/terminate stale tasks and never compute a large loop during React render. Alpha must be composited against a declared background; transparent RGB noise must not inflate differences. A pixel delta is not a semantic verdict. Anti-aliasing/perceptual algorithms are separately versioned and compared against fixtures before becoming defaults.

## Browser capture and review later

Run authorized Playwright journeys in isolated workers with fixed browser/OS/fonts/viewport/device scale/time zone. Wait on declared readiness, disable or deterministically settle animations and record resource/console failures. Baseline identity includes environment and scenario; never silently overwrite a baseline. Record masks and thresholds in the approval history. Separate proposed, reviewed, approved and rejected states with reviewer identity and an audit trail.

No unrestricted user URL fetcher in the web/API process. Validate DNS/IP on every connection/redirect, block metadata/private targets unless an explicitly authorized private runner is used, keep credentials by secret reference and redact traces. Browser downloads/scripts remain in a disposable sandbox. Screenshots/traces get private artifact retention and scoped download links.

## Acceptance

Fixtures: identical, one changed pixel, threshold boundary, transparent backgrounds, dimension mismatch, font/anti-aliasing noise, masked area, huge/decompression input, failed decode, replacement race and cancellation. Test that metrics match the rendered result and that no stale report survives input changes. Capture fixtures must pass repeatedly in the same pinned environment. Suggested target to measure: local 2MP comparison p95 <300ms on a recorded reference device with responsive controls; do not publish this as achieved without measurement.

## Delivery order

S1 bounded local engine + worker + review UI + exports. S2 explicit masks/perceptual mode and fixtures. S3 controlled browser capture + private artifacts. S4 approved baselines/PR integration and multi-browser/environment review. Existing browser-local comparison is not equivalent to the completed pipeline.
