import {test} from 'node:test';
import assert from 'node:assert/strict';
import {faceFrame,reframePoints} from '../src/framing';
import {calculateMetrics,contourAngles,type Points} from '../src/analysis';

const mesh=Array.from({length:468},(_,index)=>({x:index%2?.62:.38,y:index%3?.08:.36}));
test('face framing selects the face rather than a portrait center and keeps a padded square',()=>{
  const frame=faceFrame(mesh,236,354);
  assert.equal(frame.size,Math.ceil((.36-.08)*354*1.45));assert.equal(frame.pixels,frame.size);
  assert.ok(frame.y<354/2-frame.size/2,'the crop follows the face high in a full-body photo');
  for(const point of mesh){assert.ok(point.x*236>frame.x&&point.x*236<frame.x+frame.size);assert.ok(point.y*354>frame.y&&point.y*354<frame.y+frame.size);}
});
test('carrying profile landmarks into a crop preserves measured geometry and mirror direction',()=>{
  const points:Points={nasion:{x:.56,y:.28},noseTip:{x:.74,y:.43},noseBase:{x:.62,y:.48},upperLip:{x:.65,y:.54},lowerLip:{x:.64,y:.59},chin:{x:.62,y:.7},jawAngle:{x:.34,y:.63},ramusTop:{x:.29,y:.4}};
  for(const mirrored of[false,true]){
    const source=Object.fromEntries(Object.entries(points).map(([id,p])=>[id,{x:mirrored?1-p.x:p.x,y:p.y}]));
    const frame={x:100,y:150,size:600,pixels:600},mapped=reframePoints(source,frame,800,1000);
    const before=calculateMetrics('profile',source,800,1000),after=calculateMetrics('profile',mapped,600,600);
    before.forEach((metric,i)=>{assert.ok(Math.abs(metric.value-after[i].value)<1e-10);assert.ok(Math.abs(metric.score-after[i].score)<1e-10);});
    contourAngles(source,800,1000).forEach((angle,i)=>assert.ok(Math.abs(angle.degrees-contourAngles(mapped,600,600)[i].degrees)<1e-10));
  }
  assert.throws(()=>reframePoints({bad:{x:2,y:.5}},{x:0,y:0,size:600,pixels:600},800,1000));
});
test('edge faces retain their full contour and large frames only downsample',()=>{
  const edge=mesh.map(point=>({...point,x:point.x-.38,y:point.y+.6})),frame=faceFrame(edge,100,600);
  for(const point of edge){assert.ok(point.x*100>=frame.x&&point.x*100<=frame.x+frame.size);assert.ok(point.y*600>=frame.y&&point.y*600<=frame.y+frame.size);}
  const large=faceFrame(mesh,1600,8000);assert.equal(large.pixels,1600);assert.ok(large.pixels<large.size);
  assert.throws(()=>faceFrame([],100,100));assert.throws(()=>faceFrame(mesh,NaN,100));assert.throws(()=>faceFrame(mesh.map(point=>({...point,x:NaN})),100,100));
});
