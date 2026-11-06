import {test} from 'node:test';
import assert from 'node:assert/strict';
import {faceFrame} from '../src/framing';

const mesh=Array.from({length:468},(_,index)=>({x:index%2?.62:.38,y:index%3?.08:.36}));
test('face framing selects the face rather than a portrait center and keeps a padded square',()=>{
  const frame=faceFrame(mesh,236,354);
  assert.equal(frame.size,Math.ceil((.36-.08)*354*1.45));assert.equal(frame.pixels,frame.size);
  assert.ok(frame.y<354/2-frame.size/2,'the crop follows the face high in a full-body photo');
  for(const point of mesh){assert.ok(point.x*236>frame.x&&point.x*236<frame.x+frame.size);assert.ok(point.y*354>frame.y&&point.y*354<frame.y+frame.size);}
});
test('edge faces retain their full contour and large frames only downsample',()=>{
  const edge=mesh.map(point=>({...point,x:point.x-.38,y:point.y+.6})),frame=faceFrame(edge,100,600);
  for(const point of edge){assert.ok(point.x*100>=frame.x&&point.x*100<=frame.x+frame.size);assert.ok(point.y*600>=frame.y&&point.y*600<=frame.y+frame.size);}
  const large=faceFrame(mesh,1600,8000);assert.equal(large.pixels,1600);assert.ok(large.pixels<large.size);
  assert.throws(()=>faceFrame([],100,100));assert.throws(()=>faceFrame(mesh,NaN,100));assert.throws(()=>faceFrame(mesh.map(point=>({...point,x:NaN})),100,100));
});
