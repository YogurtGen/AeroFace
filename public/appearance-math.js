(function(root){
  const PIPELINE='aligned-six-view-v1';
  const score=raw=>Math.max(0,Math.min(10,raw*2));
  function summarize(values){
    if(!Array.isArray(values)||values.length!==6||values.some(value=>!Number.isFinite(value)||value<0||value>6))throw new Error('Invalid appearance samples.');
    const sorted=[...values].sort((a,b)=>a-b),raw=(sorted[2]+sorted[3])/2;
    return {raw,score:Math.round(score(raw)*10)/10,pipeline:PIPELINE,samples:values.map(score),sensitivity:{min:Math.round(score(sorted[0])*10)/10,max:Math.round(score(sorted[5])*10)/10}};
  }
  root.AeroFaceAppearance={PIPELINE,summarize};
})(globalThis);
