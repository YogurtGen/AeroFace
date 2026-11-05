# Third-party notices

This repository includes the following third-party assets for self-contained browser execution:

**MediaPipe Tasks Vision**, copyright Google LLC, Apache License 2.0. Source: <https://github.com/google-ai-edge/mediapipe>. The vendored runtime in `public/vendor/` comes from the exact `@mediapipe/tasks-vision` npm version recorded in `package-lock.json`. The model `public/models/face_landmarker.task` is the official face landmark model, float16 version 1, distributed by Google through its MediaPipe models bucket. See the model URL and SHA-256 in README.md. A copy of Apache License 2.0 is included in `public/vendor/LICENSE-APACHE-2.0.txt`.

MediaPipe's privacy notice states that input processing is on device and that its SDK can send performance/utilization metrics. AeroFace blocks external network requests in the detection worker (fetch, XMLHttpRequest, script imports and WebSocket), serves all runtime assets locally, and tests for outbound requests. No consent to SDK analytics is requested because such requests are disabled.

**Geist**, copyright Vercel, Inc., licensed under SIL Open Font License 1.1. Font source: <https://github.com/vercel/geist-font>. Installed through `@fontsource/geist` and bundled as local font files. The package's license is included in `public/vendor/LICENSE-GEIST.txt`.

**Lucide**, ISC License. Source: <https://github.com/lucide-icons/lucide>. The license is included in `public/vendor/LICENSE-LUCIDE.txt`.

**React and React DOM**, copyright Meta Platforms, Inc. and affiliates, MIT License. Source: <https://github.com/facebook/react>. The license is included in `public/vendor/LICENSE-REACT.txt`.

The original face illustrations in `src/Illustration.tsx` are diagrams created for AeroFace, not photographs or measured examples. Browser tests download an official public MediaPipe portrait fixture for testing only; it is stored in ignored `test-results/` and never distributed with the site.
