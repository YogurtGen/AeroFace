import { APPEARANCE_PIPELINE, type Appearance } from './appearance';

export type Calibration={pipeline:string;knots:[number,number][];trainingPeople:number;validationPeople:number;photos:number;minimumRaters:number;maeBefore:number;maeAfter:number;rmseBefore:number;rmseAfter:number;coverage:number};
export type CalibratedAppearance=Appearance&{baseScore:number;evaluatedSamples:number[]|null;calibration:{applied:boolean;reason:'not-loaded'|'outside-range'|'applied';validationPeople?:number}};
const headers=['person_id','photo_id','split','prediction','rater_id','rating','pipeline'];
export const calibrationTemplate=headers.join(',')+'\n';
export function ratingSheet(appearance:Appearance,photoId:string){
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(photoId))throw new Error('Invalid anonymous photo ID.');
  const prediction=Math.max(0,Math.min(10,appearance.raw*2));
  return calibrationTemplate+[1,2,3].map(rater=>`,${photoId},,${prediction},rater-${rater},,${APPEARANCE_PIPELINE}`).join('\n')+'\n';
}

function csvRows(text:string){
  if(text.length>2_000_000)throw new Error('The rating file is too large.');
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){if(char==='"'&&text[i+1]==='"'){field+='"';i++;}else if(char==='"'){quoted=false;closed=true;}else field+=char;}
    else if(closed&&char!==','&&char!=='\n'&&char!=='\r'){if(char.trim())throw new Error('Invalid CSV quoting.');}
    else if(char==='"'){if(field.trim())throw new Error('Invalid CSV quoting.');quoted=true;}
    else if(char===','){row.push(field.trim());field='';closed=false;}
    else if(char==='\n'||char==='\r'){if(char==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';closed=false;}
    else field+=char;
  }
  if(quoted)throw new Error('Invalid CSV quoting.');
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  if(rows.length>50_000)throw new Error('The rating file is too large.');
  return rows;
}

export function mapCalibration(score:number,profile:Calibration):number|null{
  const knots=profile.knots;
  if(!Number.isFinite(score)||score<knots[0][0]||score>knots[knots.length-1][0])return null;
  for(let i=1;i<knots.length;i++)if(score<=knots[i][0]){
    const[a,b]=knots[i-1],[x,y]=knots[i];return b+(y-b)*(score-a)/(x-a);
  }
  return knots[knots.length-1][1];
}

export function calibrateAppearance(appearance:Appearance,profile:Calibration|null):CalibratedAppearance{
  const baseScore=Math.max(0,Math.min(10,appearance.raw*2));
  const mapped=profile&&profile.pipeline===appearance.pipeline?mapCalibration(baseScore,profile):null;
  const mappedSamples=mapped!==null?appearance.samples.map(value=>mapCalibration(value,profile!)):appearance.samples;
  const evaluatedSamples=mappedSamples.every(value=>value!==null)?mappedSamples as number[]:null;
  return {...appearance,baseScore,evaluatedSamples,score:Math.round((mapped??baseScore)*10)/10,calibration:{applied:mapped!==null,reason:!profile?'not-loaded':mapped===null?'outside-range':'applied',validationPeople:profile?.validationPeople}};
}

export function fitCalibration(text:string):Calibration{
  const rows=csvRows(text.replace(/^\uFEFF/,'')),header=rows.shift();
  if(!header||header.length!==headers.length||headers.some((name,i)=>header[i]!==name))throw new Error('Use the supplied CSV template and column order.');
  type Photo={person:string;id:string;split:string;x:number;ratings:Map<string,number>};
  const photos=new Map<string,Photo>(),people=new Map<string,string>();
  for(const row of rows){
    if(row.length!==headers.length)throw new Error('Every CSV row must contain all seven columns.');
    const[person,id,split,prediction,rater,rating,pipeline]=row;
    if(!person||!id||!rater||[person,id,rater].some(value=>value.length>128))throw new Error('Each rating needs person, photo and rater IDs.');
    if(pipeline!==APPEARANCE_PIPELINE)throw new Error('The ratings must use the current appearance pipeline.');
    if(!['train','validation'].includes(split))throw new Error('Split must be train or validation.');
    if(people.has(person)&&people.get(person)!==split)throw new Error('The same person cannot appear in both training and validation.');
    people.set(person,split);
    const x=Number(prediction),y=Number(rating);
    if(!prediction||!rating||![x,y].every(value=>Number.isFinite(value)&&value>=0&&value<=10))throw new Error('Predictions and ratings must be numbers from 0 to 10.');
    let photo=photos.get(id);
    if(!photo){photo={person,id,split,x,ratings:new Map()};photos.set(id,photo);}
    if(photo.person!==person||photo.split!==split||Math.abs(photo.x-x)>1e-7)throw new Error('A photo must keep the same person, split and prediction.');
    if(photo.ratings.has(rater))throw new Error('A rater may rate each photo only once.');
    photo.ratings.set(rater,y);
  }
  const trainingPeople=[...people.values()].filter(split=>split==='train').length,validationPeople=people.size-trainingPeople;
  if(trainingPeople<30||validationPeople<15)throw new Error('Use at least 30 training people and 15 separate validation people.');
  const minimumRaters=Math.min(...[...photos.values()].map(photo=>photo.ratings.size));
  if(minimumRaters<3)throw new Error('Every photo needs ratings from at least three different people.');
  const counts=new Map<string,number>();for(const photo of photos.values())counts.set(photo.person,(counts.get(photo.person)??0)+1);
  const samples=[...photos.values()].map(photo=>({...photo,y:[...photo.ratings.values()].reduce((a,b)=>a+b,0)/photo.ratings.size,weight:1/counts.get(photo.person)!}));
  const sorted=samples.filter(photo=>photo.split==='train').sort((a,b)=>a.x-b.x);
  const groups:{x:number;sum:number;weight:number}[]=[];
  for(const photo of sorted){const last=groups.at(-1);if(last?.x===photo.x){last.sum+=photo.y*photo.weight;last.weight+=photo.weight;}else groups.push({x:photo.x,sum:photo.y*photo.weight,weight:photo.weight});}
  if(groups.length<3)throw new Error('Training needs at least three different model predictions.');
  const blocks:{start:number;end:number;sum:number;weight:number}[]=[];
  groups.forEach((group,index)=>{
    blocks.push({start:index,end:index,sum:group.sum,weight:group.weight});
    while(blocks.length>1){const a=blocks[blocks.length-2],b=blocks[blocks.length-1];if(a.sum/a.weight<=b.sum/b.weight)break;blocks.splice(-2,2,{start:a.start,end:b.end,sum:a.sum+b.sum,weight:a.weight+b.weight});}
  });
  const knots:[number,number][]=groups.map(group=>[group.x,0]);
  for(const block of blocks)for(let i=block.start;i<=block.end;i++)knots[i][1]=block.sum/block.weight;
  const profile:Calibration={pipeline:APPEARANCE_PIPELINE,knots,trainingPeople,validationPeople,photos:photos.size,minimumRaters,maeBefore:0,maeAfter:0,rmseBefore:0,rmseAfter:0,coverage:0};
  const validation=samples.filter(photo=>photo.split==='validation');let covered=0;
  for(const photo of validation){
    const mapped=mapCalibration(photo.x,profile);if(mapped!==null)covered+=photo.weight;
    const before=photo.x-photo.y,after=(mapped??photo.x)-photo.y;
    profile.maeBefore+=Math.abs(before)*photo.weight;profile.maeAfter+=Math.abs(after)*photo.weight;
    profile.rmseBefore+=before**2*photo.weight;profile.rmseAfter+=after**2*photo.weight;
  }
  profile.maeBefore/=validationPeople;profile.maeAfter/=validationPeople;
  profile.rmseBefore=Math.sqrt(profile.rmseBefore/validationPeople);profile.rmseAfter=Math.sqrt(profile.rmseAfter/validationPeople);profile.coverage=covered/validationPeople;
  if(profile.coverage<.8)throw new Error('At least 80% of validation people must fall within the training prediction range.');
  if(profile.maeAfter>=profile.maeBefore||profile.rmseAfter>profile.rmseBefore)throw new Error('Calibration did not improve validation error. Keep the uncalibrated model.');
  return profile;
}
