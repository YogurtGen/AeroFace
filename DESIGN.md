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

The user rejected both bald mannequin drawings and a detailed sculptural treatment, then requested simpler line art. Generated front/profile references were reduced to native SVG silhouettes with a few hair, eye, nose, mouth, ear and jaw contours. Only the selected measurement group is emphasized. The same SVG language supplies illustrative tier outlines; these are not calibrated reference faces. Final generation prompts and source images are recorded in `design/illustration-prompts.md`.

Man/Woman is user-selected. It controls the illustrated reference and community terminology while the documented appearance model remains shared. The app does not infer gender or invent a separate calibration.

The report separates the large numeric estimate and its tier into two aligned columns, including in print and PNG. A four-axis radar chart lives under each view heading before metric details. Its axes come directly from that view's geometric measurements, not AI confidence. Print places the photo and chart alongside each other and retains the numeric table. The contextual chin angle is identified as unscored.
