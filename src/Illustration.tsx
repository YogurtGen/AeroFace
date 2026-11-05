import { useI18n } from './i18n';
import type { Side, RatingReference } from './analysis';

export default function Illustration({side='front',focus='balance',compact=false,plain=false,reference='man',variant=4}: {
  side?:Side;focus?:'balance'|'eyes'|'jaw';compact?:boolean;plain?:boolean;reference?:RatingReference;variant?:number;
}) {
  const {t}=useI18n(),woman=reference==='woman';
  const jaw=woman?277-variant:287-variant*1.8,chin=plain?370-variant*2.8:343;
  const eyeWidth=plain?26+variant:33,eyeGap=plain?54-variant*3:42;
  const li=220-eyeGap/2,lo=li-eyeWidth,ri=220+eyeGap/2,ro=ri+eyeWidth;
  const paths=side==='front'
    ? focus==='eyes'?['166,214 199,214','199,214 241,214','241,214 274,214']
      :focus==='jaw'?[`149,249 291,249`,`166,303 274,303`]:[`220,177 220,${chin}`,'166,214 274,214']
    :focus==='eyes'?['329,231 304,305','312,258 319.6,260.6','312,273 315.1,274.1']
      :focus==='jaw'?['176,217 206,294','206,294 304,305']:['289,188 304,246 304,305'];
  return <svg className={`face-illustration line-art ${plain?'outline-only':''}`} viewBox={compact?'85 62 280 315':'0 0 440 490'} fill="none" aria-label={t(side==='front'?'Front face guide illustration':'Side face guide illustration')} role="img">
    <g stroke="#8294ae" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {side==='front'?<>
        <path d={`M147 177c-5 29-2 68 7 97Q159 291 ${440-jaw} 303L199 ${chin-6}q21 13 42 0L${jaw} 303Q281 291 286 274c9-29 12-68 7-97`}/>
        <path d="M147 208c-18-15-24 1-18 22 2 13 7 24 20 25m144-47c18-15 24 1 18 22-2 13-7 24-20 25M137 216c-7 1-4 17 4 20m162-20c7 1 4 17-4 20"/>
        {woman?<path d="M146 194c-22-34-9-88 23-105 23-19 65-24 91-9 40 2 55 48 38 97m-77-91c-11 32-34 42-68 50m70-48c9 24 31 37 61 47M145 160c-16 53-27 99-33 136m183-142c15 53 23 102 29 142"/>:<path d="M147 188c-14-10-16-29-10-46-13-27 8-48 31-50 15-22 34-28 56-19 23-15 47-8 54 10 30 1 42 22 31 43 14 16 10 40-12 60M150 143c30-41 76-9 113-42m-105 62c27-35 70-12 95-30"/>}
        <path d={`M${lo-5} 199q${eyeWidth/2} -10 ${eyeWidth+5} -3M${ri-3} 196q${eyeWidth/2} -7 ${eyeWidth+8} 3M${lo} 214q${eyeWidth/2} -13 ${eyeWidth} 0q${-eyeWidth/2} 11 ${-eyeWidth} 0ZM${ri} 214q${eyeWidth/2} -13 ${eyeWidth} 0q${-eyeWidth/2} 11 ${-eyeWidth} 0ZM${(lo+li)/2} 211v6M${(ri+ro)/2} 211v6`}/>
        <path d="M215 225l-7 37c4 5 7 5 12 5s8 0 12-5m-22 5 5 3m10 0 5-3M198 291c7-1 15-5 22-2 7-3 15 1 22 2m-44 0c15 4 29 4 44 0m-37 7c10 5 20 5 30 0"/>
        <path d={`M175 ${chin/2+144}V367c-6 22-55 27-65 62M265 ${chin/2+144}V367c6 22 55 27 65 62M110 429c64 18 156 18 220 0`}/>
      </>:<>
        <path d="M140 177c-21-11-26-37-13-57 4-27 27-43 51-42 25-22 53-16 70-10 26-12 48-3 52 16 28 5 36 27 23 44-6 8-15 13-26 15M141 143c34-39 91-12 129-49m-106 61c22-19 57-7 79-30"/>
        <path d="M297 143c0 14 5 28-1 36l-7 9c3 12 21 27 35 36 10 7 7 13-2 16l-18 6c-3 5 0 9 8 12 5 3 4 7-3 9l3 6c5 5-2 9-5 15-3 4 1 11-3 17-7 10-27 9-41 4l-57-15c-12-8-21-26-24-43M139 174c-11 25-6 48 5 66l15 24c5 12 8 27 7 39"/>
        <path d="M176 217c-1-13-9-22-20-21-21 1-19 31-7 47 10 14 23 13 28-1m-10-28c-17 4-16 19-3 20M264 182c9-5 18-5 26-1m-26 16c8-7 17-8 25-6l-9 9-16-3Zm16-5v6M307 239l8-3m-16 31 11 0"/>
        <path d="M166 303c0 36-20 53-42 69-20 14-32 31-39 57m178-120c-2 27-6 45 12 62 23 20 56 26 70 58M85 429c79 20 182 20 260 0"/>
      </>}
    </g>
    {!plain&&<>
      <g stroke="#77a0d5" strokeWidth="1" opacity=".38" strokeDasharray="3 5">
        {side==='front'?<path d="M149 249H112v54h54m108 0h47v-54h-30"/>:<path d="M176 217h-48v77h78m98 11h43v-74h-18"/>}
      </g>
      <g className="guide-focus" key={`${side}-${focus}`} stroke="#4e8cda" strokeWidth="1.7" fill="none">
        {paths.map((path,index)=><g key={path} style={{animationDelay:`${index*65}ms`}} className="guide-focus-segment"><polyline points={path}/>{path.split(' ').map((pair,i)=>{const[x,y]=pair.split(',').map(Number);return <circle key={i} cx={x} cy={y} r="3.5" fill="#f4f7fc"/>;})}</g>)}
      </g>
      {!compact&&<g fill="#6685ad" fontSize="11" fontFamily="Geist, sans-serif">{side==='front'?<text x="115" y="235">{t(focus==='eyes'?'Eye line':focus==='jaw'?'Jaw width':'Symmetry reference')}</text>:<text x="123" y="325">{t(focus==='jaw'?'Visual ramus':focus==='eyes'?'Lip–chin relation':'Profile balance')}</text>}</g>}
    </>}
  </svg>;
}
