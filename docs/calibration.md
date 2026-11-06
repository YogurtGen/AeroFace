# Consensus calibration

AeroFace can fit a local monotone score mapping from independent human ratings. It does not ship a consensus mapping: no suitable, authorized, labeled calibration sample has been provided. Six-view inference improves the way photo sensitivity is checked; it does not establish agreement with human ratings.

## Collect a reference set

1. Use photos you have permission to evaluate. Use anonymous person and photo IDs. Keep photos on your device; no photos are needed in the CSV.
2. Have at least three distinct raters score every photo from 0 to 10 under one written rubric. Collect their ratings without showing the model score or other raters' answers first. Do not use celebrity names as target scores.
3. Include at least 30 different people in `train` and 15 other people in `validation`. Assign the split before fitting. Every photo of one person must stay in the same split. Include varied appearances and photo conditions; these minimum counts are product checks, not proof of representative sampling.
4. Analyze the same photos with the current AeroFace pipeline. **Rating CSV** downloads three blank rating rows with an anonymous photo ID, the current pipeline and its uncalibrated prediction already filled. Add a consistent anonymous `person_id` and the preassigned split; fill each rater's independent rating and combine the sheets into one CSV. Hide the prediction column from raters until collection is complete. Alternatively, download Data and use `appearance.baseScore` and `appearance.pipeline`. Earlier single-view predictions are incompatible.
5. In Settings → Consensus calibration, download the CSV template, combine the predictions and independent ratings, then import the completed file. Each row represents one rater's rating of one photo. Use decimal points and the exact header order.

```csv
person_id,photo_id,split,prediction,rater_id,rating,pipeline
```

Use your collected values; there are no example target ratings to copy. `split` is `train` or `validation`, and `pipeline` is `aligned-six-view-v1`. A rater ID may occur on different photos but only once for each photo. Different photos of the same person share `person_id` and have distinct `photo_id` values.

## Use one 0–10 convention

Give every rater the same instructions before collection. Use the full 0–10 scale for overall perceived facial appearance in the supplied photo. Consider how the features work together; do not calculate a rating by counting isolated features, copying the geometry score or recognizing a celebrity. Evaluate the same crop and keep the answers independent. Record pose, lighting and resolution separately so they can be audited.

| Score interval | Man label | Woman label | Rating anchor for this project |
| --- | --- | --- | --- |
| 0–<3 | Sub-3 | Sub-3 | Lower end of the chosen appearance rubric |
| 3–<4 | LTN | LTB | Below the middle reference band |
| 4–<6 | MTN | MTB | Middle reference band; 5 is the convention's center |
| 6–<7 | HTN | HTB | Above the middle reference band |
| 7–<8 | Chadlite | Stacylite | High fit to the chosen appearance rubric |
| 8–<9 | Chad | Stacy | Very high fit |
| 9–<9.5 | Adam | Eve | Upper reference band |
| 9.5–10 | True Adam | True Eve | Extreme upper end of this convention |

These anchors define an app convention, not measured population averages, rarity or percentiles. Sub-5 overlaps every score below 5. Do not force a particular score distribution or convert another site's 1–8 ratings by multiplication. Collect fresh 0–10 judgments. The fitted mapping can improve agreement with the supplied consensus but preserves the base model's ranking; it cannot repair every misordered pair of faces. A model that ranks the reference set poorly needs different training, not progressively stronger score offsets. See [the research notes](rating-research.md).

## What the fitter checks

- It averages the human ratings per photo and weights each person equally, even if someone has more photos.
- Weighted isotonic regression fits a monotone mapping using only the training split. It preserves model ordering rather than learning new visual features.
- Validation people never enter the fit. Both splits must stay separate by person ID, and each photo must have at least three raters.
- At least 80% of validation weight must lie inside the training prediction range. The mapping is accepted only if validation MAE decreases and RMSE does not increase.
- Scores outside the training range keep the uncalibrated estimate. There is no extrapolation to unsupported tiers.

Validation metrics describe only the supplied reference set. Do not keep selecting mappings against the same validation set and call that an independent test; use a further untouched evaluation set for release claims. Anonymous IDs cannot prove that raters are independent or that two IDs are different people. Sampling quality and collection discipline still matter. A pooled mapping does not establish separate accuracy for men, women, skin tones, ages or geographic groups.

## Privacy and reproducibility

CSV content and the fitted mapping stay in memory for the current tab. Clearing the session also removes the mapping. JSON report downloads can include the curve and aggregate validation metrics, but never the reference CSV, person IDs, rater IDs or reference photos. Nothing is uploaded, and the app does not store a calibration in localStorage or IndexedDB.

The image-variant range in a report measures framing/mirror sensitivity. It is not a confidence interval or a population percentile. The app's MTN/HTN and other labels remain community-inspired product bands; agreement with consensus ratings does not validate those names as a universal scale.

If variants occupy different bands, the visible tier spans the observed endpoints. The numeric score and Sub-5 tag still refer to the median. JSON retains `medianTier`, `observedTiers`, raw model `samples` and, when fully supported, `evaluatedSamples` on the calibrated scale. A calibrated span is withheld when any variant is outside the training prediction range.

Method references: [weighted isotonic regression and interpolation](https://scikit-learn.org/stable/modules/isotonic.html), [test-time augmentation research](https://ojs.aaai.org/index.php/AAAI/article/view/26735). The augmentation paper studies classification; it is not validation of AeroFace's appearance regressor.
