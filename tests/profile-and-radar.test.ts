import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapLandmarks,type Landmark} from '../src/landmarks';
import {contourAngles,calculateMetrics,tierLabel,validatePoints,type Points} from '../src/analysis';
import {radarPoint,radarPoints,radarLabels} from '../src/radar';
const points:Points={nasion:{x:.56,y:.28},noseTip:{x:.74,y:.43},noseBase:{x:.62,y:.48},upperLip:{x:.65,y:.54},lowerLip:{x:.62,y:.6},chin:{x:.62,y:.7},jawAngle:{x:.42,y:.7},ramusTop:{x:.29,y:.4}};
function mesh(){const result:Landmark[]=Array.from({length:478},()=>({x:.5,y:.5,z:0}));for(const[key,index]of Object.entries({nasion:168,noseTip:4,noseBase:2,upperLip:0,lowerLip:17,chin:199,jawAngle:172,ramusTop:234}))result[index]={...points[key],z:-.2};result[454]={x:.42,y:.4,z:.2};return result;}
test('profile extraction chooses the visible-side jaw and uses chin projection rather than lowest chin',()=>{
  const source=mesh();source[152]={x:.6,y:.77};
  assert.deepEqual(mapLandmarks('profile',source,800,1000),points);
  const mirrored=source.map(point=>({...point,x:1-point.x}));
  [mirrored[234],mirrored[454]]=[mirrored[454],mirrored[234]];[mirrored[172],mirrored[397]]=[mirrored[397],mirrored[172]];
  const result=mapLandmarks('profile',mirrored,800,1000);
  for(const[key,point]of Object.entries(points)){assert.ok(Math.abs(result[key].x-(1-point.x))<1e-12);assert.equal(result[key].y,point.y);}
});
test('a frontal or incomplete mesh is not silently treated as a side-profile reading',()=>{
  assert.throws(()=>mapLandmarks('front',mesh(),800,1000),/front-facing/);
  const source=mesh();source[454]={x:.71,y:.4,z:-.2};assert.throws(()=>mapLandmarks('profile',source,800,1000),/side profile/);
  source[234].z=undefined;assert.throws(()=>mapLandmarks('profile',source,800,1000),/verified/);
  assert.throws(()=>mapLandmarks('profile',[],800,1000));
});
test('an inverted jaw contour is rejected in either profile direction',()=>{
  for(const mirrored of[false,true]){
    const source=Object.fromEntries(Object.entries(points).map(([id,p])=>[id,{x:mirrored?1-p.x:p.x,y:p.y}]));
    assert.doesNotThrow(()=>validatePoints('profile',source,800,1000));
    assert.throws(()=>validatePoints('profile',{...source,jawAngle:{...source.noseTip,y:source.chin.y}},800,1000),/jaw corner/);
    assert.throws(()=>validatePoints('profile',{...source,jawAngle:{...source.ramusTop,y:.3}},800,1000),/jaw corner/);
  }
});
test('chin angle uses the actual pixel aspect ratio and is invariant to scale and reflection',()=>{
  const first=contourAngles(points,800,1000);assert.equal(first.length,3);assert.equal(first[2].degrees,90);
  assert.deepEqual(first.map(item=>item.degrees),contourAngles(points,1600,2000).map(item=>item.degrees));
  const mirrored=Object.fromEntries(Object.entries(points).map(([key,p])=>[key,{x:1-p.x,y:p.y}]));
  const reflected=contourAngles(mirrored,800,1000);first.forEach((item,index)=>assert.ok(Math.abs(item.degrees-reflected[index].degrees)<1e-10));
  assert.notEqual(first[0].degrees,contourAngles(points,1600,1000)[0].degrees);
  assert.equal(calculateMetrics('profile',points,800,1000).length,4,'contextual chin angle must not add an undisclosed fifth score');
});
test('radar coordinates represent real 0–10 geometry scores without invented axes',()=>{
  const metrics=calculateMetrics('profile',points,800,1000).map((metric,index)=>({...metric,score:index===0?0:10}));
  const plotted=radarPoints(metrics);assert.deepEqual(plotted[0],{x:210,y:152});assert.deepEqual(plotted[1],radarPoint(1,1));assert.ok(metrics.every(metric=>radarLabels[metric.id]));
  assert.throws(()=>radarPoints(metrics.slice(1)));assert.throws(()=>radarPoints(metrics.map(metric=>({...metric,score:11}))));
});
test('the user-selected reference changes terminology rather than inventing a separate AI calibration',()=>{
  assert.equal(tierLabel(6.4,'man'),'HTN');assert.equal(tierLabel(6.4,'woman'),'HTB');assert.equal(tierLabel(9.7,'woman'),'True Eve');
});
