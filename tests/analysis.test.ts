import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMetrics, targetScore, totalScore, scoreMetrics, scoreTier, validatePoints, type Points } from '../src/analysis';
import { measurementLines } from '../src/measurement-lines';
import { translate } from '../src/i18n';

const front: Points = { eyeLO: {x:.28,y:.37},eyeLI:{x:.4,y:.37},eyeRI:{x:.6,y:.37},eyeRO:{x:.72,y:.37},cheekL:{x:.19,y:.49},cheekR:{x:.81,y:.49},jawL:{x:.26,y:.7},jawR:{x:.74,y:.7},mouthL:{x:.4,y:.67},mouthR:{x:.6,y:.67},noseBase:{x:.5,y:.55},chin:{x:.5,y:.86} };
const profile: Points = {nasion:{x:.56,y:.28},noseTip:{x:.74,y:.43},noseBase:{x:.62,y:.48},upperLip:{x:.65,y:.54},lowerLip:{x:.64,y:.59},chin:{x:.62,y:.7},jawAngle:{x:.34,y:.63},ramusTop:{x:.29,y:.4}};
test('a symmetric face has zero mirror deviation and moving one landmark increases it', () => {
  const baseline = calculateMetrics('front', front, 800, 1000)[0];
  assert.ok(baseline.value < 1e-12);
  const changed = calculateMetrics('front', {...front, mouthR:{x:.64,y:.7}}, 800, 1000)[0];
  assert.ok(changed.value > baseline.value);
  assert.ok(changed.score < baseline.score);
});
test('target scoring has no perfect-score plateau and loses half its score at one tolerance',()=>{
  assert.equal(targetScore(1,1,.2),10);
  assert.ok(targetScore(1.01,1,.2)<10);
  assert.ok(targetScore(1.1,1,.2)>targetScore(1.2,1,.2));
  assert.ok(Math.abs(targetScore(1.2,1,.2)-5)<1e-10);
  assert.ok(Math.abs(targetScore(.8,1,.2)-5)<1e-10);
  assert.ok(targetScore(1.15,1,.2)<7,'the old reference interval edge must no longer receive 10');
  assert.throws(()=>targetScore(1,1,0));
});
test('view aggregation makes a weak measurement count and rejects invalid scores or weights',()=>{
  const metrics=calculateMetrics('front',front,800,1000).map(metric=>({...metric,score:10,weight:25}));
  assert.equal(scoreMetrics(metrics),10);
  metrics[0].score=1;
  assert.equal(scoreMetrics(metrics),5.6);
  metrics[0].score=0;assert.equal(scoreMetrics(metrics),0);
  assert.throws(()=>scoreMetrics([{...metrics[0],score:11}]));
  assert.throws(()=>scoreMetrics([{...metrics[0],weight:NaN}]));
});
test('tiers have explicit non-overlapping boundaries on the displayed 0–10 scale',()=>{
  for(const [score,label]of[[0,'Sub-3'],[2.9,'Sub-3'],[3,'LTN'],[4,'MTN'],[5,'MTN'],[6,'HTN'],[7,'Chadlite'],[8,'Chad'],[9,'Adam'],[9.5,'True Adam'],[10,'True Adam']]as const)assert.equal(scoreTier(score).label,label);
  for(const value of[-1,10.1,NaN,Infinity])assert.throws(()=>scoreTier(value));
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
  assert.throws(()=>targetScore(NaN,0,1));
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
test('profile lip lines show the perpendicular distances actually used in the score',()=>{
  const lines=measurementLines('profile',profile,800,1000),reference=lines.find(line=>line.id==='nose-chin-reference')!;
  const offsets=lines.filter(line=>line.id.endsWith('lip-offset'));
  let total=0;
  for(const line of offsets){const dx=(line.to.x-line.from.x)*800,dy=(line.to.y-line.from.y)*1000,rx=(reference.to.x-reference.from.x)*800,ry=(reference.to.y-reference.from.y)*1000;assert.ok(Math.abs(dx*rx+dy*ry)<1e-8);total+=Math.hypot(dx,dy);}
  const height=Math.hypot((profile.nasion.x-profile.chin.x)*800,(profile.nasion.y-profile.chin.y)*1000);
  assert.ok(Math.abs(total/2/height-calculateMetrics('profile',profile,800,1000)[1].value)<1e-12);
});
test('every interactive line has unique identity, named endpoints and a real metric relationship',()=>{
  for(const [side,points]of[['front',front],['profile',profile]]as const){const lines=measurementLines(side,points,800,1000),metrics=calculateMetrics(side,points,800,1000);assert.equal(new Set(lines.map(line=>line.id)).size,lines.length);assert.ok(lines.every(line=>line.fromLabel&&line.toLabel&&line.explanation&&(line.id==='centerline'||line.display.endsWith(' px'))&&line.metricIds.every(id=>metrics.some(metric=>metric.id===id))));}
  assert.deepEqual(measurementLines('front',{},800,1000),[]);
});
test('both languages cover every measurement name, formula and explanation, with localized decimals',()=>{
  for(const [side,points]of[['front',front],['profile',profile]]as const)for(const metric of calculateMetrics(side,points,800,1000))for(const field of[metric.name,metric.description,metric.formula,metric.reference])assert.notEqual(translate(field,'id'),field,`Missing Indonesian: ${field}`);
  assert.equal(translate('1.25× eye width','id'),'1,25× lebar mata');
  assert.equal(translate('Complete the landmark: nose base.','id'),'Lengkapi titik: dasar hidung.');
  assert.equal(translate('Mulai analisis','en'),'Start analysis');
});
