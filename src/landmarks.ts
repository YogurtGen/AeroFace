import { definitions, validatePoints, type Points, type Side } from './analysis';
export type Landmark={x:number;y:number;z?:number};
export function mapLandmarks(side:Side,mesh:Landmark[],width:number,height:number):Points {
  let indices:Record<string,number>;
  if(side==='front'){
    const left=mesh[234],right=mesh[454];
    if(left&&right&&Number.isFinite(left.z)&&Number.isFinite(right.z)){
      const projected=Math.hypot(left.x-right.x,(left.y-right.y)*height/width);
      if(Math.abs(left.z!-right.z!)/Math.max(projected,.001)>.9)throw new Error('Use a front-facing photo for front analysis. Put a side profile in the Side view slot.');
    }
    indices=Object.fromEntries(definitions.front.map(def=>[def.id,def.index!]));
  }
  else{
    const left=mesh[234],right=mesh[454];
    if(!left||!right||!Number.isFinite(left.z)||!Number.isFinite(right.z))throw new Error('The profile direction could not be verified. Place points manually.');
    const projected=Math.hypot(left.x-right.x,(left.y-right.y)*height/width);
    if(Math.abs(left.z!-right.z!)/Math.max(projected,.001)<.9)throw new Error('Use a clear left or right side profile. A front photo cannot measure the side contour.');
    const nearLeft=left.z!<right.z!;
    indices={nasion:168,noseTip:4,noseBase:2,upperLip:0,lowerLip:17,chin:199,jawAngle:nearLeft?172:397,ramusTop:nearLeft?234:454};
  }
  const points=Object.fromEntries(Object.entries(indices).map(([key,index])=>{
    const point=mesh[index];
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new Error('Landmark detection was incomplete. Try another photo or place points manually.');
    return[key,{x:Math.max(0,Math.min(1,point.x)),y:Math.max(0,Math.min(1,point.y))}];
  }));
  validatePoints(side,points,width,height);
  return points;
}
