import { translate, type Language } from './i18n';
import { getFontEmbedCSS, toBlob } from 'html-to-image';
import { RUBRIC, calculateMetrics, requiredSides, scoreMetrics, tierLabel, tiers, totalScore, contourAngles, frontDetails, nearbyTier, type RatingReference, type Mode } from './analysis';
import type { Photos } from './photos';
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportReport(report: HTMLElement, mode: Mode, created: Date, language: Language = 'en') {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;pointer-events:none';
  document.body.append(frame);
  try {
    const fontEmbedCSS = await getFontEmbedCSS(report);
    const doc = frame.contentDocument!;
    const base = doc.createElement('base'); base.href = document.baseURI;
    const style = doc.createElement('style');
    // Activate the PDF's print rules in an isolated A4 viewport without changing the app.
    style.textContent = fontEmbedCSS + '\n' + Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules).filter(rule => rule.type !== CSSRule.FONT_FACE_RULE).map(rule => rule.cssText
      .replace(/@media\s+print\b/g, '@media all')
      .replace(/url\((['"]?)(.*?)\1\)/g, (_match, _quote, url:string) => `url("${new URL(url, sheet.href ?? document.baseURI).href}")`))).join('\n');
    doc.head.append(base, style); doc.documentElement.lang = language;
    doc.body.style.cssText = 'width:210mm;min-height:297mm;padding:16mm;box-sizing:border-box';
    const copy = report.cloneNode(true) as HTMLElement;
    doc.body.append(copy);
    // Embed session photos before rendering so the library never caches their blob URLs.
    await Promise.all(Array.from(copy.querySelectorAll('img'), async image => {
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      image.src = canvas.toDataURL('image/png');
      await image.decode();
    }));
    await Promise.all([400, 500, 600].map(weight => doc.fonts.load(`${weight} 12px Geist`)));
    // SVG subtrees are copied as markup, so omit groups hidden by the print stylesheet.
    for (const element of copy.querySelectorAll('*')) {
      if (doc.defaultView!.getComputedStyle(element).display === 'none') element.remove();
    }
    const blob = await toBlob(doc.body, {
      width: Math.ceil(doc.body.getBoundingClientRect().width), height: Math.ceil(doc.body.scrollHeight),
      pixelRatio: 2, backgroundColor: '#fff', fontEmbedCSS,
    });
    if (!blob) throw new Error('Image export failed.');
    downloadBlob(blob, `AeroFace-${language==='id'?'rapor':'report'}-${mode}-${created.toISOString().slice(0,10)}.png`);
  } finally { frame.remove(); }
}
export function reportData(photos: Photos, mode: Mode, created: Date, language: Language = 'en', reference:RatingReference = 'man') {
  const t=(text:string)=>translate(text,language);
  const sides = Object.fromEntries(requiredSides(mode).map(side=>{const photo=photos[side]!;const metrics=calculateMetrics(side,photo.points,photo.width,photo.height);const score=scoreMetrics(metrics);return [side,{score,source:photo.source,confirmed:photo.confirmed,metrics:metrics.map(({id,name,value,display,score,weight,reference,estimated})=>({id,name:t(name),value,display:t(display),score,weight,reference:t(reference),estimated:!!estimated}))}];}));
  const geometryScore=totalScore(mode,Object.fromEntries(Object.entries(sides).map(([side,data])=>[side,data.score])))!;
  const appearance=mode!=='profile'?photos.front?.appearance:undefined;
  return {
    schemaVersion:3,reference,geometryScore,score:appearance?.score??null,appearance:appearance??null,
    tier:appearance?tierLabel(appearance.score,reference):null,sub5:appearance?appearance.score<5:null,
    nearbyTier:appearance?nearbyTier(appearance.score,reference):null,
    frontDetails:mode!=='profile'&&photos.front?frontDetails(photos.front.points,photos.front.width,photos.front.height).map(item=>({...item,name:t(item.name),scored:false})):[],
    tierBands:tiers.map(tier=>({...tier,label:tierLabel(tier.min,reference)})),
    contourAngles:mode!=='front'&&photos.profile?contourAngles(photos.profile.points,photos.profile.width,photos.profile.height).map(({id,name,degrees})=>({id,name:t(name),degrees,estimated:true,scored:id!=='chin-contour'})):[],
    scoring: { appearance:'FaceONNX ResNet-18; BGR means 104/117/123, divided by 255; raw output times two, clipped to 0–10; shared gender model',metric:'10 / (1 + ((value - target) / tolerance)^2)', view:'weighted geometric mean', full:'equal arithmetic mean of front and profile' },
    tierNote:t('AI estimates and geometric measurements are separate. Lines do not explain the AI decision. Experimental model; not a validated PSL rating.'),
    product: 'AeroFace', rubric: RUBRIC, mode, language, created: created.toISOString(),
    note: t('Subjective proportion rubric; not a medical assessment or objective attractiveness score.'),
    sides,
  };
}
