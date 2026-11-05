# AeroFace

Browser-only facial proportion studio with a liquid glass interface. Choose a front photo, a side photo, or both; inspect measurement points and visual explanations; export a personal report. Indonesian interface.

## Run locally

Requires Node.js 24+.

```sh
npm ci
npm run dev
```

Production build and local preview:

```sh
npm test
npm run build
npm run preview
```

Open the printed localhost URL. Use a local HTTP server; opening `index.html` directly with `file://` does not support the worker and offline cache correctly.

## GitHub Pages

Push to `main`, then choose **Settings → Pages → Source → GitHub Actions**. `.github/workflows/pages.yml` tests, builds and deploys the static site. Relative asset URLs support both a project path such as `/AeroFace/` and a custom domain. There is no backend, API key, or environment secret.

## What runs locally

- JPEG, PNG and WebP selection, drag and drop, optional camera, rotation and center crop to 3:4.
- A bundled MediaPipe Face Landmarker detects front-view landmarks in a classic Web Worker, off the main UI thread. All model, WASM, script and font assets are served from this repository.
- Side-view landmarks use guided manual placement. Automatic profile measurement is deliberately not claimed.
- Every analysis requires explicit user confirmation of the landmark positions. Drag points or use arrow keys (Shift for larger steps).
- Deterministic geometric measurements and a disclosed, subjective scoring rubric. Front-only and profile-only results do not penalize a missing, unselected side.
- PNG, JSON and print-to-PDF reports generated in the browser. Photo inclusion is off by default. Use the browser's **Save as PDF** destination in the print dialog.
- Offline support after the status reads **Siap dipakai offline**. Service worker caching is restricted to the build's static application and model files.

## Privacy

The app does not send photos, landmarks, or scores to any server. It does not use analytics, external fonts, cookies, localStorage, sessionStorage, IndexedDB, cloud inference, or user-data APIs. User-selected photos are decoded, resized (maximum edge 1600 px) and re-encoded in browser memory; application-created images do not retain the source EXIF metadata. Object URLs are revoked on replacement or session clearing, and the detector worker is terminated after detection. Clearing a session releases app references; it is not a promise of forensic erasure of browser or OS memory, and it does not delete the user's original files or explicitly downloaded reports.

The document's Content Security Policy restricts connections to the same origin. The classic detection worker also restricts its network APIs to local asset loading. No photo data is passed into a network call. GitHub Pages may record visitors' IP addresses for security: [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).

To audit: open DevTools → Network, wait for app/model loading, select photos, run an analysis, and export a report. There must be no outbound user-data requests. Repeat after enabling offline mode.

## Measurement and score limitations

This is **not an objective attractiveness model or medical instrument**. `AeroFace Geometry 1.0` is a transparent product-design rubric, not a scientifically validated beauty scale. Pose, lens perspective, expression, landmark placement, occlusion and photo quality affect the outputs. Quality checks are rough, photo-wide heuristics and are separate from proportion scores; they do not certify a suitable pose or sufficient facial detail.

All distances use pixel coordinates with the actual photo aspect ratio, then normalize to other visible facial distances. There is no claim of real-world millimeters or calibrated 3D reconstruction. The profile ramus and jaw metrics measure **visible surface contours**, not anatomical bone boundaries. Their reference intervals and weights are heuristic choices, not clinical standards or universally ideal facial features.

For each metric, the score is 10 inside the displayed reference interval. Outside it, score is `max(0, 10 * (1 - distance_to_interval / falloff))`. The complete intervals, falloffs, weights, definitions, and formula implementations are in `src/analysis.ts`. A side score is the weighted average of its metrics. Full mode averages the two side scores equally.

## Dependencies and licenses

- MediaPipe Tasks Vision: Apache-2.0. Official face landmark model downloaded from `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` (model version 1). SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- Geist font: SIL Open Font License. Local WOFF2 assets via `@fontsource/geist`.
- Lucide icons: ISC license.
- React: MIT license.

`npm run prepare:assets` refreshes vendored MediaPipe runtime files from the locked npm package and downloads the model only if absent. Commit `public/vendor` and `public/models`; deployments never download runtime assets from third parties.

## Checks

`npm test` exercises symmetry, pixel-scale invariance, aspect-ratio handling, missing-side score behavior, malformed geometry rejection, and metric bounds. Browser checks cover responsive layout, file selection, invalid files, manual measurement, worker detection, report export, same-origin network behavior and offline operation.
