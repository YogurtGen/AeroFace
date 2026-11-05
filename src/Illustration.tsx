import { useI18n } from './i18n';
import { useId } from 'react';
import type { Side } from './analysis';
export default function Illustration({ side = 'front', focus = 'balance', compact = false }: { side?: Side; focus?: 'balance'|'eyes'|'jaw'; compact?: boolean }) {
  const { t } = useI18n();
  const id=useId(), head=`${id}-head`, neck=`${id}-neck`, orb=`${id}-orb`;
  const paths = side==='front' ? (focus==='eyes'?['146,218 193,218','193,218 247,218','247,218 294,218']:focus==='jaw'?['132,257 308,257','151,307 289,307']:['220,107 220,373','146,218 294,218']) : (focus==='eyes'?['330,252 305,337','309,287 318.85,289.90','307,305 313.82,307.01']:focus==='jaw'?['184,232 210,322','210,322 305,337']:['287,212 300,267 305,337']);

  return <svg className="face-illustration" viewBox={compact?'85 62 280 315':'0 0 440 490'} fill="none" aria-label={t(side==='front'?'Front face guide illustration':'Side face guide illustration')} role="img">
    <defs>
      <linearGradient id={head} x1="115" y1="110" x2="340" y2="370" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset=".5" stopColor="#dce2eb"/><stop offset="1" stopColor="#bdc8d7"/></linearGradient>
      <linearGradient id={neck} x1="130" y1="400" x2="290" y2="460"><stop stopColor="#dae0e9"/><stop offset=".5" stopColor="#f8faff"/><stop offset="1" stopColor="#c5cfdd"/></linearGradient>
      <radialGradient id={orb}><stop stopColor="#e1ebfa"/><stop offset="1" stopColor="#f2f5fa" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="220" cy="270" rx="215" ry="215" fill={`url(#${orb})`}/>
    <ellipse cx="220" cy="448" rx="126" ry="13" fill="#c4cddd" opacity=".18"/>
    {side === 'front' ? <>
      <path d="M177 331v54c-20 15-53 25-67 53 61 26 159 26 220 0-16-29-47-38-67-53v-54" fill={`url(#${neck})`}/>
      <path d="M126 216c-17-14-24 6-17 34 3 15 12 26 24 23M314 216c17-14 24 6 17 34-3 15-12 26-24 23" fill="#d3dbe7" stroke="#bdc8d8"/>
      <path d="M220 70c-64 0-104 46-99 117l11 84c7 57 50 96 88 101 38-5 81-44 88-101l11-84c5-71-35-117-99-117Z" fill={`url(#${head})`} stroke="#c7d0df"/>
      <path d="M140 200c18-12 40-12 59-1M241 199c19-11 41-11 59 1" stroke="#a7b5c8" strokeWidth="3" strokeLinecap="round"/>
      <path d="M146 218c14-10 34-10 47 0-13 11-33 11-47 0ZM247 218c13-10 33-10 47 0-14 11-34 11-47 0Z" fill="#eaf0f7" stroke="#a6b4c8" strokeWidth="1.5"/>
      <ellipse cx="171" cy="219" rx="6" ry="7" fill="#9aaac1"/><ellipse cx="269" cy="219" rx="6" ry="7" fill="#9aaac1"/>
      <path d="m220 222-13 49c6 7 20 7 26 0M203 285c10 4 24 4 34 0M185 307c23-11 47-11 70 0-23 15-47 15-70 0Z" stroke="#aebbcf" strokeWidth="1.5"/>
      <path d="M144 252c11 32 27 58 48 75M296 252c-11 32-27 58-48 75M220 82v274" stroke="#fff" strokeOpacity=".65"/>
      <g stroke="#5b8dd8" strokeWidth="1" opacity=".75"><path d="M146 218h148M132 257h176M151 307h138M220 107v266M146 218l74 67 74-67M132 257l88 99 88-99M151 307l69-22 69 22"/></g>
      <g fill="#4787e1" stroke="white" strokeWidth="2">{[[146,218],[193,218],[247,218],[294,218],[132,257],[308,257],[151,307],[289,307],[220,285],[220,356]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4"/>)}</g>
      <path d="M91 218h37M91 218v139h112M327 218h23v67h-99" stroke="#8ca9d1" strokeDasharray="3 5"/>
      {!compact&&<g fill="#54739f" fontSize="11" fontFamily="Geist, sans-serif"><text x="64" y="292" transform="rotate(-90 64 292)">{t('Face proportions')}</text><text x="291" y="203">{t('Eye line')}</text></g>}
    </> : <>
      <path d="M173 300v85c-30 16-53 31-66 55 63 24 151 24 215 0-17-28-50-41-70-55v-47" fill={`url(#${neck})`}/>
      <path d="M185 74c62-9 103 25 106 78l-1 36c0 10 5 17-3 24 4 12 20 26 38 34 9 5 6 11-2 15l-23 6c-3 6-1 13 5 17l4 3-7 7 5 11c-5 6-7 11-3 20 5 9 2 16-7 20-24 9-62-4-87-23l-39-29c-26-23-42-58-42-105-1-58 14-105 56-114Z" fill={`url(#${head})`} stroke="#a9b9cf" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M184 232c14 15 19 53 26 90 33 8 59 18 87 13-27 12-64-2-87-13l-39-29Z" fill="#aabbd1" opacity=".2"/>
      <path d="M253 198c11-7 22-7 32-2M257 215c10-5 18-4 26 1l-9 4-17-5Z" stroke="#8e9fb9" strokeWidth="2" strokeLinecap="round"/>
      <path d="M269 214v5" stroke="#7e91af" strokeWidth="3" strokeLinecap="round"/>
      <path d="m302 256 9-2M299 293l7 1M294 316l8 2M182 226c-17-12-31-2-29 18 1 15 10 30 21 28 10-2 13-22 8-46ZM174 239c-10-3-12 9-4 16M193 267c18 20 26 30 32 42" stroke="#9aaec8" strokeWidth="1.8" strokeLinecap="round"/>
      <g stroke="#5b8dd8" strokeWidth="1.4"><path d="m184 232 26 90 95 15M287 212l13 55 5 70M330 252l-25 85"/></g>
      <path d="M210 322h-85M184 232h-59v90M305 337h43v-85h-18" stroke="#8ca9d1" strokeDasharray="3 5"/>
      <g fill="#4787e1" stroke="white" strokeWidth="2">{[[287,212],[330,252],[300,267],[309,287],[307,305],[305,337],[210,322],[184,232]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4"/>)}</g>
      {!compact&&<g fill="#54739f" fontSize="11" fontFamily="Geist, sans-serif"><text x="108" y="293" transform="rotate(-90 108 293)">{t('Visual ramus')}</text><text x="288" y="367">{t('2D profile')}</text></g>}
    </>}
    <g className="guide-focus" key={`${side}-${focus}`} stroke="#337de3" strokeWidth="2.2" fill="none">{paths.map((path,index)=><g key={path} style={{animationDelay:`${index*65}ms`}} className="guide-focus-segment"><polyline points={path}/>{path.split(' ').map((pair,i)=>{const [x,y]=pair.split(',').map(Number);return <circle key={i} cx={x} cy={y} r="4.5" fill="#fff"/>;})}</g>)}</g>
  </svg>;
}
