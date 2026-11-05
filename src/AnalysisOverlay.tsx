import { Check, ScanFace } from 'lucide-react';
import { useI18n } from './i18n';
import type { DetectionPhase } from './photos';
export default function AnalysisOverlay({phase,appearance=false}:{phase:DetectionPhase;appearance?:boolean}) {
  const {t}=useI18n(),phases:DetectionPhase[]=appearance?['runtime','model','detecting','geometry','rating']:['runtime','model','detecting','geometry'],index=phase==='visualizing'?phases.length-1:phases.indexOf(phase);
  const titles=['Preparing the local model','Loading landmark model','Locating facial landmarks','Reading facial geometry','Running the local appearance model…'];
  return <div className="analysis-visuals" role="status" data-phase={phase} aria-label={t('Local analysis in progress')}>
    <div className="scan-grid"/><div className="scan-sweep"><span/></div><div className="scan-reticle"><i/><i/><i/><i/></div>
    <div className="analysis-status glass"><span className="analysis-status-icon"><ScanFace size={21}/></span><div><span className="analysis-kicker">{t(phase==='visualizing'?'Preparing the measurement reveal.':'Your browser is doing the work.')}</span><strong key={phase}>{t(phase==='visualizing'?'Visualizing your measurements…':titles[index])}</strong></div><span className="spinner"/>
      <div className="analysis-stage-track"><span style={{transform:`scaleX(${(index+1)/phases.length})`}}/></div>
      <ol>{['Prepare','Model','Landmarks','Geometry',...(appearance?['Appearance']:[])].map((label,item)=><li key={label} className={item<index?'done':item===index?'current':''}>{item<index?<Check size={10}/>:<span/>}{t(label)}</li>)}</ol>
    </div>
  </div>;
}
