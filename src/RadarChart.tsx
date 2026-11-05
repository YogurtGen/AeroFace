import { useId } from 'react';
import { SIDE_LABEL, scoreText, type Metric, type Side } from './analysis';
import { radarLabels,radarPoint,radarPoints } from './radar';
import { useI18n } from './i18n';
export default function RadarChart({metrics,side}:{metrics:Metric[];side:Side}){
  const {t,language}=useI18n(),id=useId(),points=radarPoints(metrics),labels=[{x:210,y:35,anchor:'middle'},{x:312,y:147,anchor:'start'},{x:210,y:275,anchor:'middle'},{x:108,y:147,anchor:'end'}]as const;
  return <figure className="radar-chart"><svg viewBox="0 0 420 320" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>{t(SIDE_LABEL[side])} · {t('Geometry profile')}</title><desc id={`${id}-desc`}>{metrics.map(metric=>`${t(metric.name)}: ${scoreText(metric.score,language)}/10`).join('. ')}</desc>
    <g fill="none" stroke="#dce5f1" strokeWidth="1">{[.2,.4,.6,.8,1].map(level=><polygon key={level} points={[0,1,2,3].map(index=>{const p=radarPoint(index,level);return`${p.x},${p.y}`;}).join(' ')}/>)}{metrics.map((metric,index)=>{const end=radarPoint(index,1);return <line key={metric.id} x1="210" y1="152" x2={end.x} y2={end.y}/>;})}</g>
    <polygon points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="#699bdb" fillOpacity=".15" stroke="#6a98d2" strokeWidth="1.8"/>
    {points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="3" fill="#5b8dc9" stroke="#fff" strokeWidth="1.5"/>)}
    {[2,6,10].map(value=><text key={value} x="218" y={152-86*value/10+4} fill="#9baac0" fontSize="9">{value}</text>)}
    {metrics.map((metric,index)=>{const label=labels[index];return <text key={metric.id} x={label.x} y={label.y} textAnchor={label.anchor} fill="#6b7f9b" fontSize="11"><tspan x={label.x}>{t(radarLabels[metric.id])}</tspan><tspan x={label.x} dy="17" fill="#3c659b" fontSize="12">{scoreText(metric.score,language)}</tspan></text>;})}
  </svg><figcaption>{t('Geometry profile · 0–10, separate from the AI estimate')}</figcaption></figure>;
}
