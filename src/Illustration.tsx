import { useI18n } from './i18n';
import type { Side, RatingReference } from './analysis';

const outlines = [
  { jaw:48,chin:16,length:357,cheek:78,eye:28,gap:45,open:8,tilt:-2,nose:15,mouth:21 },
  { jaw:50,chin:18,length:350,cheek:74,eye:30,gap:46,open:9,tilt:-1,nose:13,mouth:22 },
  { jaw:54,chin:21,length:347,cheek:78,eye:32,gap:42,open:8,tilt:0,nose:14,mouth:23 },
  { jaw:57,chin:23,length:345,cheek:75,eye:33,gap:40,open:7,tilt:1,nose:12,mouth:24 },
  { jaw:60,chin:25,length:343,cheek:77,eye:34,gap:38,open:6,tilt:2,nose:12,mouth:25 },
  { jaw:65,chin:28,length:342,cheek:78,eye:35,gap:36,open:5,tilt:3,nose:11,mouth:26 },
  { jaw:68,chin:30,length:345,cheek:79,eye:35,gap:35,open:5,tilt:3,nose:12,mouth:26 },
  { jaw:66,chin:28,length:340,cheek:77,eye:35,gap:35,open:5,tilt:4,nose:11,mouth:25 },
];
const guide={jaw:57,chin:23,length:345,cheek:75,eye:33,gap:42,open:6,tilt:0,nose:12,mouth:23};

export default function Illustration({side='front',focus='balance',compact=false,plain=false,reference='man',variant=4}: {
  side?:Side;focus?:'balance'|'eyes'|'jaw';compact?:boolean;plain?:boolean;reference?:RatingReference;variant?:number;
}) {
  const {t}=useI18n(),woman=reference==='woman',shape=plain?outlines[Math.max(0,Math.min(7,Math.round(variant)))]:guide;
  const jaw=shape.jaw-(woman?6:0),chinHalf=shape.chin-(woman?3:0),chinY=shape.length-(woman?3:0),cheek=shape.cheek-(woman?2:0);
  const jawY=plain?309+(shape.length-345)*.18:309,eyeY=214,eyeWidth=shape.eye+(woman?1:0),eyeOpen=shape.open+5+(woman?1:0),tilt=shape.tilt;
  const li=220-shape.gap/2,lo=li-eyeWidth,ri=220+shape.gap/2,ro=ri+eyeWidth;
  const nose=shape.nose-(woman?1:0),mouth=shape.mouth,crown=71-(woman?2:0);
  const cubic=(a:number,b:number,c:number,d:number)=>a*.4**3+3*b*.4**2*.6+3*c*.4*.6**2+d*.6**3;
  const neckX=cubic(220-jaw,231-jaw,208-chinHalf,220-chinHalf),neckY=cubic(jawY,jawY+16,chinY-5,chinY-2);
  const paths=side==='front'
    ?focus==='eyes'?[`${lo},214 ${li},214`,`${li},214 ${ri},214`,`${ri},214 ${ro},214`]
      :focus==='jaw'?[`${221-cheek},249 ${219+cheek},249`,`${220-jaw},${jawY} ${220+jaw},${jawY}`]:[`220,175 220,${chinY}`,`${lo},214 ${ro},214`]
    :focus==='eyes'?['329,231 304,305','312,258 319.07,260.39','312,273 314.52,273.85']
      :focus==='jaw'?['176,217 206,294','206,294 304,305']:['289,188 304,246 304,305'];

  return <svg className={`face-illustration line-art ${plain?'outline-only':''}`} viewBox={compact?'85 62 280 315':'0 0 440 490'} fill="none" aria-label={t(side==='front'?'Front face guide illustration':'Side face guide illustration')} role="img">
    <g stroke="#8294ae" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      {side==='front'?<>
        <path d={`M${220-crown} 192C${220-crown} 176 ${216-crown} 163 ${220-crown} 145C${224-crown} 115 188 96 220 96C252 96 ${216+crown} 115 ${220+crown} 145C${224+crown} 163 ${220+crown} 176 ${220+crown} 192C${221+cheek} 214 ${220+cheek} 244 ${217+cheek} 265C${215+cheek} 285 ${227+jaw} ${jawY-9} ${220+jaw} ${jawY}C${209+jaw} ${jawY+16} ${232+chinHalf} ${chinY-5} ${220+chinHalf} ${chinY-2}Q220 ${chinY+2} ${220-chinHalf} ${chinY-2}C${208-chinHalf} ${chinY-5} ${231-jaw} ${jawY+16} ${220-jaw} ${jawY}C${213-jaw} ${jawY-9} ${225-cheek} 285 ${223-cheek} 265C${220-cheek} 244 ${219-cheek} 214 ${220-crown} 192Z`}/>
        <path d={`M${220-cheek} 211c-19-13-24 1-18 22 3 13 8 23 21 22M${220+cheek} 211c19-13 24 1 18 22-3 13-8 23-21 22M${209-cheek} 220c-6 1-3 14 4 17M${231+cheek} 220c6 1 3 14-4 17`}/>
        <path d={`M${lo-3} ${199-tilt}Q${(lo+li)/2} ${191-tilt} ${li+1} 198M${ri-1} 198Q${(ri+ro)/2} ${191-tilt} ${ro+3} ${199-tilt}`}/>
        <path d={`M${lo} ${eyeY-tilt}Q${(lo+li)/2} ${eyeY-eyeOpen} ${li} ${eyeY}Q${(lo+li)/2} ${eyeY+eyeOpen*.65} ${lo} ${eyeY-tilt}ZM${ri} ${eyeY}Q${(ri+ro)/2} ${eyeY-eyeOpen} ${ro} ${eyeY-tilt}Q${(ri+ro)/2} ${eyeY+eyeOpen*.65} ${ri} ${eyeY}M${(lo+li)/2-3} ${eyeY-3}q0 6 3 6t3-6M${(ri+ro)/2-3} ${eyeY-3}q0 6 3 6t3-6`}/>
        <path d={`M214 231c0 11-2 21-${nose-6} 29q-3 6 4 7m${2*nose-8} 0q7-1 4-7M${220-nose+4} 268q4-3 7 0m2 0q3-3 7 0M214 273q6 3 12 0`}/>
        <path d={`M${220-mouth} 293Q207 288 215 289Q220 292 225 289Q233 288 ${220+mouth} 293Q220 298 ${220-mouth} 293M${226-mouth} 301q${mouth-6} 7 ${2*mouth-12} 0`}/>
        {(plain&&variant>=4)&&<path d={`M${222-cheek} 259q8 9 16 12M${218+cheek} 259q-8 9-16 12`} opacity=".6"/>}
        <path d={`M${neckX} ${neckY}C${neckX+1} 351 ${neckX+3} 373 ${neckX-2} 381C${neckX-10} 394 126 398 110 422M${440-neckX} ${neckY}C${439-neckX} 351 ${437-neckX} 373 ${442-neckX} 381C${450-neckX} 394 314 398 330 422`}/>
      </>:<>
        <path d="M297 143C286 111 258 92 223 94C172 91 126 111 122 154C117 177 122 197 134 213C137 231 143 251 153 270C162 285 166 294 166 303"/>
        <path d="M297 143C298 158 301 177 289 188C295 204 317 220 329 231C330 235 322 242 304 246C302 250 307 255 312 258Q318 262 309 267L312 273Q316 277 307 284C302 290 304 300 304 305C297 313 278 313 263 309"/>
        <path d="M176 217c-1-13-9-22-20-21-21 1-19 31-7 47 10 14 23 13 28-1m-10-28c-17 4-16 19-3 20M264 182c9-5 18-5 26-1M264 197q12-10 25-6l-9 9-16-3Zm16-5v6M307 239q5-5 9-3M300 267h10"/>
        <path d="M179 251C183 271 194 287 206 294C233 305 270 312 294 310"/>
        <path d="M166 303c0 36-20 53-42 69-20 14-32 31-39 57M263 309c-2 27-6 45 12 62 23 20 56 26 70 58"/>
      </>}
    </g>
    {!plain&&<>
      <g stroke="#77a0d5" strokeWidth="1" opacity=".38" strokeDasharray="3 5">
        {side==='front'?<path d={`M${221-cheek} 249H112V${jawY}H${220-jaw}M${220+jaw} ${jawY}H321V249H${219+cheek}`}/>:<path d="M176 217h-48v77h78m98 11h43v-74h-18"/>}
      </g>
      <g className="guide-focus" key={`${side}-${focus}`} stroke="#4e8cda" strokeWidth="1.7" fill="none">
        {paths.map((path,index)=><g key={path} style={{animationDelay:`${index*65}ms`}} className="guide-focus-segment"><polyline points={path}/>{path.split(' ').map((pair,i)=>{const[x,y]=pair.split(',').map(Number);return <circle key={i} cx={x} cy={y} r="3.5" fill="#f4f7fc"/>;})}</g>)}
      </g>
      {!compact&&<g fill="#6685ad" fontSize="11" fontFamily="Geist, sans-serif">{side==='front'?<text x="220" y="462" textAnchor="middle">{t(focus==='eyes'?'Eye line':focus==='jaw'?'Jaw width':'Symmetry reference')}</text>:<text x="220" y="462" textAnchor="middle">{t(focus==='jaw'?'Visual ramus':focus==='eyes'?'Lip–chin relation':'Profile balance')}</text>}</g>}
    </>}
  </svg>;
}
