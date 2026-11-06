import { useI18n } from './i18n';
import type { Side, RatingReference } from './analysis';

const outlines = [
  { cheek:77,hollow:72,jaw:46,chin:12,length:354,eye:28,gap:57,open:15,tilt:-5,asym:3.2,nose:17,noseY:280,mouth:19,mouthY:307,planes:0 },
  { cheek:75,hollow:67,jaw:48,chin:15,length:351,eye:30,gap:50,open:13,tilt:-3,asym:1.7,nose:15,noseY:275,mouth:21,mouthY:301,planes:0 },
  { cheek:74,hollow:65,jaw:50,chin:18,length:348,eye:32,gap:43,open:11,tilt:0,asym:.6,nose:14,noseY:272,mouth:23,mouthY:296,planes:.25 },
  { cheek:73,hollow:63,jaw:53,chin:20,length:346,eye:34,gap:38,open:9,tilt:1,asym:0,nose:13,noseY:270,mouth:24,mouthY:293,planes:.5 },
  { cheek:73,hollow:62,jaw:55,chin:21,length:346,eye:35,gap:36,open:8,tilt:2,asym:0,nose:13,noseY:269,mouth:25,mouthY:292,planes:.7 },
  { cheek:74,hollow:64,jaw:58,chin:23,length:347,eye:36,gap:35,open:7,tilt:3,asym:0,nose:14,noseY:269,mouth:26,mouthY:292,planes:.85 },
  { cheek:73,hollow:62,jaw:56,chin:22,length:347,eye:36,gap:35,open:7,tilt:3,asym:0,nose:13,noseY:268,mouth:25,mouthY:292,planes:.9 },
  { cheek:71,hollow:60,jaw:53,chin:21,length:346,eye:35,gap:35,open:7,tilt:3,asym:0,nose:13,noseY:268,mouth:25,mouthY:292,planes:.9 },
];
const guide={...outlines[4],asym:0};

export default function Illustration({side='front',focus='balance',compact=false,plain=false,reference='man',variant=4}: {
  side?:Side;focus?:'balance'|'eyes'|'jaw';compact?:boolean;plain?:boolean;reference?:RatingReference;variant?:number;
}) {
  const {t}=useI18n(),woman=reference==='woman',s=plain?outlines[Math.max(0,Math.min(7,Math.round(variant)))]:guide;
  const cheek=s.cheek-(woman?1:0),hollow=s.hollow-(woman?2:0),jaw=s.jaw-(woman?6:0),chin=s.chin-(woman?3:0),chinY=s.length-(woman?2:0),jawY=309,crown=65-(woman?2:0);
  const eyeY=214,eyeWidth=s.eye+(woman?1:0),eyeOpen=s.open+(woman?2:0),li=220-s.gap/2,lo=li-eyeWidth,ri=220+s.gap/2,ro=ri+eyeWidth;
  const noseX=220+s.asym*.8,nose=s.nose-(woman?1:0),mouthX=220-s.asym*.5,mouth=s.mouth;
  const cubic=(a:number,b:number,c:number,d:number)=>a*.4**3+3*b*.4**2*.6+3*c*.4*.6**2+d*.6**3;
  const neckX=cubic(220-jaw,225-jaw,208-chin,220-chin),neckY=cubic(jawY,jawY+11,chinY-9,chinY-3);
  const paths=side==='front'
    ?focus==='eyes'?[`${lo},${eyeY-s.tilt} ${li},${eyeY}`,`${li},${eyeY} ${ri},${eyeY}`,`${ri},${eyeY} ${ro},${eyeY-s.tilt}`]
      :focus==='jaw'?[`${220-cheek},245 ${220+cheek},245`,`${220-jaw},${jawY} ${220+jaw},${jawY}`]:[`220,175 220,${chinY}`,`${lo},${eyeY-s.tilt} ${ro},${eyeY-s.tilt}`]
    :focus==='eyes'?['332,225 319,303','314,255 326.65,257.11','315,269 324.40,270.57']
      :focus==='jaw'?['177,220 212,300','212,300 319,303']:['289,185 306,242 319,303'];

  const eye=(left:boolean)=>{
    const d=left?1:-1,outer=left?lo:ro,inner=left?li:ri,y=eyeY+(left?s.asym:-s.asym),center=(outer+inner)/2;
    const browY=y-(plain&&variant<2?15:11),brow=woman?2.2:3.5,bottom=Math.min(2.5,eyeOpen*.25);
    return <g key={left?'left':'right'}>
      <path d={`M${outer-d*1} ${browY-s.tilt}Q${center} ${browY-4} ${inner+d*1} ${browY+1}L${inner+d*1} ${browY+brow}Q${center} ${browY-1} ${outer-d*1} ${browY-s.tilt+2}Z`} fill="#8294ae" strokeWidth=".6"/>
      <path d={`M${outer} ${y-s.tilt}C${outer+d*6} ${y-eyeOpen*.62} ${inner-d*7} ${y-eyeOpen*.58} ${inner} ${y}`} strokeWidth="1.65"/>
      <path d={`M${inner} ${y}C${inner-d*8} ${y+eyeOpen*.46} ${outer+d*7} ${y+eyeOpen*.48} ${outer} ${y-s.tilt}`} strokeWidth="1.05"/>
      <path d={`M${center-2.7} ${y-2}Q${center-3} ${y+bottom} ${center} ${y+bottom}Q${center+3} ${y+bottom} ${center+2.7} ${y-2}`} strokeWidth="1"/>
      <circle cx={center} cy={y+.1} r=".9" fill="#8294ae" stroke="none"/>
      {s.planes>.3&&<path d={`M${outer+d*4} ${y+9}Q${center} ${y+11} ${inner-d*4} ${y+8}`} strokeWidth=".85" opacity=".55"/>}
    </g>;
  };

  return <svg className={`face-illustration line-art ${plain?'outline-only':''}`} viewBox={compact?'85 62 280 315':'0 0 440 490'} fill="none" aria-label={t(side==='front'?'Front face guide illustration':'Side face guide illustration')} role="img">
    <g stroke="#8294ae" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {side==='front'?<>
        <path d={`M${220-crown} 191C${216-crown} 174 ${216-crown} 154 ${220-crown} 140C${225-crown} 112 190 94 220 94C250 94 ${215+crown} 112 ${220+crown} 140C${224+crown} 154 ${224+crown} 174 ${220+crown} 191C${222+crown} 211 ${216+cheek} 228 ${220+cheek} 245C${224+cheek} 252 ${221+hollow} 266 ${220+hollow} 277C${219+hollow} 286 ${224+jaw} 301 ${220+jaw} ${jawY}C${215+jaw} ${jawY+11} ${232+chin} ${chinY-9} ${220+chin} ${chinY-3}Q220 ${chinY+3} ${220-chin} ${chinY-3}C${208-chin} ${chinY-9} ${225-jaw} ${jawY+11} ${220-jaw} ${jawY}C${216-jaw} 301 ${221-hollow} 286 ${220-hollow} 277C${219-hollow} 266 ${216-cheek} 252 ${220-cheek} 245C${224-cheek} 228 ${218-crown} 211 ${220-crown} 191Z`}/>
        <path d={`M${220-crown} 210c-17-12-23 0-18 20 3 13 9 23 21 23M${220+crown} 210c17-12 23 0 18 20-3 13-9 23-21 23M${209-crown} 220q-6 8 5 15M${231+crown} 220q6 8-5 15`} strokeWidth="1.2"/>
        {eye(true)}{eye(false)}
        <path d={`M${noseX-5} 230C${noseX-5} 242 ${noseX-nose+3} ${s.noseY-15} ${noseX-nose} ${s.noseY-6}Q${noseX-nose-2} ${s.noseY} ${noseX-7} ${s.noseY+1}M${noseX+nose} ${s.noseY-7}Q${noseX+nose+3} ${s.noseY} ${noseX+7} ${s.noseY+1}M${noseX-8} ${s.noseY+1}q4-4 7 0m2 0q3-4 7 0M${noseX-5} ${s.noseY+5}q5 2 10 0`} strokeWidth="1.3"/>
        <path d={`M${mouthX-mouth} ${s.mouthY+s.asym*.35}Q${mouthX-11} ${s.mouthY-3} ${mouthX-5} ${s.mouthY-3}Q${mouthX} ${s.mouthY-1} ${mouthX+5} ${s.mouthY-3}Q${mouthX+11} ${s.mouthY-3} ${mouthX+mouth} ${s.mouthY-s.asym*.35}Q${mouthX} ${s.mouthY+3} ${mouthX-mouth} ${s.mouthY+s.asym*.35}M${mouthX-mouth+6} ${s.mouthY+7}Q${mouthX} ${s.mouthY+12} ${mouthX+mouth-6} ${s.mouthY+7}`} strokeWidth="1.2"/>
        {s.planes>0&&<g opacity={s.planes} strokeWidth="1.05"><path d={`M${225-cheek} 244Q${236-cheek} 248 ${242-cheek} 255L${252-cheek} 270M${215+cheek} 244Q${204+cheek} 248 ${198+cheek} 255L${188+cheek} 270`}/><path d={`M${mouthX-9} ${s.mouthY+20}q9-3 18 0`} opacity=".65"/></g>}
        <path d={`M${neckX} ${neckY}C${neckX+1} 351 ${neckX+1} 371 ${neckX-4} 381C${neckX-14} 393 127 401 110 423M${440-neckX} ${neckY}C${439-neckX} 351 ${439-neckX} 371 ${444-neckX} 381C${454-neckX} 393 313 401 330 423`} strokeWidth="1.25"/>
      </>:<>
        <path d="M296 148C289 112 268 92 234 89C196 87 152 100 133 125C116 147 117 181 129 205C137 224 148 239 153 260C165 279 168 295 167 312"/>
        <path d="M296 148C297 163 299 176 289 185C298 202 319 214 332 225C333 231 322 238 306 242C305 247 310 252 314 255Q320 260 311 263L315 269C319 275 311 279 311 284C311 292 323 296 319 303C311 315 280 317 263 312"/>
        <path d="M177 220c-2-14-10-24-21-23-19 1-18 29-7 46 10 14 24 14 28 0m-11-29q-15 5-3 20" strokeWidth="1.2"/>
        <path d="M260 180Q275 172 288 178L289 182Q275 177 260 183Z" fill="#8294ae" strokeWidth=".6"/>
        <path d="M263 196Q277 186 289 191" strokeWidth="1.65"/><path d="M289 191l-8 8q-10 0-18-3m17-5v5M309 236q6-4 10-2M304 263q7 1 11 0" strokeWidth="1.05"/>
        <path d="M179 246C185 270 199 294 212 300C236 307 275 313 302 311M270 218q-17 10-21 27" strokeWidth="1.1"/>
        <path d="M167 312c0 31-17 46-40 62-20 14-33 31-42 55M263 312c-2 24-4 43 13 60 22 20 54 28 69 57" strokeWidth="1.25"/>
      </>}
    </g>
    {!plain&&<>
      <g stroke="#77a0d5" strokeWidth="1" opacity=".38" strokeDasharray="3 5">{side==='front'?<path d={`M${220-cheek} 245H112V${jawY}H${220-jaw}M${220+jaw} ${jawY}H321V245H${220+cheek}`}/>:<path d="M177 220h-49v80h84m107 3h28v-78h-15"/>}</g>
      <g className="guide-focus" key={`${side}-${focus}`} stroke="#4e8cda" strokeWidth="1.7" fill="none">{paths.map((path,index)=><g key={path} style={{animationDelay:`${index*65}ms`}} className="guide-focus-segment"><polyline points={path}/>{path.split(' ').map((pair,i)=>{const[x,y]=pair.split(',').map(Number);return <circle key={i} cx={x} cy={y} r="3.5" fill="#f4f7fc"/>;})}</g>)}</g>
      {!compact&&<text fill="#6685ad" fontSize="11" fontFamily="Geist, sans-serif" x="220" y="462" textAnchor="middle">{t(side==='front'?(focus==='eyes'?'Eye line':focus==='jaw'?'Jaw width':'Symmetry reference'):(focus==='jaw'?'Visual ramus':focus==='eyes'?'Lip–chin relation':'Profile balance'))}</text>}
    </>}
  </svg>;
}
