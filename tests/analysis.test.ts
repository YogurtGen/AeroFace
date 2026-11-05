import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMetrics, rangeScore, totalScore, scoreMetrics, validatePoints, type Points } from '../src/analysis';

const front: Points = { eyeLO: {x:.28,y:.37},eyeLI:{x:.4,y:.37},eyeRI:{x:.6,y:.37},eyeRO:{x:.72,y:.37},cheekL:{x:.19,y:.49},cheekR:{x:.81,y:.49},jawL:{x:.26,y:.7},jawR:{x:.74,y:.7},mouthL:{x:.4,y:.67},mouthR:{x:.6,y:.67},noseBase:{x:.5,y:.55},chin:{x:.5,y:.86} };
const profile: Points = {nasion:{x:.56,y:.28},noseTip:{x:.74,y:.43},noseBase:{x:.62,y:.48},upperLip:{x:.65,y:.54},lowerLip:{x:.64,y:.59},chin:{x:.62,y:.7},jawAngle:{x:.34,y:.63},ramusTop:{x:.29,y:.4}};
test('a symmetric face has zero mirror deviation and moving one landmark increases it', () => {
  const baseline = calculateMetrics('front', front, 800, 1000)[0];
  assert.ok(baseline.value < 1e-12);
  const changed = calculateMetrics('front', {...front, mouthR:{x:.64,y:.7}}, 800, 1000)[0];
  assert.ok(changed.value > baseline.value);
  assert.ok(changed.score < baseline.score);
});
test('ratios are invariant to resolution, and use actual image aspect ratio', () => {
  const first = calculateMetrics('front', front, 800, 1000);
  const second = calculateMetrics('front', front, 1600, 2000);
  assert.deepEqual(first.map(m=>m.value), second.map(m=>m.value));
  assert.notEqual(first[0].value + first[2].value, calculateMetrics('front', {...front, noseBase:{x:.53,y:.55}}, 800, 1000)[2].value);
  const angled={...front,noseBase:{x:.56,y:.55}};
  assert.notEqual(calculateMetrics('front',angled,800,1000)[2].value,calculateMetrics('front',angled,1600,1000)[2].value);
});
test('single side scores do not receive a penalty for an unselected side', () => {
  assert.equal(totalScore('front', {front:8}), 8);
  assert.equal(totalScore('profile', {profile:7}), 7);
  assert.equal(totalScore('full', {front:8}), null);
  assert.equal(totalScore('full', {front:8,profile:7}), 7.5);
  assert.equal(totalScore('front', {front:NaN}), null);
});
test('reject missing, invalid, reversed and degenerate geometry instead of inventing a score', () => {
  assert.throws(()=>validatePoints('front', {}, 800, 1000));
  assert.throws(()=>calculateMetrics('front', {...front, chin:front.noseBase}, 800, 1000));
  assert.throws(()=>calculateMetrics('front', {...front, eyeLO:front.eyeRO}, 800, 1000));
  assert.throws(()=>calculateMetrics('profile', {...profile, ramusTop:profile.jawAngle}, 800, 1000));
  assert.throws(()=>rangeScore(NaN,0,1,1));
});
test('profile measurements are finite, bounded and explicitly estimated; weights sum to 100', () => {
  for (const [side, points] of [['front',front],['profile',profile]] as const) {
    const metrics=calculateMetrics(side,points,800,1000);
    assert.equal(metrics.reduce((sum,m)=>sum+m.weight,0),100);
    assert.ok(metrics.every(m=>Number.isFinite(m.value)&&m.score>=0&&m.score<=10));
    if(side==='profile') assert.ok(metrics.every(m=>m.estimated));
    assert.ok(scoreMetrics(metrics)>=0&&scoreMetrics(metrics)<=10);
  }
});
