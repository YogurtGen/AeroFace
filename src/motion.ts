import { useEffect } from 'react';
export function useIntroMotion() {
  useEffect(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const animations:Animation[]=[];
    const entries:[string,number,number][]=[['.site-header',-12,0],['.workspace-topline',10,60],['.page-heading h1',22,90],['.page-description',16,160],['.step-navigation',12,210],['.setup-panel',26,250],['.preview-panel',20,330],['.below-start',12,420]];
    const frame=requestAnimationFrame(()=>{for(const [selector,y,delay]of entries){const element=document.querySelector(selector);if(element)animations.push(element.animate([{opacity:0,transform:`translateY(${y}px)`},{opacity:1,transform:'translateY(0px)'}],{duration:600,delay,easing:'cubic-bezier(0.23, 1, 0.32, 1)',fill:'backwards'}));}});
    const stop=()=>animations.forEach(animation=>animation.cancel());
    window.addEventListener('keydown',stop,{once:true});
    return()=>{cancelAnimationFrame(frame);stop();window.removeEventListener('keydown',stop);};
  },[]);
}
