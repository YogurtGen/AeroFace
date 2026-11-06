import type { Landmark } from './landmarks';

export function faceFrame(mesh:Landmark[],width:number,height:number){
  if(mesh.length<100||![width,height].every(value=>Number.isFinite(value)&&value>0)||mesh.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y)))throw new Error('Incomplete face bounds.');
  const xs=mesh.map(point=>point.x*width),ys=mesh.map(point=>point.y*height);
  const left=Math.max(0,Math.min(...xs)),right=Math.min(width,Math.max(...xs)),top=Math.max(0,Math.min(...ys)),bottom=Math.min(height,Math.max(...ys));
  if(right-left<8||bottom-top<8)throw new Error('Incomplete face bounds.');
  const size=Math.ceil(Math.max(right-left,bottom-top)*1.45);
  const position=(center:number,extent:number)=>size<=extent?Math.max(0,Math.min(extent-size,center-size/2)):center-size/2;
  return {x:position((left+right)/2,width),y:position((top+bottom)/2,height),size,pixels:Math.min(1600,size)};
}
