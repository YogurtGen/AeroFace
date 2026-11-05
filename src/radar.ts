import type { Metric } from './analysis';
export const radarLabels:Record<string,string>={symmetry:'Symmetry',eyes:'Eye spacing',balance:'Lower face',jaw:'Jaw width','profile-balance':'Profile','lips':'Lip relation','profile-jaw':'Jaw angle',ramus:'Ramus'};
export const radarPoint=(index:number,fraction:number)=>{const angle=-Math.PI/2+index*Math.PI/2;return{x:210+Math.cos(angle)*86*fraction,y:152+Math.sin(angle)*86*fraction};};
export function radarPoints(metrics:Metric[]){
  if(metrics.length!==4||metrics.some(metric=>!Number.isFinite(metric.score)||metric.score<0||metric.score>10))throw new Error('A radar profile requires four valid geometry scores.');
  return metrics.map((metric,index)=>radarPoint(index,metric.score/10));
}
