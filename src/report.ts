import { translate, type Language } from './i18n';
import { measurementLines } from './measurement-lines';
import { RUBRIC, SIDE_LABEL, calculateMetrics, requiredSides, scoreMetrics, scoreText, totalScore, type Mode, type Side } from './analysis';
import type { Photos } from './photos';
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportReport(photos: Photos, mode: Mode, includePhotos: boolean, created: Date, language: Language = 'en') {
  const t=(text:string)=>translate(text,language);
  const sides = requiredSides(mode);
  const canvas = document.createElement('canvas'); canvas.width = 1440; canvas.height = includePhotos ? (sides.length===2?2280:1840) : (sides.length===2?1760:1320);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f6f9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff'; ctx.fillRect(64, 64, 1312, canvas.height - 128);
  const text = (value: string, x: number, y: number, size = 24, color = '#222936', weight = 400) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px Geist, system-ui, sans-serif`; ctx.fillText(t(value), x, y);
  };
  text('AeroFace', 116, 148, 36, '#1d2530', 600);
  text('Facial proportion report', 116, 220, 48, '#1d2530', 500);
  text(`${t(mode === 'full' ? 'Full analysis' : SIDE_LABEL[mode])} · ${created.toLocaleDateString(language==='id'?'id-ID':'en-GB')}`, 116, 266, 23, '#657080');
  const metrics = Object.fromEntries(sides.map(side => { const p = photos[side]!; return [side, calculateMetrics(side, p.points, p.width, p.height)]; }));
  const scores = Object.fromEntries(sides.map(side => [side, scoreMetrics(metrics[side])]));
  const total = totalScore(mode, scores)!;
  text(mode === 'full' ? 'Combined score' : mode === 'front' ? 'Front score' : 'Side score', 116, 340, 24, '#657080');
  text(`${scoreText(total,language)} / 10`, 116, 420, 76, '#245fc1', 500);
  text('Fit to a geometry rubric, not an objective measure of attractiveness.', 116, 468, 22, '#657080');
  let y = 530;
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
    y += 26;
  }
  const footerY = canvas.height - 240;
  text(RUBRIC, 116, footerY, 22, '#1d2530', 500);
  text('Ranges and weights are product-design choices, not validated attractiveness standards.',116,footerY+42,20,'#657080');
  text('Profile and ramus readings estimate 2D contours. Photos do not measure actual bone length.',116,footerY+77,20,'#657080');
  text('Created locally. Photos are included only when you choose.',116,footerY+112,20,'#657080');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed.')), 'image/png'));
  downloadBlob(blob, `AeroFace-${language==='id'?'rapor':'report'}-${mode}-${created.toISOString().slice(0,10)}.png`);
}
export function reportData(photos: Photos, mode: Mode, created: Date, language: Language = 'en') {
  const t=(text:string)=>translate(text,language);
  return {
    product: 'AeroFace', rubric: RUBRIC, mode, language, created: created.toISOString(),
    note: t('Subjective proportion rubric; not a medical assessment or objective attractiveness score.'),
    sides: Object.fromEntries(requiredSides(mode).map((side: Side) => {
      const photo = photos[side]!; const metrics = calculateMetrics(side, photo.points, photo.width, photo.height);
      return [side, { score: scoreMetrics(metrics), source: photo.source, confirmed: photo.confirmed, metrics: metrics.map(({id,name,value,display,score,weight,reference,estimated})=>({id,name:t(name),value,display:t(display),score,weight,reference:t(reference),estimated:!!estimated})) }];
    })),
  };
}
