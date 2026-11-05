import { translate, type Language } from './i18n';
import { measurementLines } from './measurement-lines';
import { RUBRIC, SIDE_LABEL, calculateMetrics, requiredSides, scoreMetrics, scoreText, tierLabel, tiers, totalScore, contourAngles, type RatingReference, type Mode } from './analysis';
import type { Photos } from './photos';
import {radarLabels,radarPoint,radarPoints} from './radar';
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportReport(photos: Photos, mode: Mode, includePhotos: boolean, created: Date, language: Language = 'en', reference:RatingReference = 'man') {
  const t=(text:string)=>translate(text,language);
  const sides = requiredSides(mode), appearance=mode!=='profile'?photos.front?.appearance:undefined;
  const canvas = document.createElement('canvas'); canvas.width = 1440; canvas.height = includePhotos ? (sides.length===2?2920:2480) : (sides.length===2?2400:1960);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f6f9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff'; ctx.fillRect(64, 64, 1312, canvas.height - 128);
  const text = (value: string, x: number, y: number, size = 24, color = '#222936', weight = 400) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px Geist, system-ui, sans-serif`; ctx.fillText(t(value), x, y);
  };
  text('AeroFace', 116, 148, 36, '#1d2530', 600);
  text('Face analysis report', 116, 220, 48, '#1d2530', 500);
  text(`${t(mode === 'full' ? 'Full analysis' : SIDE_LABEL[mode])} · ${created.toLocaleDateString(language==='id'?'id-ID':'en-GB')}`, 116, 266, 23, '#657080');
  const metrics = Object.fromEntries(sides.map(side => { const p = photos[side]!; return [side, calculateMetrics(side, p.points, p.width, p.height)]; }));
  const scores = Object.fromEntries(sides.map(side => [side, scoreMetrics(metrics[side])]));
  const total = totalScore(mode, scores)!;
  text(appearance?'AI appearance estimate · front photo':'Geometry only · appearance not rated', 116, 340, 22, '#657080');
  text('Tier', 920, 340, 22, '#657080');
  text(`${scoreText(appearance?.score??total,language)} / 10`, 116, 420, 76, '#245fc1', 500);
  text(appearance?tierLabel(appearance.score,reference):'Not assigned', 920, 410, 36, '#245fc1', 500);
  if(appearance&&appearance.score<5)text('Sub-5',920,447,20,'#657080');
  text(appearance?appearance.model:RUBRIC,116,468,22,'#657080');
  text('AI estimates and geometry are separate. Experimental model; not a validated PSL scale.',116,505,20,'#657080');
  text(reference==='man'?'Reference: Man':'Reference: Woman',116,539,20,'#657080');
  if(mode==='full')text(`${t('Combined geometry')}: ${scoreText(total,language)} / 10`,116,574,20,'#657080');
  let y = 610;
  text('Geometry profile',116,y,27,'#1d2530',500);y+=26;
  for(let index=0;index<sides.length;index++){
    const side=sides[index],width=sides.length===2?572:1180,x=116+index*608,scale=1.12;
    ctx.save();ctx.translate(x+(width-420*scale)/2,y);ctx.scale(scale,scale);
    const polygon=(points:{x:number;y:number}[])=>{ctx.beginPath();points.forEach((point,i)=>i?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.closePath();};
    ctx.strokeStyle='#dce5f1';ctx.lineWidth=1;
    for(const level of[.2,.4,.6,.8,1]){polygon([0,1,2,3].map(i=>radarPoint(i,level)));ctx.stroke();}
    for(let i=0;i<4;i++){const p=radarPoint(i,1);ctx.beginPath();ctx.moveTo(210,152);ctx.lineTo(p.x,p.y);ctx.stroke();}
    const points=radarPoints(metrics[side]);polygon(points);ctx.fillStyle='#699bdb26';ctx.fill();ctx.strokeStyle='#6995cf';ctx.lineWidth=1.8;ctx.stroke();
    const positions:[[number,number,CanvasTextAlign],[number,number,CanvasTextAlign],[number,number,CanvasTextAlign],[number,number,CanvasTextAlign]]=[[210,35,'center'],[312,147,'left'],[210,275,'center'],[108,147,'right']];
    metrics[side].forEach((metric,i)=>{const[lx,ly,align]=positions[i];ctx.textAlign=align;ctx.font='15px Geist, sans-serif';ctx.fillStyle='#6b7f9b';ctx.fillText(t(radarLabels[metric.id]),lx,ly);ctx.fillStyle='#3c659b';ctx.fillText(scoreText(metric.score,language),lx,ly+18);});
    ctx.restore();text(SIDE_LABEL[side],x+width/2-60,y+354,20,'#657080');
  }
  y+=390;text('Geometry profile · 0–10, separate from the AI estimate',116,y,19,'#657080');y+=46;
  if (includePhotos) {
    const areaWidth = sides.length === 2 ? 572 : 1180;
    for (let index = 0; index < sides.length; index++) {
      const side = sides[index], photo = photos[side]!;
      const bitmap = await createImageBitmap(photo.blob);
      const x = 116 + index * 608, scale = Math.min(areaWidth / photo.width, 410 / photo.height);
      const width = photo.width * scale, height = photo.height * scale, offset = x + (areaWidth - width) / 2;
      ctx.fillStyle = '#f1f3f6'; ctx.fillRect(x, y, areaWidth, 410);
      ctx.drawImage(bitmap, offset, y + (410 - height) / 2, width, height); bitmap.close();
      const py = y + (410 - height) / 2;
      ctx.save();ctx.beginPath();ctx.rect(offset,py,width,height);ctx.clip();
      ctx.strokeStyle = '#3b8bff'; ctx.lineWidth = 2;
      for (const line of measurementLines(side,photo.points,photo.width,photo.height)) {
        ctx.setLineDash(line.reference?[5,4]:[]);ctx.beginPath();ctx.moveTo(offset+line.from.x*width,py+line.from.y*height);ctx.lineTo(offset+line.to.x*width,py+line.to.y*height);ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
      text(SIDE_LABEL[side], x, y + 447, 24);
    }
    y += 510;
  }
  for (const side of sides) {
    text(`${t(SIDE_LABEL[side])}  ·  ${scoreText(scores[side],language)}/10`, 116, y, 30, '#1d2530', 500); y += 52;
    text(photos[side]!.source === 'auto' ? 'Automatic landmarks, reviewed by you' : 'Manual landmarks, placed by you', 116, y, 20, '#657080'); y += 48;
    for (const metric of metrics[side]) {
      text(metric.name, 116, y, 25); text(metric.display, 605, y, 23, '#657080');
      text(`${scoreText(metric.score,language)} / 10`, 1050, y, 25, '#245fc1'); y += 34;
      text(`${t('Weight')} ${metric.weight}% · ${t('Rubric reference')}: ${t(metric.reference)}`, 116, y, 19, '#657080'); y += 46;
    }
    if(side==='profile'){
      text('Contour angles',116,y+10,24,'#1d2530',500);y+=50;
      for(const reading of contourAngles(photos[side]!.points,photos[side]!.width,photos[side]!.height)){
        text(reading.name,116,y,21);text(reading.degrees.toLocaleString(language==='id'?'id-ID':'en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'°',1050,y,22,'#245fc1');y+=34;
      }
      text('Chin angle is context only and excluded from scoring.',116,y,18,'#657080');y+=35;
    }
    y += 26;
  }
  const footerY = canvas.height - 240;
  text(RUBRIC, 116, footerY, 22, '#1d2530', 500);
  text('AI uses the front photo. Geometric targets and tier bands are unvalidated product choices.',116,footerY+42,20,'#657080');
  text('Profile and ramus readings estimate 2D contours. Photos do not measure actual bone length.',116,footerY+77,20,'#657080');
  text('Created locally. Photos are included only when you choose.',116,footerY+112,20,'#657080');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed.')), 'image/png'));
  downloadBlob(blob, `AeroFace-${language==='id'?'rapor':'report'}-${mode}-${created.toISOString().slice(0,10)}.png`);
}
export function reportData(photos: Photos, mode: Mode, created: Date, language: Language = 'en', reference:RatingReference = 'man') {
  const t=(text:string)=>translate(text,language);
  const sides = Object.fromEntries(requiredSides(mode).map(side=>{const photo=photos[side]!;const metrics=calculateMetrics(side,photo.points,photo.width,photo.height);const score=scoreMetrics(metrics);return [side,{score,source:photo.source,confirmed:photo.confirmed,metrics:metrics.map(({id,name,value,display,score,weight,reference,estimated})=>({id,name:t(name),value,display:t(display),score,weight,reference:t(reference),estimated:!!estimated}))}];}));
  const geometryScore=totalScore(mode,Object.fromEntries(Object.entries(sides).map(([side,data])=>[side,data.score])))!;
  const appearance=mode!=='profile'?photos.front?.appearance:undefined;
  return {
    schemaVersion:3,reference,geometryScore,score:appearance?.score??null,appearance:appearance??null,
    tier:appearance?tierLabel(appearance.score,reference):null,sub5:appearance?appearance.score<5:null,
    tierBands:tiers.map(tier=>({...tier,label:tierLabel(tier.min,reference)})),
    contourAngles:mode!=='front'&&photos.profile?contourAngles(photos.profile.points,photos.profile.width,photos.profile.height).map(({id,name,degrees})=>({id,name:t(name),degrees,estimated:true,scored:id!=='chin-contour'})):[],
    scoring: { appearance:'FaceONNX ResNet-18; BGR means 104/117/123, divided by 255; raw output times two, clipped to 0–10; shared gender model',metric:'10 / (1 + ((value - target) / tolerance)^2)', view:'weighted geometric mean', full:'equal arithmetic mean of front and profile' },
    tierNote:t('AI estimates and geometric measurements are separate. Lines do not explain the AI decision. Experimental model; not a validated PSL rating.'),
    product: 'AeroFace', rubric: RUBRIC, mode, language, created: created.toISOString(),
    note: t('Subjective proportion rubric; not a medical assessment or objective attractiveness score.'),
    sides,
  };
}
