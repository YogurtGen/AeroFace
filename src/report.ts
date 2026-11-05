import { RUBRIC, SIDE_LABEL, calculateMetrics, requiredSides, scoreMetrics, scoreText, totalScore, type Mode, type Side } from './analysis';
import type { Photos } from './photos';
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportReport(photos: Photos, mode: Mode, includePhotos: boolean, created: Date) {
  const sides = requiredSides(mode);
  const canvas = document.createElement('canvas'); canvas.width = 1440; canvas.height = includePhotos ? (sides.length===2?2280:1840) : (sides.length===2?1760:1320);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f6f9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff'; ctx.fillRect(64, 64, 1312, canvas.height - 128);
  const text = (value: string, x: number, y: number, size = 24, color = '#222936', weight = 400) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px Geist, system-ui, sans-serif`; ctx.fillText(value, x, y);
  };
  text('AeroFace', 116, 148, 36, '#1d2530', 600);
  text('Rapor proporsi wajah', 116, 220, 48, '#1d2530', 500);
  text(`${mode === 'full' ? 'Analisis lengkap' : SIDE_LABEL[mode]} · ${created.toLocaleDateString('id-ID')}`, 116, 266, 23, '#657080');
  const metrics = Object.fromEntries(sides.map(side => { const p = photos[side]!; return [side, calculateMetrics(side, p.points, p.width, p.height)]; }));
  const scores = Object.fromEntries(sides.map(side => [side, scoreMetrics(metrics[side])]));
  const total = totalScore(mode, scores)!;
  text(mode === 'full' ? 'Skor gabungan' : `Skor ${mode === 'front' ? 'depan' : 'samping'}`, 116, 340, 24, '#657080');
  text(`${scoreText(total)} / 10`, 116, 420, 76, '#245fc1', 500);
  text('Kecocokan dengan rubrik geometri, bukan ukuran objektif daya tarik.', 116, 468, 22, '#657080');
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
      ctx.strokeStyle = '#3b8bff'; ctx.lineWidth = 2;
      for (const metric of metrics[side]) for (const segment of metric.segments) {
        ctx.beginPath(); segment.forEach((key, i) => { const p=photo.points[key]; if(i===0) ctx.moveTo(offset+p.x*width,py+p.y*height); else ctx.lineTo(offset+p.x*width,py+p.y*height); }); ctx.stroke();
      }
      text(SIDE_LABEL[side], x, y + 447, 24);
    }
    y += 510;
  }
  for (const side of sides) {
    text(`${SIDE_LABEL[side]}  ·  ${scoreText(scores[side])}/10`, 116, y, 30, '#1d2530', 500); y += 52;
    text(photos[side]!.source === 'auto' ? 'Titik otomatis, diperiksa pengguna' : 'Titik ditempatkan manual oleh pengguna', 116, y, 20, '#657080'); y += 48;
    for (const metric of metrics[side]) {
      text(metric.name, 116, y, 25); text(metric.display, 605, y, 23, '#657080');
      text(`${scoreText(metric.score)} / 10`, 1050, y, 25, '#245fc1'); y += 34;
      text(`Bobot ${metric.weight}% · Acuan rubrik: ${metric.reference}`, 116, y, 19, '#657080'); y += 46;
    }
    y += 26;
  }
  const footerY = canvas.height - 240;
  text(RUBRIC, 116, footerY, 22, '#1d2530', 500);
  text('Rentang dan bobot adalah pilihan desain produk; belum tervalidasi sebagai skor daya tarik.',116,footerY+42,20,'#657080');
  text('Profil dan ramus adalah estimasi kontur 2D. Foto tidak mengukur panjang tulang asli.',116,footerY+77,20,'#657080');
  text('Dibuat lokal di perangkat. Foto disertakan hanya atas pilihan pengguna.',116,footerY+112,20,'#657080');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Ekspor gambar gagal.')), 'image/png'));
  downloadBlob(blob, `AeroFace-rapor-${mode}-${created.toISOString().slice(0,10)}.png`);
}
export function reportData(photos: Photos, mode: Mode, created: Date) {
  return {
    product: 'AeroFace', rubric: RUBRIC, mode, created: created.toISOString(),
    note: 'Rubrik proporsi subjektif; bukan penilaian medis atau skor objektif daya tarik.',
    sides: Object.fromEntries(requiredSides(mode).map((side: Side) => {
      const photo = photos[side]!; const metrics = calculateMetrics(side, photo.points, photo.width, photo.height);
      return [side, { score: scoreMetrics(metrics), source: photo.source, confirmed: photo.confirmed, metrics: metrics.map(({id,name,value,display,score,weight,reference,estimated})=>({id,name,value,display,score,weight,reference,estimated:!!estimated})) }];
    })),
  };
}
