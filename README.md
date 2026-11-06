# AeroFace

Browser-only face analysis studio with a liquid glass interface. Choose a front photo, a side photo, or both; inspect measurement points and visual explanations; export a personal report. English and Indonesian are available in Settings, including explanations, error messages and downloaded reports. English is the default.

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
- A bundled MediaPipe Face Landmarker detects front and side landmarks in a worker. Profile extraction selects the camera-facing jaw using relative mesh depth and rejects front-facing inputs used as profiles. Near-ear and jaw landmarks remain surface estimates and must be reviewed.
- A separate FaceONNX ResNet-18 model estimates appearance from an eye-aligned front-face crop in an ONNX Runtime worker. All model, WASM, script and font assets are served from this repository; no cloud inference is used.
- The current `aligned-six-view-v1` pipeline takes the median of three framing scales and their mirrored counterparts. Reports show their base-model variation range as input sensitivity, not confidence. This adds consistency checks; it does not by itself demonstrate better agreement with human ratings.
- When the six evaluated variants land in different bands, the report shows their observed tier span, for example MTN–HTN, while retaining the median numeric estimate. This span describes the checks that ran, not a statistical confidence interval. Sub-5 refers to the median estimate. A calibrated span is omitted if any variant falls outside the reference range.
- Settings can fit an optional local consensus mapping from a ratings CSV. It requires separate people in training and validation, averages at least three raters per photo, and accepts the mapping only when validation MAE improves without worsening RMSE. No consensus mapping is shipped without real labeled data. See [the collection and validation workflow](docs/calibration.md).
- Side-only reports show geometry and contour angles without assigning an appearance tier. Missing, failed or unsupported appearance inference never falls back to a geometry-derived tier.
- Every analysis requires explicit user confirmation of the landmark positions. Drag points or use arrow keys (Shift for larger steps).
- In the measurement explorer, select a metric and tap an individual line on the photo or its legend. Each line explains its name, endpoints, in-photo pixel length, role as a measurement/reference, and relationship to the score. The symmetry axis is labeled as a reference rather than assigned a measured facial length. Profile lip offsets are drawn perpendicular to the nose–chin reference, matching the actual formula.
- A local analysis overlay follows worker-reported model loading and detection stages. It uses a minimum three-second scan presentation; when detection finishes early, the overlay explicitly switches to visualization. Clearing the session cancels the reveal. No fake accuracy or percentage is shown. Landmark, stage, report, guide and control transitions respect reduced motion; interface motion can also be disabled in Settings.
- Deterministic geometric measurements and a disclosed, subjective scoring rubric. Front-only and profile-only results do not penalize a missing, unselected side.
- Simple native SVG front/profile illustrations and optional illustrative outlines for each tier. Man/Woman is selected by the user and changes terminology and illustrations, not the shared predictor or its numeric output. No separate gender calibration is claimed.
- Four-axis radar charts show actual geometric metric scores, separately from the AI estimate. Jaw, profile-balance and contextual chin angles are displayed in degrees; the extra chin angle is excluded from geometry scoring.
- PNG, JSON and print-to-PDF reports generated in the browser. Photo inclusion is off by default. Use the browser's **Save as PDF** destination in the print dialog.
- Offline support after the status reads **Siap dipakai offline**. Service worker caching is restricted to the build's static application and model files.
- Online navigation checks for current HTML before falling back to the offline cache. A service-worker update displays a refresh notice and preserves the current photos until the user chooses to refresh.

## Privacy

The app does not send photos, landmarks, or scores to any server. It does not use analytics, external fonts, cookies, localStorage, sessionStorage, IndexedDB, cloud inference, or user-data APIs. Language is represented by the URL fragment (`#lang=en` or `#lang=id`), which browsers do not send in HTTP requests, so it survives reload without persistent browser storage. User-selected photos are decoded, resized (maximum edge 1600 px) and re-encoded in browser memory; application-created images do not retain the source EXIF metadata. Object URLs are revoked on replacement or session clearing, and both inference workers are terminated after use. Clearing a session releases app references; it is not a promise of forensic erasure of browser or OS memory, and it does not delete the user's original files or explicitly downloaded reports.

The document's Content Security Policy restricts connections to the same origin. The classic detection worker also restricts its network APIs to local asset loading. No photo data is passed into a network call. GitHub Pages may record visitors' IP addresses for security: [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).

To audit: open DevTools → Network, wait for app/model loading, select photos, run an analysis, and export a report. There must be no outbound user-data requests. Repeat after enabling offline mode.

## Measurement and score limitations

Neither model is an objective attractiveness measure or medical instrument. `AeroFace Geometry 2.0` is a transparent product-design rubric, not a scientifically validated beauty scale. Pose, lens perspective, expression, landmark placement, occlusion and photo quality affect the outputs. Quality checks are rough, photo-wide heuristics and are separate from proportion scores; they do not certify a suitable pose or sufficient facial detail.

All distances use pixel coordinates with the actual photo aspect ratio, then normalize to other visible facial distances. There is no claim of real-world millimeters or calibrated 3D reconstruction. The profile ramus and jaw metrics measure **visible surface contours**, not anatomical bone boundaries. Their targets, tolerances and weights are heuristic choices, not clinical standards or universally ideal facial features.

Each metric now has one target instead of a perfect-score interval: `score = 10 / (1 + ((value - target) / tolerance)^2)`. One tolerance from the target gives 5; scores decline continuously in either direction. The disclosed targets and tolerances are heuristic product choices, not fitted population data. Each view uses a weighted geometric mean so one high measurement cannot compensate as easily for a weak one. Full mode averages the two view scores equally. Complete targets, tolerances, weights and formulas are in `src/analysis.ts`.

The appearance estimate uses the publisher's BGR preprocessing: 224 × 224 input, channel means 104/117/123, divided by 255; the raw model output is multiplied by two and clipped to 0–10. The model receives an eye-aligned face crop. This crop is a product preprocessing choice and can influence its prediction. Full mode keeps the front appearance estimate separate from the equal-weight combined geometry score; a model trained for frontal appearance is not passed side photos as though they were validated inputs.

Only a successful front appearance estimate receives a community-inspired tier: Sub-3 [0,3), LTN [3,4), MTN [4,6), HTN [6,7), Chadlite [7,8), Chad [8,9), Adam [9,9.5), True Adam [9.5,10]. Woman terminology is Sub-3, LTB, MTB, HTB, Stacylite, Stacy, Eve, True Eve at the same boundaries. Sub-5 overlaps every score below 5. These are app bands, not validated PSL ratings, population percentiles or celebrity equivalence. The publisher provides no documented training-data composition, subgroup accuracy or separate man/woman calibration. The model can reflect lighting, pose and training-data biases; adding AI does not establish objective correctness.

The illustrated guide explains Sub-5 separately, including its overlap with the lower part of MTN/MTB. A “Near” note means the estimate is within 0.2 points of the next app band, not a confidence interval. Additional front readings show head-roll-corrected eye-corner tilt on each side and mouth-to-cheek width. These 2D values are unscored context, included in the screen, PDF, PNG and JSON reports. They do not provide skin, hair-density, facial-fat or population-percentile estimates.

Lines and radar charts explain geometry, not the neural model's decision. Tier outlines are illustrations rather than reference faces or anatomical templates for a score. JSON schema 4 includes separate appearance and geometry values, reference choice, raw appearance output and contextual contour angles. If appearance is unavailable, top-level appearance score and tier are null.


Small images are accepted with a warning below 256 pixels on the shortest edge. Images are never upscaled; lower resolution can reduce landmark reliability.

## Dependencies and licenses

- MediaPipe Tasks Vision: Apache-2.0. Official face landmark model downloaded from `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` (model version 1). SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- FaceONNX beauty ResNet-18 weights: MIT as published by [FaceONNX.Models](https://github.com/FaceONNX/FaceONNX.Models). Source commit, 44.8 MB file size, SHA-256, preprocessing and limitations are recorded in `public/models/appearance-model.json`.
- ONNX Runtime Web 1.31.1: MIT. Only the WASM runtime assets needed for single-thread browser inference are vendored. The initial offline download now includes about 60 MB of appearance weights and runtime.
- Geist font: SIL Open Font License. Local WOFF2 assets via `@fontsource/geist`.
- Lucide icons: ISC license.
- React: MIT license.

`npm run prepare:assets` refreshes vendored MediaPipe runtime files from the locked npm package and downloads the landmark model only if absent. It also checks the committed appearance weights against their manifest and refreshes their local runtime assets. Commit `public/vendor` and `public/models`; deployments never download runtime assets from third parties.

## Checks

`npm test` exercises symmetry, pixel-scale invariance, aspect-ratio handling, missing-side score behavior, malformed geometry rejection, and metric bounds. Browser checks cover responsive layout, file selection, invalid files, manual measurement, worker detection, report export, same-origin network behavior and offline operation.

With Google Chrome installed, run the same end-to-end suite against a local production build or the deployed site:

```sh
npm run build
node tests/browser.mjs
node tests/browser.mjs https://yogurtgen.github.io/AeroFace/
```

The suite starts and stops its own local preview server when no URL is supplied. Test fixtures, screenshots, downloads and results are written to ignored `test-results/`. The front detector and appearance tests use an official public MediaPipe portrait fixture. Side detection uses a generated synthetic profile render, including a mirrored version. User-supplied photos are tested separately only on the local machine and are not committed.

Uploaded photos are fitted locally to a square around one detected face, including contour padding. If detection fails or the view is unsuitable, the full image is retained. Full photo in the editor restores the uncropped upload and invalidates landmarks and appearance results. Crops do not upscale source pixels; profile landmarks are carried from the original detection into crop coordinates without changing their geometry. Front landmarks are detected against the displayed crop. Both blobs remain session-only. Rating conventions and source research are documented in [the research notes](docs/rating-research.md).

Profile uploads preserve the successful uncropped landmark result when a square crop is created. The first scan transfers those coordinates without another inference. Detect again evaluates the original pixels and maps the fresh result through the exact saved crop transform. Editing an image discards that transform. Sanity checks reject inverted jaw segments, and the editor exposes direct controls for the jaw corner, near-ear point and chin. These checks do not establish accurate skeletal measurements; all profile readings still need visual review.
