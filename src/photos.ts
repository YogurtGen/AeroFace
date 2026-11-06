import { type Points, type Side } from './analysis';
import { mapLandmarks, type Landmark } from './landmarks';
import type { Appearance } from './appearance';
import { faceFrame, reframePoints } from './framing';
export type Photo = {
  url: string; blob: Blob; width: number; height: number;
  points: Points; source: 'auto' | 'manual'; confirmed: boolean;
  appearance?: Appearance;
  originalBlob?: Blob; framing?: 'face'|'unavailable';
  preparedPoints?: Points;
  framingSource?: ReturnType<typeof faceFrame>&{width:number;height:number};
  quality: { light: number; detail: number; warnings: string[] };
};
export async function readPhoto(file: Blob): Promise<Photo> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use JPG, PNG, or WebP. Export HEIC photos as JPG first.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Photos can be up to 20 MB. Choose a smaller version.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Could not read this photo. Try saving it again as JPG or PNG.'); }
  const factor = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * factor); canvas.height = Math.round(bitmap.height * factor);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return photoFromCanvas(canvas);
}
async function photoFromCanvas(canvas: HTMLCanvasElement): Promise<Photo> {
  const sample = document.createElement('canvas'); sample.width = 96; sample.height = 96;
  const context = sample.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(canvas, 0, 0, 96, 96);
  const { data } = context.getImageData(0, 0, 96, 96);
  let light = 0, detail = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3; light += gray;
    if ((i / 4) % 96 > 0) detail += Math.abs(gray - (data[i - 4] + data[i - 3] + data[i - 2]) / 3);
  }
  light /= 96 * 96; detail /= 96 * 96;
  const warnings: string[] = [];
  if (Math.min(canvas.width, canvas.height) < 256) warnings.push('This photo has a low resolution. You can use it, but review the landmarks carefully.');
  if (light < 50) warnings.push('Lighting looks dark. Try an evenly lit photo.');
  if (light > 230) warnings.push('Lighting looks very bright. Make sure the facial contour is still visible.');
  if (detail < 2) warnings.push('Photo detail looks low. Check focus and sharpness.');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not process this photo.')), 'image/jpeg', 0.94));
  return { url: URL.createObjectURL(blob), blob, width: canvas.width, height: canvas.height, points: {}, source: 'manual', confirmed: false, quality: { light, detail, warnings } };
}
export async function transformPhoto(photo: Photo, operation: 'rotate' | 'crop'): Promise<Photo> {
  const bitmap = await createImageBitmap(photo.blob);
  const canvas = document.createElement('canvas');
  if (operation === 'rotate') {
    canvas.width = photo.height; canvas.height = photo.width;
    const context = canvas.getContext('2d')!; context.translate(canvas.width, 0); context.rotate(Math.PI / 2); context.drawImage(bitmap, 0, 0);
  } else {
    const ratio = 3 / 4;
    const width = Math.min(photo.width, photo.height * ratio), height = width / ratio;
    canvas.width = Math.round(width); canvas.height = Math.round(height);
    canvas.getContext('2d')!.drawImage(bitmap, (photo.width - width) / 2, (photo.height - height) / 2, width, height, 0, 0, width, height);
  }
  bitmap.close(); return {...await photoFromCanvas(canvas),originalBlob:photo.originalBlob};
}
export async function fitPhotoToFace(photo:Photo,mesh:Landmark[],points?:Points):Promise<Photo>{
  const frame=faceFrame(mesh,photo.width,photo.height),canvas=document.createElement('canvas');
  const preparedPoints=points?reframePoints(points,frame,photo.width,photo.height):undefined;
  canvas.width=frame.pixels;canvas.height=frame.pixels;
  const bitmap=await createImageBitmap(photo.blob);
  try{
    const context=canvas.getContext('2d')!,scale=frame.pixels/frame.size;
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.scale(scale,scale);context.drawImage(bitmap,-frame.x,-frame.y);
    return {...await photoFromCanvas(canvas),originalBlob:photo.originalBlob??photo.blob,framing:'face',preparedPoints,framingSource:{...frame,width:photo.width,height:photo.height}};
  }finally{bitmap.close();}
}
let worker: Worker | null = null;
let cancelDetection: (() => void) | null = null;
let requestId = 0;
export function stopDetector() { cancelDetection?.(); cancelDetection = null; worker?.terminate(); worker = null; }
export type DetectionPhase = 'runtime'|'model'|'detecting'|'geometry'|'rating'|'visualizing';
export const detectFront=(photo:Photo,onProgress?:(phase:DetectionPhase)=>void)=>detectLandmarks(photo,'front',onProgress);
export async function detectLandmarks(photo: Photo, side:Side, onProgress?: (phase:DetectionPhase)=>void): Promise<Points> {
  if(side==='profile'&&photo.originalBlob&&photo.framingSource){
    const frame=photo.framingSource;
    const original={...photo,blob:photo.originalBlob,width:frame.width,height:frame.height};
    const {points}=await detectFace(original,side,onProgress);
    return reframePoints(points,frame,frame.width,frame.height);
  }
  return (await detectFace(photo,side,onProgress)).points;
}
export async function detectFace(photo:Photo,side:Side,onProgress?:(phase:DetectionPhase)=>void):Promise<{points:Points;mesh:Landmark[]}>{
  stopDetector();
  onProgress?.('runtime');
  worker = new Worker(new URL('analysis-worker.js', new URL(import.meta.env.BASE_URL, location.href)));
  const current = worker, id = ++requestId;
  const bitmap = await createImageBitmap(photo.blob);
  if (worker !== current) { bitmap.close(); throw new Error('Detection canceled.'); }
  const landmarks = await new Promise<Landmark[][]>((resolve, reject) => {
    const timeout = setTimeout(() => { cancelDetection = null; current.terminate(); reject(new Error('Detection took too long. Try again or place landmarks manually.')); }, 45000);
    cancelDetection = () => { clearTimeout(timeout); reject(new Error('Detection canceled.')); };
    current.onerror = () => { clearTimeout(timeout); cancelDetection = null; current.terminate(); reject(new Error('The local detector cannot run in this browser. Place landmarks manually.')); };
    current.onmessage = event => {
      if (event.data.id !== id) return;
      if (event.data.stage) { onProgress?.(event.data.stage); return; }
      clearTimeout(timeout);
      cancelDetection = null;
      if (event.data.error) reject(new Error('The local detector is unavailable. Try again or use manual landmarks.'));
      else resolve(event.data.landmarks);
      current.terminate(); if (worker === current) worker = null;
    };
    current.postMessage({ bitmap, id }, [bitmap]);
  });
  if (landmarks.length > 1) throw new Error('More than one face was found. Crop the photo to show one face.');
  if (!landmarks.length) throw new Error('No face found. Try a clear, evenly lit photo, or place landmarks manually.');
  onProgress?.('geometry');
  return {points:mapLandmarks(side,landmarks[0],photo.width,photo.height),mesh:landmarks[0]};
}
export const revokePhoto = (photo: Photo | undefined) => { if (photo) URL.revokeObjectURL(photo.url); };
export type Photos = Partial<Record<Side, Photo>>;
