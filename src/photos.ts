import { definitions, type Points, type Side } from './analysis';
export type Photo = {
  url: string; blob: Blob; width: number; height: number;
  points: Points; source: 'auto' | 'manual'; confirmed: boolean;
  quality: { light: number; detail: number; warnings: string[] };
};
export async function readPhoto(file: Blob): Promise<Photo> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Gunakan foto JPG, PNG, atau WebP. Untuk HEIC, ekspor sebagai JPG terlebih dahulu.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Ukuran foto maksimal 20 MB. Pilih versi yang lebih kecil.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Foto tidak bisa dibaca. Coba simpan ulang sebagai JPG atau PNG.'); }
  if (Math.min(bitmap.width, bitmap.height) < 256) { bitmap.close(); throw new Error('Foto terlalu kecil. Gunakan foto minimal 256 piksel pada sisi terpendek.'); }
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
  if (light < 50) warnings.push('Pencahayaan tampak gelap. Coba foto dengan cahaya merata.');
  if (light > 230) warnings.push('Pencahayaan sangat terang. Pastikan kontur wajah masih jelas.');
  if (detail < 2) warnings.push('Detail foto tampak rendah. Periksa fokus dan ketajamannya.');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Foto gagal diproses.')), 'image/jpeg', 0.94));
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
  bitmap.close(); return photoFromCanvas(canvas);
}
let worker: Worker | null = null;
let cancelDetection: (() => void) | null = null;
let requestId = 0;
export function stopDetector() { cancelDetection?.(); cancelDetection = null; worker?.terminate(); worker = null; }
export async function detectFront(photo: Photo): Promise<Points> {
  stopDetector();
  worker = new Worker(new URL('analysis-worker.js', new URL(import.meta.env.BASE_URL, location.href)));
  const current = worker, id = ++requestId;
  const bitmap = await createImageBitmap(photo.blob);
  if (worker !== current) { bitmap.close(); throw new Error('Deteksi dibatalkan.'); }
  const landmarks = await new Promise<{ x: number; y: number }[][]>((resolve, reject) => {
    const timeout = setTimeout(() => { cancelDetection = null; current.terminate(); reject(new Error('Deteksi terlalu lama. Coba lagi atau gunakan penempatan titik manual.')); }, 45000);
    cancelDetection = () => { clearTimeout(timeout); reject(new Error('Deteksi dibatalkan.')); };
    current.onerror = () => { clearTimeout(timeout); cancelDetection = null; current.terminate(); reject(new Error('Detektor lokal belum bisa berjalan di browser ini. Gunakan penempatan titik manual.')); };
    current.onmessage = event => {
      if (event.data.id !== id) return;
      clearTimeout(timeout);
      cancelDetection = null;
      if (event.data.error) reject(new Error('Detektor lokal tidak tersedia. Coba lagi atau gunakan titik manual.'));
      else resolve(event.data.landmarks);
      current.terminate(); if (worker === current) worker = null;
    };
    current.postMessage({ bitmap, id }, [bitmap]);
  });
  if (landmarks.length > 1) throw new Error('Ada lebih dari satu wajah. Potong foto agar hanya satu wajah yang terlihat.');
  if (!landmarks.length) throw new Error('Wajah depan belum terdeteksi. Gunakan foto lurus dengan cahaya merata, atau letakkan titik manual.');
  return Object.fromEntries(definitions.front.map(def => [def.id, { x: Math.max(0, Math.min(1, landmarks[0][def.index!].x)), y: Math.max(0, Math.min(1, landmarks[0][def.index!].y)) }]));
}
export const revokePhoto = (photo: Photo | undefined) => { if (photo) URL.revokeObjectURL(photo.url); };
export type Photos = Partial<Record<Side, Photo>>;
