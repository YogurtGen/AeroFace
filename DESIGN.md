# AeroFace design direction

User brief: browser-local front, profile or combined facial proportion analysis; explain measurements on the selected photo; optional report downloads; GitHub Pages hosting; liquid glass theme.

The initial tasteskill app direction was Achromatic Ledger, seed 981277671. The user's later liquid glass request supersedes that style's prohibition on translucent materials. The retained parts are neutral surfaces, a single data hue, Geist typography and clear numerical hierarchy. No user photograph is replaced by an invented portrait or demonstration score.

The product's main visual is its own measurement process: points and contour relationships, first in clearly labeled original guide illustrations and then on the user's actual photo. Blue identifies measurement marks, while navigation stays neutral. There are no rankings or comparisons between users.

## Screens

- Selection answers: which angle do I want to analyze, and which photo should I choose? Front, profile and full modes have independent file requirements.
- Measurement answers: where did this measurement come from? A photo editor, keyboard-adjustable points and an explanation pane connect the evidence and score. Profile points initialize automatically when the pose is supported and can be corrected manually.
- Report answers: what did this selected analysis produce? Side scores, raw measurements, weights and report export controls share a consistent hierarchy. Unselected sides remain unscored.

## Material and motion

Glass is restricted to navigation, mode selection and floating explanatory controls. Measurement photos retain their original geometry. The report has stable, readable surfaces and prints onto a solid background. The user can reduce transparency. System reduced-transparency, increased-contrast and reduced-motion preferences have fallbacks.

The user requested a more expressive motion layer. The first selection view has a one-time staggered arrival, a pointer-responsive guide illustration, and interactive anatomy highlights. Stage changes use interruptible native View Transitions where available. Buttons, upload cards, selected lines, metric explanations, and report sections have their own feedback. Actual user-photo geometry remains stable while it is read or edited.

Button feedback uses 160 ms, the mode indicator uses a retargetable 240 ms transform transition, and measurement lines appear in a 220 ms opacity transition. The initial onboarding choreography uses a longer 600 ms budget because it is seen once. Blur is static rather than animated. Inference runs in a worker; its model-loading and detection messages drive the scanning overlay. At the user's request, scanning now has a minimum three-second presentation. When inference finishes early, the status explicitly changes to visualization; no fake accuracy or percentage is shown. Session clearing aborts the pending reveal. Keyboard interaction disables decorative transitions, and Settings offers a motion toggle in addition to system reduced-motion support.

## Language and line explanations

English is the default, with English/Indonesia controls in Settings. Copy, landmark guidance, metric descriptions, formulas, errors, print, PNG and JSON reports follow the selected language. A URL fragment retains the language without a server request or browser storage.

Every displayed measurement/reference segment has an explicit identity and named endpoints. Selecting a line on the photo, using its keyboard-accessible SVG control, or choosing its legend opens its explanation and score relationship. Dashed marks distinguish reference lines. Lip-offset lines are perpendicular projections onto the nose–chin line, matching the scoring calculation. The symmetry axis has a reference label instead of an arbitrary pixel-length claim.

The shared profile illustration now has a defined nose, lips, chin, ear and jaw contour. Photo-help illustrations crop to the head, and stack vertically on phones. Small photo inputs remain usable with a visible resolution warning instead of a hard rejection.

Geometry 2.0 replaces the old perfect-score intervals with continuous target-distance curves and uses a weighted geometric mean within each view. The report discloses community-inspired tier bands and the overlapping Sub-5 tag in both languages. Tier assignment now requires a successful appearance-model estimate; geometry never substitutes for missing appearance inference. The labels do not establish PSL validity, population rank or equivalence to a celebrity. Four measurements per view do not assess facial fullness, skin texture or overall attractiveness.

## Visual verification

Production screenshots were inspected at 1440, 768 and 390 px. The local and public browser suites also check horizontal overflow at these widths.

Tasteskill inspection allowances are `glass`, `gradient`, `button-fx` and `app-title-size`: the first three implement the user's glass material, including its small highlight and depth; the larger title belongs to the initial photo-selection introduction rather than a repeated data heading. Report and measurement typography use the working app scale.

The final inspection has no FAIL findings. One warning is accepted: the short selection screen contains a high share of 11–12 px metadata, file guidance and privacy labels; primary choices and controls use 13 px and body copy uses 14 px. No visible selection-screen label is below 11 px, and the disabled primary button's contrast was increased after inspection.

Self-review after looking at all desktop, tablet and phone captures: design 8/10, usability 8/10, creativity 7/10, content 8/10 (weighted 7.8/10). These are internal design judgments, not external endorsements. The main remaining limitation is physical-device validation: the UI and reduced-motion behavior were checked in Chrome automation, not on an actual mid-range phone. The camera permission flow and system print dialog still warrant manual device checks.

## Line art, reference and report update

Front, profile and tier illustrations use hairless native SVG portraits. Continuous curved contours connect the scalp, cheeks, jaw and chin, with a small number of strokes for eyes, nose, lips and ears. Tier examples vary eye shape, spacing, cheek width, jaw width and chin proportions instead of hairstyle. Both Man and Woman references use the same hairless treatment. Base strokes retain the interface's blue-gray `#8294ae`; measurement highlights retain `#4e8cda`. Measurement captions sit below the portrait rather than across its features. Only the selected measurement group is emphasized. The tier portraits are illustrative examples, not calibrated reference faces. Earlier generated proportion studies and their prompts are recorded in `design/illustration-prompts.md`; the application uses the current SVG artwork.

The revised portraits emphasize the brow, eye sockets, cheek planes and a tapered jaw. Upper tiers retain a lean outline; Adam and True Adam do not gain width with their labels. Lower-tier examples instead vary eye spacing, eye slope, small asymmetries, the middle-face length and chin proportions. Short internal cheek strokes provide structure without hatching or shading. The same component supplies the main preview, both photo-help views and the tier guide. Its structural references are [John Asaro's Planes of the Head](https://www.planesofthehead.com/original_head.php) and [Andrew Loomis's front/profile construction plate](https://en.wikisource.org/wiki/Page:Andrew_Loomis,_Drawing_the_Head_and_Hands.pdf/38). The SVG paths are original; no external reference image is shipped or requested at runtime.

Man/Woman is user-selected. It controls the illustrated reference and community terminology while the documented appearance model remains shared. The app does not infer gender or invent a separate calibration.

The expanded tier guide includes an illustrated Sub-5 explanation above the eight primary bands. Three example portraits show the range it spans rather than inventing a single Sub-5 face shape. Sub-5 remains an overlapping label below 5: 4.7 is MTN + Sub-5, while 5.3 is MTN. The explanation, examples and active state also follow the Woman terminology and Indonesian locale. This UI clarification does not recalibrate the appearance model or alter the tier boundaries.

A score within 0.2 points of the next app band displays a proximity note in the screen, PDF and PNG reports, for example MTN with “Near HTN · starts at 6.0”. This explains a hard boundary rather than claiming model confidence or changing the score. The JSON report records the next threshold separately.

The user's feature-breakdown reference informs additional front-view context: left/right eye-corner tilt relative to the eye-center line, corrected for head roll, and mouth width divided by cheek width. These values use pixel-correct landmarks, appear during review and in every report format, and have no scoring weight. They do not estimate eye depth, body fat, skin health, hair density or population percentiles. Preprocessing was cross-checked against the publisher's [FaceBeautyEstimator](https://github.com/FaceONNX/FaceONNX/blob/main/netstandard/FaceONNX.Addons/face/classes/FaceBeautyEstimator.cs) and [usage example](https://github.com/FaceONNX/FaceONNX/blob/main/netstandard/Examples/EmotionAndBeautyEstimation/Program.cs): BGR means, division by 255 and output scaling match. That implementation check does not establish calibration to community tiers.

The report separates the large numeric estimate and its tier into two aligned columns, including in print and PNG. A four-axis radar chart lives under each view heading before metric details. Its axes come directly from that view's geometric measurements, not AI confidence. Print places the photo and chart alongside each other and retains the numeric table. The contextual chin angle is identified as unscored.

PNG downloads render the existing PDF report DOM with its print rules in an isolated A4 viewport. The white page, 16 mm margins, brand, summary, photo/chart row, metric tables, contour readings and notes therefore share one template. Images use a fixed 2× pixel density and grow vertically for a full report. Public fonts are embedded from the local stylesheet so the render works offline; the font policy permits these data URLs while network fonts remain restricted to the app's origin. Session photos are embedded only in the temporary render and never enter the renderer's resource cache. Elements hidden by the print rules are removed before SVG rasterization. The temporary document is removed on success or failure. The existing photo-inclusion checkbox and selected language apply to both formats.

The AI now evaluates three centered framing scales with paired horizontal mirrors and reports their median. Its base-model range is explicitly sensitivity to those transformations, not calibrated confidence. Consensus calibration is an optional, session-only setting fitted from anonymous rating CSV data. Weighted isotonic fitting uses training people only; separate validation people must show lower MAE and no higher RMSE before activation. Unsupported ranges keep the base prediction. No default mapping, synthetic reference scores or claimed population accuracy are shipped. Collection requirements and limitations live in `docs/calibration.md`.

When the evaluated variants cross a tier boundary, the badge and print summary show the observed span and the guide highlights every observed band. The headline identifies its number as the median. A near-boundary note is suppressed when multiple bands were already observed. For an active mapping, every variant must lie inside calibration support before a calibrated span is displayed; raw and calibrated samples remain distinguishable in JSON. These spans expose model sensitivity rather than asserting an attractiveness confidence interval.

The user's mismatching PNG used the old standalone canvas exporter while the supplied PDF used the print template. Online service-worker navigation therefore checks current HTML before offline fallback, and updates automatically refresh an idle page or offer a refresh action when session data is present. Installs bypass HTTP cache, activation removes obsolete app caches, and returning online or focusing the page checks for updates. Static assets remain cache-first and the application never caches user photos or reports. The export template stays shared by PNG and PDF.

Front-view ears end at the outer face contour. Short cheek-plane strokes start farther inward, leaving a clear gap from the ear lobes in the preview, photo guide and every tier illustration.

Profile review provides three direct point selectors for the visible jaw corner, near-ear contour and chin. They select existing editable landmarks without inventing additional scores. A successful original-image detection is transformed exactly into the square crop, avoiding failed or drifting re-detection after cropping. Deliberate re-detection also uses the original pixels, then the saved transform.
