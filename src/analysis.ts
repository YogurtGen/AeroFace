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
export const SIDE_LABEL: Record<Side, string> = { front: 'Front view', profile: 'Side view' };
export const definitions: Record<Side, Definition[]> = {
  front: [
    { id: 'eyeLO', label: 'Left outer eye corner in photo', hint: 'Outer eye corner on the left of the image, closest to the temple.', index: 33 },
    { id: 'eyeLI', label: 'Left inner eye corner in photo', hint: 'Inner eye corner on the left of the image, near the nose.', index: 133 },
    { id: 'eyeRI', label: 'Right inner eye corner in photo', hint: 'Inner eye corner on the right of the image, near the nose.', index: 362 },
    { id: 'eyeRO', label: 'Right outer eye corner in photo', hint: 'Outer eye corner on the right of the image, closest to the temple.', index: 263 },
    { id: 'cheekL', label: 'Left cheek in photo', hint: 'Widest point of the cheek contour on the left.', index: 234 },
    { id: 'cheekR', label: 'Right cheek in photo', hint: 'Widest point of the cheek contour on the right.', index: 454 },
    { id: 'jawL', label: 'Left jaw corner in photo', hint: 'Visible jaw corner on the left of the image.', index: 172 },
    { id: 'jawR', label: 'Right jaw corner in photo', hint: 'Visible jaw corner on the right of the image.', index: 397 },
    { id: 'mouthL', label: 'Left mouth corner in photo', hint: 'Left end of the line where the lips meet.', index: 61 },
    { id: 'mouthR', label: 'Right mouth corner in photo', hint: 'Right end of the line where the lips meet.', index: 291 },
    { id: 'noseBase', label: 'Nose base', hint: 'Center of the junction between the nose base and upper lip.', index: 2 },
    { id: 'chin', label: 'Bottom of chin', hint: 'Lowest point of the chin on the centerline.', index: 152 },
  ],
  profile: [
    { id: 'nasion', label: 'Nose root', hint: 'Indentation where the forehead meets the nose root in profile.' },
    { id: 'noseTip', label: 'Nose tip', hint: 'Most projecting point of the nose contour.' },
    { id: 'noseBase', label: 'Nose base', hint: 'Junction between the bottom of the nose and upper lip.' },
    { id: 'upperLip', label: 'Upper lip', hint: 'Most projecting point of the upper lip contour.' },
    { id: 'lowerLip', label: 'Lower lip', hint: 'Most projecting point of the lower lip contour.' },
    { id: 'chin', label: 'Front of chin', hint: 'Most forward point of the chin, not its lowest point.' },
    { id: 'jawAngle', label: 'Jaw contour angle', hint: 'Junction between the visible back and bottom jaw contours.' },
    { id: 'ramusTop', label: 'Top of visual ramus segment', hint: 'Top of the visible jaw contour near the ear. A surface landmark, not a bone boundary.' },
  ],
};
export const requiredSides = (mode: Mode): Side[] => mode === 'full' ? ['front', 'profile'] : [mode];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export function rangeScore(value: number, low: number, high: number, falloff: number): number {
  if (![value, low, high, falloff].every(Number.isFinite) || falloff <= 0 || high < low) throw new Error('Invalid measurement. Check the landmarks.');
  const outside = Math.max(low - value, value - high, 0);
  return Math.max(0, Math.min(10, 10 * (1 - outside / falloff)));
}
export function angle(a: Point, b: Point, c: Point): number {
  const denominator = distance(a, b) * distance(c, b);
  if (denominator < 0.00001) throw new Error('Landmarks are too close together. Place them on the correct facial features.');
  const dot = (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y);
  return Math.acos(Math.max(-1, Math.min(1, dot / denominator))) * 180 / Math.PI;
}
const lineDistance = (p: Point, a: Point, b: Point) => {
  const length = distance(a, b);
  if (length < 0.001) throw new Error('The reference line is too short. Check the landmarks.');
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / length;
};
export function toPixels(points: Points, width: number, height: number): Points {
  return Object.fromEntries(Object.entries(points).map(([key, p]) => [key, { x: p.x * width, y: p.y * height }]));
}
export function validatePoints(side: Side, points: Points, width: number, height: number): void {
  if (width <= 0 || height <= 0) throw new Error('Invalid photo dimensions.');
  for (const def of definitions[side]) {
    const p = points[def.id];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) throw new Error(`Complete the landmark: ${def.label.toLowerCase()}.`);
  }
  const p = toPixels(points, width, height);
  const minSize = Math.min(width, height) * 0.04;
  const pairs = side === 'front' ? [['eyeLO', 'eyeLI'], ['eyeRI', 'eyeRO'], ['cheekL', 'cheekR'], ['noseBase', 'chin']] : [['nasion', 'chin'], ['ramusTop', 'jawAngle'], ['jawAngle', 'chin'], ['noseTip', 'chin']];
  if (pairs.some(([a, b]) => distance(p[a], p[b]) < minSize)) throw new Error('Some points are too close together. Check their positions.');
  if (side === 'front' && !(p.eyeLO.x < p.eyeLI.x && p.eyeLI.x < p.eyeRI.x && p.eyeRI.x < p.eyeRO.x)) throw new Error('Eye corners are out of order. Left and right refer to the photo.');
  if (p.noseBase.y >= p.chin.y) throw new Error('The chin point must be below the nose base.');
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
      { id: 'symmetry', name: 'Facial symmetry', description: 'Five point pairs are compared across the eye-centered axis after correcting photo roll. Expression and perspective still affect the reading.', value: asymmetry, display: `${(asymmetry * 100).toFixed(1)}% deviation`, score: rangeScore(asymmetry, 0, 0.015, 0.12), weight: 35, reference: 'Deviation 0–1.5% of cheek width', formula: 'Average mirrored point deviation ÷ cheek width', segments: pairs, points: pairs.flat() },
      { id: 'eyes', name: 'Eye spacing', description: 'The gap between the inner eye corners is compared with average eye width. This is a 2D proportion reading, not an eye-health assessment.', value: spacing, display: `${spacing.toFixed(2)}× eye width`, score: rangeScore(spacing, 0.85, 1.15, 0.9), weight: 25, reference: 'Ratio 0.85–1.15×', formula: 'Inner-eye gap ÷ average eye width', segments: [['eyeLO', 'eyeLI'], ['eyeLI', 'eyeRI'], ['eyeRI', 'eyeRO']], points: ['eyeLO', 'eyeLI', 'eyeRI', 'eyeRO'] },
      { id: 'balance', name: 'Lower-face balance', description: 'Nose-base-to-chin length is compared with eye-line-to-chin length. Hairline is excluded so hair does not become a misleading landmark.', value: lower, display: `${(lower * 100).toFixed(1)}% lower section`, score: rangeScore(lower, 0.52, 0.65, 0.4), weight: 25, reference: 'Ratio 52–65%', formula: 'Nose base–chin ÷ eye midpoint–chin', segments: [['eyeLO', 'eyeRO'], ['noseBase', 'chin']], points: ['eyeLO', 'eyeRO', 'noseBase', 'chin'] },
      { id: 'jaw', name: 'Visible jaw width', description: 'The width between the visible jaw corners is compared with cheek width. Hair, facial hair, and head rotation may obscure the contour.', value: jaw, display: `${jaw.toFixed(2)}× cheek width`, score: rangeScore(jaw, 0.65, 0.88, 0.6), weight: 15, reference: 'Ratio 0.65–0.88×', formula: 'Jaw-corner width ÷ cheek width', segments: [['cheekL', 'cheekR'], ['jawL', 'jawR'], ['jawL', 'chin', 'jawR']], points: ['cheekL', 'cheekR', 'jawL', 'jawR', 'chin'] },
    ];
  }
  const faceHeight = distance(p.nasion, p.chin);
  const convexity = angle(p.nasion, p.noseBase, p.chin);
  const lips = mean([lineDistance(p.upperLip, p.noseTip, p.chin), lineDistance(p.lowerLip, p.noseTip, p.chin)]) / faceHeight;
  const jawAngle = angle(p.ramusTop, p.jawAngle, p.chin);
  const ramus = distance(p.ramusTop, p.jawAngle) / distance(p.jawAngle, p.chin);
  return [
    { id: 'profile-balance', name: 'Profile balance', description: 'The angle between the nose root, nose base, and chin on the outer contour. Profile landmarks are placed and confirmed by you.', value: convexity, display: `${convexity.toFixed(1)}°`, score: rangeScore(convexity, 155, 180, 65), weight: 30, reference: 'Angle 155–180°', formula: 'Nose root–nose base–chin angle', segments: [['nasion', 'noseBase', 'chin']], points: ['nasion', 'noseBase', 'chin'], estimated: true },
    { id: 'lips', name: 'Lip–chin relation', description: 'The perpendicular distance of both lips from the nose-tip-to-chin line, divided by profile height. It does not define one ideal lip shape.', value: lips, display: `${(lips * 100).toFixed(1)}% profile height`, score: rangeScore(lips, 0, 0.065, 0.2), weight: 25, reference: 'Distance 0–6.5% of profile height', formula: 'Mean lip distance to nose–chin line ÷ profile height', segments: [['noseTip', 'chin'], ['upperLip', 'lowerLip']], points: ['noseTip', 'upperLip', 'lowerLip', 'chin'], estimated: true },
    { id: 'profile-jaw', name: 'Jaw contour angle', description: 'The surface contour angle formed by the point near the ear, jaw corner, and chin. This is not an anatomical gonial bone-angle measurement.', value: jawAngle, display: `${jawAngle.toFixed(1)}°`, score: rangeScore(jawAngle, 110, 135, 65), weight: 25, reference: 'Contour angle 110–135°', formula: 'Upper segment–jaw corner–chin angle', segments: [['ramusTop', 'jawAngle', 'chin']], points: ['ramusTop', 'jawAngle', 'chin'], estimated: true },
    { id: 'ramus', name: 'Visual ramus ratio', description: 'The visible vertical contour near the ear is compared with the jaw-to-chin segment. A photo does not reveal ramus bone boundaries; this is a 2D surface estimate.', value: ramus, display: `${ramus.toFixed(2)}× jaw segment`, score: rangeScore(ramus, 0.45, 0.85, 0.9), weight: 20, reference: 'Contour ratio 0.45–0.85×', formula: 'Upper segment–jaw corner ÷ jaw corner–chin', segments: [['ramusTop', 'jawAngle'], ['jawAngle', 'chin']], points: ['ramusTop', 'jawAngle', 'chin'], estimated: true },
  ];
}
export const roundedScore = (score: number) => Math.round((score + Number.EPSILON) * 10) / 10;
export const scoreMetrics = (metrics: Metric[]) => {
  if (!metrics.length || metrics.some(metric => !Number.isFinite(metric.score) || metric.weight <= 0)) throw new Error('Measurements are incomplete.');
  return roundedScore(metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0) / metrics.reduce((sum, metric) => sum + metric.weight, 0));
};
export function totalScore(mode: Mode, scores: Partial<Record<Side, number>>): number | null {
  const values = requiredSides(mode).map(side => scores[side]);
  return values.every(value => typeof value === 'number' && Number.isFinite(value)) ? roundedScore(mean(values as number[])) : null;
}
export const scoreText = (score: number, language: 'en'|'id' = 'en') => score.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
