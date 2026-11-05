import { contourAngles } from './analysis';
import type { Photo } from './photos';
import { useI18n } from './i18n';
export default function AngleReadings({photo}:{photo:Photo}){
  const {t,language}=useI18n();
  let angles:ReturnType<typeof contourAngles>=[];
  try{angles=contourAngles(photo.points,photo.width,photo.height);}catch{return null;}
  return <div className="angle-readings"><h3>{t('Contour angles')}</h3><dl>{angles.map(item=><div key={item.id}><dt>{t(item.name)}</dt><dd>{item.degrees.toLocaleString(language==='id'?'id-ID':'en-US',{minimumFractionDigits:1,maximumFractionDigits:1})}°</dd></div>)}</dl><p>{t('Chin angle: lower lip–chin–jaw corner. Context only, excluded from scoring. All angles describe 2D surface contours.')}</p></div>;
}
