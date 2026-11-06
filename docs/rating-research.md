# Rating references and implementation decisions

Reviewed 6 November 2026. The user chose a 0–10 app convention, independent human consensus and privacy as the first priority.

[FreePSL](https://freepsl.com/) groups appearance into harmony, dimorphism, angularity and miscellaneous features, using a 1–8 scale. This is a community/product convention, not validation of AeroFace's predictor. Its published categories are useful vocabulary; their rarity claims do not supply a representative calibration dataset.

[TryPSL's own methodology](https://trypsl.com/methodology) publishes geometry weights and a nonlinear 1–8 conversion. It explicitly describes those conversion anchors as product parameters and reports that its reference set contains 17 faces, 16 synthetic, without human attractiveness labels. We do not copy those parameters or treat its scores as ground truth. Its privacy design also differs: its optional AI report sends photos to a provider and saves reports. AeroFace does not use that service.

[SCUT-FBP5500's original release](https://github.com/HCIILAB/SCUT-FBP5500-Database-Release) uses 5,500 frontal images and ratings from 60 volunteers on a 1–5 scale. It documents Asian/Caucasian male/female subsets and benchmark regressors, while restricting the release to non-commercial research. [MEBeauty's original release](https://github.com/fbplab/MEBeauty-database) provides a broader multi-ethnic sample of 2,550 images rated by about 300 people, also restricted to non-commercial research. Neither release is downloaded, redistributed, used to fit a mapping, or used to replace the shipped model here.

The original study [Modeling individual preferences reveals that face beauty is not universally perceived across cultures](https://pmc.ncbi.nlm.nih.gov/articles/PMC8162177/) reports culture-specific attractiveness preferences. This supports evaluating a model against the intended raters rather than treating one geometric face template as universal. It does not establish target ratios or weights for AeroFace.

AeroFace therefore retains one documented 0–10 convention with Man/Woman terminology. The tier guide shows the equivalent labels together. The harmony chart describes the existing four measured 2D proportions; it is not a newly trained appearance or dimorphism model. Skin quality, facial fat, eye depth and hair density are not inferred from these landmarks. No population Top % labels are generated.

The current improvements are automatic reversible face framing, six framing/mirror inference checks, visible input sensitivity and a locally fitted monotone consensus mapping. No real consensus data has been supplied, so there is no active default calibration or demonstrated accuracy gain. [Collection and validation requirements](calibration.md) keep training and validation separate by person and use independent ratings directly on the chosen 0–10 convention.

All current image processing and inference remain in the browser. GitHub Pages distributes static files, not photo inference. Any future remote model would require a separate, explicit choice after the provider, transmitted data and retention behavior can be reviewed; no remote-image path is implemented.
