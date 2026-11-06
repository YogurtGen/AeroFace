import type { CalibratedAppearance } from './calibration';
import { scoreText } from './analysis';
import { useI18n } from './i18n';
export default function AppearanceNotes({appearance}:{appearance:CalibratedAppearance}){
  const {t,language}=useI18n();
  return <div className="appearance-notes"><p><strong>{t('Base-model 6-view range')}: {scoreText(appearance.sensitivity.min,language)}–{scoreText(appearance.sensitivity.max,language)} / 10.</strong> <span className="screen-sensitivity">{t('Spread from framing and mirror variations, not a confidence interval.')}</span><span className="print-sensitivity">{t('Input sensitivity; not confidence.')}</span> {t(appearance.calibration.applied?'Consensus calibration applied.':appearance.calibration.reason==='outside-range'?'Outside the reference range; base estimate used.':'Consensus calibration not loaded.')}{appearance.calibration.applied&&<> {t('Base model estimate')}: {scoreText(appearance.baseScore,language)} / 10.</>}{appearance.calibration.applied&&!appearance.evaluatedSamples&&<> {t('Some variants are outside the reference range; no calibrated tier span is shown.')}</>}</p></div>;
}
