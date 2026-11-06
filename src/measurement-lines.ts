import { calculateMetrics, definitions, distance, toPixels, type Point, type Points, type Side } from './analysis';
export type MeasurementLine = {id:string;name:string;explanation:string;from:Point;to:Point;fromLabel:string;toLabel:string;metricIds:string[];reference:boolean;display:string};
export function projectOntoLine(point:Point,from:Point,to:Point):Point {
  const dx=to.x-from.x,dy=to.y-from.y,denominator=dx*dx+dy*dy;
  if(denominator<1e-10)throw new Error('The reference line is too short. Check the landmarks.');
  const amount=((point.x-from.x)*dx+(point.y-from.y)*dy)/denominator;
  return{x:from.x+amount*dx,y:from.y+amount*dy};
}
export function measurementLines(side:Side,points:Points,width:number,height:number):MeasurementLine[] {
  try{calculateMetrics(side,points,width,height);}catch{return[];}
  const p=toPixels(points,width,height),lines:MeasurementLine[]=[];
  const midpoint=(a:Point,b:Point)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const label=(key:string)=>definitions[side].find(def=>def.id===key)?.label??key;
  const add=(id:string,name:string,explanation:string,from:Point,to:Point,fromLabel:string,toLabel:string,metricIds:string[],reference=false)=>lines.push({id,name,explanation,from:{x:from.x/width,y:from.y/height},to:{x:to.x/width,y:to.y/height},fromLabel,toLabel,metricIds,reference,display:`${Math.round(distance(from,to))} px`});
  const segment=(id:string,name:string,explanation:string,a:string,b:string,metricIds:string[],reference=false)=>add(id,name,explanation,p[a],p[b],label(a),label(b),metricIds,reference);
  if(side==='front') {
    const left=midpoint(p.eyeLO,p.eyeLI),right=midpoint(p.eyeRI,p.eyeRO),eyes=midpoint(left,right),roll=Math.atan2(right.y-left.y,right.x-left.x),scale=distance(p.cheekL,p.cheekR),normal={x:-Math.sin(roll),y:Math.cos(roll)};
    add('centerline','Facial centerline','The symmetry axis passes through the eye midpoint, perpendicular to the eye line. Paired landmarks are compared across it.',{x:eyes.x-normal.x*scale*.45,y:eyes.y-normal.y*scale*.45},{x:eyes.x+normal.x*scale*.8,y:eyes.y+normal.y*scale*.8},'Upper centerline','Lower centerline',['symmetry'],true);
    segment('outer-eye-pair','Outer-eye alignment','Connects the outer eye corners. Their mirrored offsets contribute to the five-pair symmetry average.','eyeLO','eyeRO',['symmetry']);
    segment('inner-eye-gap','Inner-eye gap','The distance between the inner eye corners is divided by average eye width. These points also contribute to symmetry.','eyeLI','eyeRI',['eyes','symmetry']);
    for(const [id,name,a,b]of[['left-eye-width','Left eye width','eyeLO','eyeLI'],['right-eye-width','Right eye width','eyeRI','eyeRO']])segment(id,name,'Inner-to-outer eye segment. Its length is used for eye spacing; its head-roll-corrected angle gives the additional eye-corner tilt reading.',a,b,['eyes'],true);
    segment('cheek-width','Cheek width','The visible cheek-to-cheek width normalizes symmetry differences and the jaw-width ratio.','cheekL','cheekR',['jaw','symmetry'],true);
    segment('jaw-width','Jaw width','The distance between the visible jaw corners is divided by cheek width. The same pair also contributes to symmetry.','jawL','jawR',['jaw','symmetry']);
    segment('mouth-alignment','Mouth alignment','The mouth-corner pair contributes to symmetry. Its length divided by cheek width gives the additional mouth-width ratio. Expression can change both readings.','mouthL','mouthR',['symmetry']);
    add('eye-chin','Eye-to-chin height','This is the reference length for lower-face balance: eye midpoint to the bottom of the chin.',eyes,p.chin,'Eye midpoint',label('chin'),['balance'],true);
    segment('nose-chin','Nose-to-chin height','Nose-base-to-chin length is divided by the eye-to-chin reference length.','noseBase','chin',['balance']);
  } else {
    segment('upper-profile','Upper profile segment','This segment meets the other profile segment at the nose base. Together they form the profile-balance angle.','nasion','noseBase',['profile-balance']);
    segment('lower-profile','Lower profile segment','This segment meets the other profile segment at the nose base. Together they form the profile-balance angle.','noseBase','chin',['profile-balance']);
    segment('profile-height','Profile height','Nose-root-to-chin distance normalizes both lip offsets so the reading is independent of image scale.','nasion','chin',['lips'],true);
    segment('nose-chin-reference','Nose-to-chin reference','A straight line from nose tip to chin. Lip distances are measured perpendicular to this line.','noseTip','chin',['lips'],true);
    for(const [id,name,key]of[['upper-lip-offset','Upper-lip offset','upperLip'],['lower-lip-offset','Lower-lip offset','lowerLip']])add(id,name,'This perpendicular segment measures the lip distance to the nose–chin line. The two lip offsets are averaged and divided by profile height.',p[key],projectOntoLine(p[key],p.noseTip,p.chin),label(key),'Projection onto nose–chin line',['lips']);
    segment('ramus-segment','Visual ramus segment','The visible near-ear segment is compared with the jaw-to-chin segment and also forms one arm of the jaw-contour angle. It is not the anatomical bone boundary.','ramusTop','jawAngle',['ramus','profile-jaw']);
    segment('jaw-segment','Jaw-to-chin segment','This segment is the denominator of the visual ramus ratio and the other arm of the jaw-contour angle.','jawAngle','chin',['ramus','profile-jaw'],true);
  }
  const centerline=lines.find(line=>line.id==='centerline');
  if(centerline)centerline.display='Symmetry reference';
  return lines;
}
