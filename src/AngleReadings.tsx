import { contourAngles, frontDetails, type Side } from './analysis';
import type { Photo } from './photos';
import { useI18n } from './i18n';
export default function AngleReadings({photo,side='profile'}:{photo:Photo;side?:Side}){
  const {t,language}=useI18n();
  if(side==='front'){
    let details:ReturnType<typeof frontDetails>;
    try{details=frontDetails(photo.points,photo.width,photo.height);}catch{return null;}
    return <div className="angle-readings front-details"><h3>{t('Additional facial details')}</h3><dl>{details.map(item=><div key={item.id}><dt>{t(item.name)}</dt><dd>{(Math.abs(item.value)<1e-8?0:item.value).toLocaleString(language==='id'?'id-ID':'en-US',{minimumFractionDigits:item.unit==='ratio'?2:1,maximumFractionDigits:item.unit==='ratio'?2:1})}{item.unit==='degrees'?'°':'×'}</dd></div>)}</dl><p>{t('Eye tilt is corrected for head roll; positive means the outer corner is higher. Left/right refer to the photo. Mouth width is divided by cheek width. These 2D details are context only and do not change either score.')}</p></div>;
  }
  let angles:ReturnType<typeof contourAngles>=[];
  try{angles=contourAngles(photo.points,photo.width,photo.height);}catch{return null;}
  return <div className="angle-readings"><h3>{t('Contour angles')}</h3><dl>{angles.map(item=><div key={item.id}><dt>{t(item.name)}</dt><dd>{item.degrees.toLocaleString(language==='id'?'id-ID':'en-US',{minimumFractionDigits:1,maximumFractionDigits:1})}°</dd></div>)}</dl><p>{t('Chin angle: lower lip–chin–jaw corner. Context only, excluded from scoring. All angles describe 2D surface contours.')}</p></div>;
}
