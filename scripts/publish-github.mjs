import { spawnSync } from 'node:child_process';
const repository='AeroFace', expectedOwner='YogurtGen';
const git=(args, options={})=>{
  const result=spawnSync('git',args,{encoding:'utf8',windowsHide:true,...options});
  if(result.status!==0)throw new Error(`git ${args[0]} failed: ${result.stderr?.replace(/gh[pousr]_[A-Za-z0-9_]+/g,'[redacted]')}`);
  return result.stdout.trim();
};
// Credentials stay in memory and are never written to disk or printed.
const credential=git(['credential','fill'],{input:`protocol=https\nhost=github.com\nusername=${expectedOwner}\n\n`,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
const fields=Object.fromEntries(credential.split(/\r?\n/).map(line=>{const index=line.indexOf('=');return[line.slice(0,index),line.slice(index+1)];}));
if(!fields.password)throw new Error('No existing GitHub credential available.');
const api=async(path,method='GET',body)=>{
  const response=await fetch(`https://api.github.com${path}`,{method,headers:{Authorization:`Bearer ${fields.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const result=response.status===204?null:await response.json();
  if(!response.ok&&response.status!==404)throw new Error(`GitHub ${method} ${path}: ${response.status} ${result?.message||''}`);
  return{status:response.status,data:result};
};
const user=await api('/user');if(user.data?.login!==expectedOwner)throw new Error('Authenticated account does not match the selected GitHub owner.');
const fullname=`${expectedOwner}/${repository}`;
let existing=await api(`/repos/${fullname}`);
if(existing.status===404){existing=await api('/user/repos','POST',{name:repository,description:'Private-by-design facial proportion studio. Local photo analysis, liquid glass UI, and downloadable reports.',private:false,auto_init:false});console.log(`Created https://github.com/${fullname}`);}
if(!existing.data.permissions?.push&&existing.data.owner?.login!==expectedOwner)throw new Error('Repository write permission unavailable.');
let initialized=true;try{git(['rev-parse','--git-dir']);}catch{initialized=false;}
if(!initialized)git(['init','-b','main']);
git(['config','user.name',user.data.name||expectedOwner]);git(['config','user.email',`${user.data.id}+${expectedOwner}@users.noreply.github.com`]);
const remotes=git(['remote']);
if(!remotes.split(/\r?\n/).includes('origin'))git(['remote','add','origin',`https://github.com/${fullname}.git`]);
else if(git(['remote','get-url','origin'])!==`https://github.com/${fullname}.git`)throw new Error('Origin points to a different repository; refusing to change it.');
git(['add','--','.']);
const status=git(['status','--porcelain']);
if(status)git(['commit','-m',process.argv[2]||'Build private local-first AeroFace studio for GitHub Pages']);
git(['push','-u','origin','main'],{env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
console.log(`Pushed ${git(['rev-parse','HEAD'])} to https://github.com/${fullname}`);
let pages=await api(`/repos/${fullname}/pages`);
if(pages.status===404){pages=await api(`/repos/${fullname}/pages`,'POST',{build_type:'workflow'});console.log('Enabled GitHub Pages with GitHub Actions.');}
console.log(`Pages URL: ${pages.data?.html_url||`https://${expectedOwner.toLowerCase()}.github.io/${repository}/`}`);
