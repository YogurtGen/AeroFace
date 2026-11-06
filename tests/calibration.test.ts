import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fitCalibration,mapCalibration,calibrateAppearance,calibrationTemplate,ratingSheet} from '../src/calibration';
import {APPEARANCE_PIPELINE,type Appearance} from '../src/appearance';

function syntheticRatings(offset=.8){
  let text=calibrationTemplate;
  for(const[split,count,start]of[['train',30,0],['validation',15,100]]as const)for(let i=0;i<count;i++){
    const x=1+(7*i/(count-1)),id=start+i;
    for(let rater=0;rater<3;rater++)text+=`person-${id},photo-${id},${split},${x},rater-${rater},${x+offset+(rater-1)*.1},${APPEARANCE_PIPELINE}\n`;
  }
  return text;
}
test('consensus calibration learns only training rows and improves separate-person validation error',()=>{
  const profile=fitCalibration(syntheticRatings());
  assert.equal(profile.trainingPeople,30);assert.equal(profile.validationPeople,15);assert.equal(profile.minimumRaters,3);
  assert.ok(profile.maeAfter<1e-10);assert.ok(Math.abs(profile.maeBefore-.8)<1e-10);
  assert.ok(Math.abs(mapCalibration(5,profile)!-5.8)<1e-10);assert.equal(mapCalibration(.9,profile),null);assert.equal(mapCalibration(8.1,profile),null);
  for(let i=1;i<profile.knots.length;i++)assert.ok(profile.knots[i][0]>profile.knots[i-1][0]&&profile.knots[i][1]>=profile.knots[i-1][1]);
});
test('calibration rejects leakage, duplicate raters, missing consensus, incompatible pipelines and unhelpful fits',()=>{
  const csv=syntheticRatings();
  assert.throws(()=>fitCalibration(csv.replaceAll('person-100,','person-0,')),/same person/);
  assert.throws(()=>fitCalibration(csv.replace('rater-2','rater-1')),/only once/);
  assert.throws(()=>fitCalibration(csv.split('\n').filter(line=>!line.includes('rater-2')).join('\n')),/at least three/);
  assert.throws(()=>fitCalibration(csv.replace(APPEARANCE_PIPELINE,'legacy')),/current appearance pipeline/);
  assert.throws(()=>fitCalibration(calibrationTemplate),/30 training/);
  assert.throws(()=>fitCalibration(syntheticRatings(0)),/did not improve/);
  assert.throws(()=>fitCalibration('x'.repeat(2_000_001)),/too large/);
  assert.throws(()=>fitCalibration(csv.replace('person-0','"person-0"oops')),/quoting/);
  assert.equal(fitCalibration(csv.replaceAll('person-0','"person,0"')).trainingPeople,30);
});
test('isotonic fitting pools reversed training targets instead of introducing a reversed score mapping',()=>{
  const csv=syntheticRatings().split('\n').map(line=>{if(!line.startsWith('person-14,'))return line;const row=line.split(',');row[5]=String(Number(row[5])-1);return row.join(',');}).join('\n');
  const profile=fitCalibration(csv);assert.ok(profile.knots.some((k,i)=>i>0&&k[1]===profile.knots[i-1][1]));
  for(let i=1;i<profile.knots.length;i++)assert.ok(profile.knots[i][1]>=profile.knots[i-1][1]);
});
test('validation labels cannot influence the fitted curve',()=>{
  const csv=syntheticRatings(),base=fitCalibration(csv);
  const changed=csv.split('\n').map(line=>{if(!line.includes(',validation,'))return line;const row=line.split(',');row[5]=String(Number(row[5])+.1);return row.join(',');}).join('\n');
  const other=fitCalibration(changed);assert.deepEqual(other.knots,base.knots);assert.ok(other.maeAfter>base.maeAfter);
});
test('calibration never extrapolates or silently changes the raw model prediction',()=>{
  const profile=fitCalibration(syntheticRatings()),base:Appearance={model:'test',pipeline:APPEARANCE_PIPELINE,raw:2.5,score:5,samples:[4.9,5,5.1,5.2,5.3,5.4],sensitivity:{min:4.9,max:5.4}};
  const calibrated=calibrateAppearance(base,profile);assert.equal(calibrated.score,5.8);assert.equal(calibrated.raw,2.5);assert.equal(calibrated.baseScore,5);assert.equal(calibrated.calibration.applied,true);
  assert.equal(calibrateAppearance({...base,raw:.4,score:.8},profile).calibration.reason,'outside-range');
  assert.equal(calibrateAppearance(base,null).score,5);assert.equal(calibrateAppearance(base,null).calibration.reason,'not-loaded');
  const partial=calibrateAppearance({...base,samples:[.5,5,5.1,5.2,5.3,5.4]},profile);assert.equal(partial.calibration.applied,true);assert.equal(partial.evaluatedSamples,null);
  const sheet=ratingSheet(base,'anonymous-123');assert.ok(sheet.includes(',anonymous-123,,5,rater-1,,aligned-six-view-v1'));assert.equal(sheet.trim().split('\n').length,4);assert.throws(()=>ratingSheet(base,'=malicious'));
});
test('six-view aggregation is order-invariant, robust to an extreme sample, and reports variation without confidence',()=>{
  const context:any={};runInNewContext(readFileSync('public/appearance-math.js','utf8'),context);
  const summarize=context.AeroFaceAppearance.summarize;
  const result=summarize([2.9,3,3.1,3,2.8,5]);
  assert.equal(result.raw,3);assert.equal(result.score,6);assert.deepEqual(JSON.parse(JSON.stringify(result.sensitivity)),{min:5.6,max:10});
  assert.equal(summarize([5,2.8,3,3.1,3,2.9]).raw,result.raw);assert.equal('confidence'in result,false);
  assert.throws(()=>summarize([3,3]));assert.throws(()=>summarize([3,3,3,3,3,NaN]));
});
