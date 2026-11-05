export type Side = 'front' | 'profile';
export type Mode = Side | 'full';
export type Point = { x: number; y: number };
export type Points = Record<string, Point>;
export type Definition = { id: string; label: string; hint: string; index?: number };
export type Metric = {
  id: string; name: string; description: string; value: number; display: string;
  score: number; weight: number; reference: string; formula: string;
  segments: string[][]; points: string[]; estimated?: boolean;
};
export const RUBRIC = 'AeroFace Geometry 1.0';
export const SIDE_LABEL: Record<Side, string> = { front: 'Tampak depan', profile: 'Tampak samping' };
export const definitions: Record<Side, Definition[]> = {
  front: [
    { id: 'eyeLO', label: 'Sudut luar mata kiri foto', hint: 'Sudut mata di sisi kiri gambar, paling dekat pelipis.', index: 33 },
    { id: 'eyeLI', label: 'Sudut dalam mata kiri foto', hint: 'Sudut mata kiri gambar yang dekat hidung.', index: 133 },
    { id: 'eyeRI', label: 'Sudut dalam mata kanan foto', hint: 'Sudut mata kanan gambar yang dekat hidung.', index: 362 },
    { id: 'eyeRO', label: 'Sudut luar mata kanan foto', hint: 'Sudut mata di sisi kanan gambar, dekat pelipis.', index: 263 },
    { id: 'cheekL', label: 'Pipi kiri foto', hint: 'Titik terlebar kontur pipi di sisi kiri gambar.', index: 234 },
    { id: 'cheekR', label: 'Pipi kanan foto', hint: 'Titik terlebar kontur pipi di sisi kanan gambar.', index: 454 },
    { id: 'jawL', label: 'Sudut rahang kiri foto', hint: 'Sudut kontur rahang di kiri gambar.', index: 172 },
    { id: 'jawR', label: 'Sudut rahang kanan foto', hint: 'Sudut kontur rahang di kanan gambar.', index: 397 },
    { id: 'mouthL', label: 'Sudut bibir kiri foto', hint: 'Ujung garis pertemuan bibir di kiri gambar.', index: 61 },
    { id: 'mouthR', label: 'Sudut bibir kanan foto', hint: 'Ujung garis pertemuan bibir di kanan gambar.', index: 291 },
    { id: 'noseBase', label: 'Dasar hidung', hint: 'Titik tengah pertemuan bawah hidung dengan bibir atas.', index: 2 },
    { id: 'chin', label: 'Bawah dagu', hint: 'Titik paling bawah dagu, tepat di garis tengah.', index: 152 },
  ],
  profile: [
    { id: 'nasion', label: 'Pangkal hidung', hint: 'Lekukan pertemuan dahi dan pangkal hidung, dilihat dari samping.' },
    { id: 'noseTip', label: 'Ujung hidung', hint: 'Titik kontur hidung yang paling menonjol.' },
    { id: 'noseBase', label: 'Dasar hidung', hint: 'Pertemuan bagian bawah hidung dengan bibir atas.' },
    { id: 'upperLip', label: 'Bibir atas', hint: 'Titik paling menonjol pada kontur bibir atas.' },
    { id: 'lowerLip', label: 'Bibir bawah', hint: 'Titik paling menonjol pada kontur bibir bawah.' },
    { id: 'chin', label: 'Depan dagu', hint: 'Titik dagu yang paling menonjol ke depan, bukan bagian terbawahnya.' },
    { id: 'jawAngle', label: 'Sudut kontur rahang', hint: 'Pertemuan kontur belakang dan bawah rahang yang terlihat.' },
    { id: 'ramusTop', label: 'Atas segmen ramus visual', hint: 'Ujung atas kontur rahang dekat depan telinga. Ini titik permukaan, bukan batas tulang.' },
  ],
};
export const requiredSides = (mode: Mode): Side[] => mode === 'full' ? ['front', 'profile'] : [mode];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export function rangeScore(value: number, low: number, high: number, falloff: number): number {
  if (![value, low, high, falloff].every(Number.isFinite) || falloff <= 0 || high < low) throw new Error('Pengukuran tidak valid. Periksa titik ukur.');
  const outside = Math.max(low - value, value - high, 0);
  return Math.max(0, Math.min(10, 10 * (1 - outside / falloff)));
}
export function angle(a: Point, b: Point, c: Point): number {
  const denominator = distance(a, b) * distance(c, b);
  if (denominator < 0.00001) throw new Error('Titik ukur terlalu rapat. Pisahkan titik sesuai fitur wajah.');
  const dot = (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y);
  return Math.acos(Math.max(-1, Math.min(1, dot / denominator))) * 180 / Math.PI;
}
const lineDistance = (p: Point, a: Point, b: Point) => {
  const length = distance(a, b);
  if (length < 0.001) throw new Error('Garis referensi terlalu pendek. Periksa titik ukur.');
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / length;
};
export function toPixels(points: Points, width: number, height: number): Points {
  return Object.fromEntries(Object.entries(points).map(([key, p]) => [key, { x: p.x * width, y: p.y * height }]));
}
export function validatePoints(side: Side, points: Points, width: number, height: number): void {
  if (width <= 0 || height <= 0) throw new Error('Dimensi foto tidak valid.');
  for (const def of definitions[side]) {
    const p = points[def.id];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) throw new Error(`Lengkapi titik ${def.label.toLowerCase()}.`);
  }
  const p = toPixels(points, width, height);
  const minSize = Math.min(width, height) * 0.04;
  const pairs = side === 'front' ? [['eyeLO', 'eyeLI'], ['eyeRI', 'eyeRO'], ['cheekL', 'cheekR'], ['noseBase', 'chin']] : [['nasion', 'chin'], ['ramusTop', 'jawAngle'], ['jawAngle', 'chin'], ['noseTip', 'chin']];
  if (pairs.some(([a, b]) => distance(p[a], p[b]) < minSize)) throw new Error('Ada titik yang terlalu rapat. Periksa kembali posisi pengukuran.');
  if (side === 'front' && !(p.eyeLO.x < p.eyeLI.x && p.eyeLI.x < p.eyeRI.x && p.eyeRI.x < p.eyeRO.x)) throw new Error('Urutan sudut mata tertukar. Kiri dan kanan mengikuti posisi pada foto.');
  if (p.noseBase.y >= p.chin.y) throw new Error('Titik dagu harus berada di bawah dasar hidung.');
}
export function calculateMetrics(side: Side, points: Points, width: number, height: number): Metric[] {
  validatePoints(side, points, width, height);
  const p = toPixels(points, width, height);
  if (side === 'front') {
    const leftEye = midpoint(p.eyeLO, p.eyeLI), rightEye = midpoint(p.eyeRI, p.eyeRO);
    const eyes = midpoint(leftEye, rightEye);
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const align = (point: Point) => ({ x: (point.x - eyes.x) * Math.cos(roll) + (point.y - eyes.y) * Math.sin(roll), y: -(point.x - eyes.x) * Math.sin(roll) + (point.y - eyes.y) * Math.cos(roll) });
    const q = Object.fromEntries(Object.entries(p).map(([key, value]) => [key, align(value)]));
    const faceWidth = distance(p.cheekL, p.cheekR);
    const pairs = [['eyeLO', 'eyeRO'], ['eyeLI', 'eyeRI'], ['cheekL', 'cheekR'], ['jawL', 'jawR'], ['mouthL', 'mouthR']];
    const asymmetry = mean(pairs.map(([a, b]) => Math.hypot(q[a].x + q[b].x, q[a].y - q[b].y) / faceWidth));
    const spacing = distance(p.eyeLI, p.eyeRI) / mean([distance(p.eyeLO, p.eyeLI), distance(p.eyeRI, p.eyeRO)]);
    const lower = distance(p.noseBase, p.chin) / distance(eyes, p.chin);
    const jaw = distance(p.jawL, p.jawR) / faceWidth;
    return [
      { id: 'symmetry', name: 'Simetri wajah', description: 'Lima pasangan titik dibandingkan terhadap sumbu di antara mata setelah kemiringan foto dikoreksi. Ekspresi dan perspektif tetap memengaruhi hasil.', value: asymmetry, display: `${(asymmetry * 100).toFixed(1)}% selisih`, score: rangeScore(asymmetry, 0, 0.015, 0.12), weight: 35, reference: 'Selisih 0–1,5% dari lebar pipi', formula: 'Rata-rata selisih titik cermin ÷ lebar pipi', segments: pairs, points: pairs.flat() },
      { id: 'eyes', name: 'Jarak antarmata', description: 'Jarak sudut dalam kedua mata dibandingkan dengan rata-rata lebar mata. Ini pembacaan proporsi 2D, bukan penilaian kesehatan mata.', value: spacing, display: `${spacing.toFixed(2)}× lebar mata`, score: rangeScore(spacing, 0.85, 1.15, 0.9), weight: 25, reference: 'Rasio 0,85–1,15×', formula: 'Jarak antarsudut dalam ÷ rata-rata lebar mata', segments: [['eyeLO', 'eyeLI'], ['eyeLI', 'eyeRI'], ['eyeRI', 'eyeRO']], points: ['eyeLO', 'eyeLI', 'eyeRI', 'eyeRO'] },
      { id: 'balance', name: 'Proporsi bawah wajah', description: 'Panjang dari dasar hidung ke dagu dibandingkan dengan panjang dari garis mata ke dagu. Hairline tidak dipakai agar rambut tidak menjadi titik ukur semu.', value: lower, display: `${(lower * 100).toFixed(1)}% bagian bawah`, score: rangeScore(lower, 0.52, 0.65, 0.4), weight: 25, reference: 'Rasio 52–65%', formula: 'Dasar hidung–dagu ÷ tengah mata–dagu', segments: [['eyeLO', 'eyeRO'], ['noseBase', 'chin']], points: ['eyeLO', 'eyeRO', 'noseBase', 'chin'] },
      { id: 'jaw', name: 'Lebar kontur rahang', description: 'Lebar dua sudut rahang yang tampak dibandingkan dengan lebar kontur pipi. Rambut, janggut, dan putaran kepala dapat menutupi kontur.', value: jaw, display: `${jaw.toFixed(2)}× lebar pipi`, score: rangeScore(jaw, 0.65, 0.88, 0.6), weight: 15, reference: 'Rasio 0,65–0,88×', formula: 'Lebar sudut rahang ÷ lebar pipi', segments: [['cheekL', 'cheekR'], ['jawL', 'jawR'], ['jawL', 'chin', 'jawR']], points: ['cheekL', 'cheekR', 'jawL', 'jawR', 'chin'] },
    ];
  }
  const faceHeight = distance(p.nasion, p.chin);
  const convexity = angle(p.nasion, p.noseBase, p.chin);
  const lips = mean([lineDistance(p.upperLip, p.noseTip, p.chin), lineDistance(p.lowerLip, p.noseTip, p.chin)]) / faceHeight;
  const jawAngle = angle(p.ramusTop, p.jawAngle, p.chin);
  const ramus = distance(p.ramusTop, p.jawAngle) / distance(p.jawAngle, p.chin);
  return [
    { id: 'profile-balance', name: 'Keseimbangan profil', description: 'Sudut antara pangkal hidung, dasar hidung, dan dagu pada kontur luar. Semua titik profil ditempatkan dan dikonfirmasi pengguna.', value: convexity, display: `${convexity.toFixed(1)}°`, score: rangeScore(convexity, 155, 180, 65), weight: 30, reference: 'Sudut 155–180°', formula: 'Sudut pangkal hidung–dasar hidung–dagu', segments: [['nasion', 'noseBase', 'chin']], points: ['nasion', 'noseBase', 'chin'], estimated: true },
    { id: 'lips', name: 'Relasi bibir & dagu', description: 'Jarak tegak lurus kedua bibir terhadap garis ujung hidung–dagu, dibagi tinggi profil. Besaran ini tidak menentukan satu bentuk bibir yang ideal.', value: lips, display: `${(lips * 100).toFixed(1)}% tinggi profil`, score: rangeScore(lips, 0, 0.065, 0.2), weight: 25, reference: 'Jarak 0–6,5% tinggi profil', formula: 'Rata-rata jarak bibir ke garis hidung–dagu ÷ tinggi profil', segments: [['noseTip', 'chin'], ['upperLip', 'lowerLip']], points: ['noseTip', 'upperLip', 'lowerLip', 'chin'], estimated: true },
    { id: 'profile-jaw', name: 'Sudut kontur rahang', description: 'Sudut kontur permukaan dari area dekat telinga, sudut rahang, dan depan dagu. Ini bukan pengukuran sudut tulang gonial.', value: jawAngle, display: `${jawAngle.toFixed(1)}°`, score: rangeScore(jawAngle, 110, 135, 65), weight: 25, reference: 'Sudut kontur 110–135°', formula: 'Sudut atas segmen–sudut rahang–dagu', segments: [['ramusTop', 'jawAngle', 'chin']], points: ['ramusTop', 'jawAngle', 'chin'], estimated: true },
    { id: 'ramus', name: 'Rasio ramus visual', description: 'Perbandingan segmen vertikal kontur dekat telinga terhadap segmen rahang ke dagu. Foto tidak memperlihatkan batas tulang ramus; ini hanya estimasi permukaan 2D.', value: ramus, display: `${ramus.toFixed(2)}× segmen rahang`, score: rangeScore(ramus, 0.45, 0.85, 0.9), weight: 20, reference: 'Rasio kontur 0,45–0,85×', formula: 'Atas segmen–sudut rahang ÷ sudut rahang–dagu', segments: [['ramusTop', 'jawAngle'], ['jawAngle', 'chin']], points: ['ramusTop', 'jawAngle', 'chin'], estimated: true },
  ];
}
export const roundedScore = (score: number) => Math.round((score + Number.EPSILON) * 10) / 10;
export const scoreMetrics = (metrics: Metric[]) => {
  if (!metrics.length || metrics.some(metric => !Number.isFinite(metric.score) || metric.weight <= 0)) throw new Error('Metrik belum lengkap.');
  return roundedScore(metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0) / metrics.reduce((sum, metric) => sum + metric.weight, 0));
};
export function totalScore(mode: Mode, scores: Partial<Record<Side, number>>): number | null {
  const values = requiredSides(mode).map(side => scores[side]);
  return values.every(value => typeof value === 'number' && Number.isFinite(value)) ? roundedScore(mean(values as number[])) : null;
}
export const scoreText = (score: number) => score.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
