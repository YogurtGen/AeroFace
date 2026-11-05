import { useI18n } from './i18n';
import type { Side } from './analysis';
export default function Illustration({ side = 'front', focus = 'balance' }: { side?: Side; focus?: 'balance'|'eyes'|'jaw' }) {
  const { t } = useI18n();
  const paths = side==='front' ? (focus==='eyes'?['146,218 193,218','193,218 247,218','247,218 294,218']:focus==='jaw'?['132,257 308,257','151,307 289,307']:['220,107 220,373','146,218 294,218']) : (focus==='eyes'?['322,251 254,365','289,294 281,315']:focus==='jaw'?['175,228 183,315','183,315 254,365']:['281,197 293,269 254,365']);

  return <svg className="face-illustration" viewBox="0 0 440 490" fill="none" aria-label={t(side==='front'?'Front face guide illustration':'Side face guide illustration')} role="img">
    <defs>
      <linearGradient id="head" x1="115" y1="110" x2="340" y2="370" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset=".5" stopColor="#dce2eb"/><stop offset="1" stopColor="#bdc8d7"/></linearGradient>
      <linearGradient id="neck" x1="130" y1="400" x2="290" y2="460"><stop stopColor="#dae0e9"/><stop offset=".5" stopColor="#f8faff"/><stop offset="1" stopColor="#c5cfdd"/></linearGradient>
      <radialGradient id="orb"><stop stopColor="#e1ebfa"/><stop offset="1" stopColor="#f2f5fa" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="220" cy="270" rx="215" ry="215" fill="url(#orb)"/>
    <ellipse cx="220" cy="448" rx="126" ry="13" fill="#c4cddd" opacity=".18"/>
    {side === 'front' ? <>
      <path d="M177 331v54c-20 15-53 25-67 53 61 26 159 26 220 0-16-29-47-38-67-53v-54" fill="url(#neck)"/>
      <path d="M126 216c-17-14-24 6-17 34 3 15 12 26 24 23M314 216c17-14 24 6 17 34-3 15-12 26-24 23" fill="#d3dbe7" stroke="#bdc8d8"/>
      <path d="M220 70c-64 0-104 46-99 117l11 84c7 57 50 96 88 101 38-5 81-44 88-101l11-84c5-71-35-117-99-117Z" fill="url(#head)" stroke="#c7d0df"/>
      <path d="M140 200c18-12 40-12 59-1M241 199c19-11 41-11 59 1" stroke="#a7b5c8" strokeWidth="3" strokeLinecap="round"/>
      <path d="M146 218c14-10 34-10 47 0-13 11-33 11-47 0ZM247 218c13-10 33-10 47 0-14 11-34 11-47 0Z" fill="#eaf0f7" stroke="#a6b4c8" strokeWidth="1.5"/>
      <ellipse cx="171" cy="219" rx="6" ry="7" fill="#9aaac1"/><ellipse cx="269" cy="219" rx="6" ry="7" fill="#9aaac1"/>
      <path d="m220 222-13 49c6 7 20 7 26 0M203 285c10 4 24 4 34 0M185 307c23-11 47-11 70 0-23 15-47 15-70 0Z" stroke="#aebbcf" strokeWidth="1.5"/>
      <path d="M144 252c11 32 27 58 48 75M296 252c-11 32-27 58-48 75M220 82v274" stroke="#fff" strokeOpacity=".65"/>
      <g stroke="#5b8dd8" strokeWidth="1" opacity=".75"><path d="M146 218h148M132 257h176M151 307h138M220 107v266M146 218l74 67 74-67M132 257l88 99 88-99M151 307l69-22 69 22"/></g>
      <g fill="#4787e1" stroke="white" strokeWidth="2">{[[146,218],[193,218],[247,218],[294,218],[132,257],[308,257],[151,307],[289,307],[220,285],[220,356]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4"/>)}</g>
      <path d="M91 218h37M91 218v139h112M327 218h23v67h-99" stroke="#8ca9d1" strokeDasharray="3 5"/>
      <g fill="#54739f" fontSize="11" fontFamily="Geist, sans-serif"><text x="64" y="292" transform="rotate(-90 64 292)">{t('Face proportions')}</text><text x="291" y="203">{t('Eye line')}</text></g>
    </> : <>
      <path d="M174 329v56c-31 16-54 31-67 55 63 24 151 24 215 0-17-28-50-41-70-55v-50" fill="url(#neck)"/>
      <path d="M172 87c66-27 112 16 118 65l-9 45 20 34 21 20c4 7-5 16-29 18l-7 20 9 14-8 14 6 19-15 17-24 12-37 1-43-31-32-39c-14-20-22-56-24-92-2-58 11-101 54-117Z" fill="url(#head)" stroke="#c7d0df"/>
      <path d="M270 208c8-5 17-4 23 1M275 222h18M284 289l9 1M278 316l10 1M175 228c-12-12-31-2-28 17 1 13 15 29 26 20" stroke="#a6b4c8" strokeWidth="2" strokeLinecap="round"/>
      <g stroke="#5b8dd8" strokeWidth="1.5"><path d="m175 228 8 87 71 50M281 197l12 72-39 96M322 251l-68 114M293 269l-10 32-29 64"/></g>
      <path d="M148 315h35v-36M183 315h-64M254 365h91v-114h-23" stroke="#8ca9d1" strokeDasharray="3 5"/>
      <g fill="#4787e1" stroke="white" strokeWidth="2">{[[281,197],[322,251],[293,269],[289,294],[287,314],[254,365],[183,315],[175,228]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4"/>)}</g>
      <g fill="#54739f" fontSize="11" fontFamily="Geist, sans-serif"><text x="86" y="293" transform="rotate(-90 86 293)">{t('Visual ramus')}</text><text x="294" y="389">{t('2D profile')}</text></g>
    </>}
    <g className="guide-focus" key={`${side}-${focus}`} stroke="#337de3" strokeWidth="2.2" fill="none">{paths.map((path,index)=><g key={path} style={{animationDelay:`${index*65}ms`}} className="guide-focus-segment"><polyline points={path}/>{path.split(' ').map((pair,i)=>{const [x,y]=pair.split(',').map(Number);return <circle key={i} cx={x} cy={y} r="4.5" fill="#fff"/>;})}</g>)}</g>
  </svg>;
}
