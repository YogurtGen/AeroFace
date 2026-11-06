import { useRef, useState } from 'react';
import { calibrationTemplate, fitCalibration, type Calibration } from './calibration';
import { downloadBlob } from './report';
import { useI18n } from './i18n';

export default function CalibrationPanel({profile,onChange,disabled}:{profile:Calibration|null;onChange:(profile:Calibration|null)=>void;disabled:boolean}){
  const {t,language}=useI18n(),input=useRef<HTMLInputElement>(null),[error,setError]=useState(''),[building,setBuilding]=useState(false);
  async function load(file:File){
    setError('');setBuilding(true);
    try{if(file.size>2_000_000)throw new Error('The rating file is too large.');onChange(fitCalibration(await file.text()));}
    catch(error){setError(error instanceof Error?error.message:'Could not read the rating file.');}
    finally{setBuilding(false);}
  }
  const number=(value:number)=>value.toLocaleString(language==='id'?'id-ID':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return <div className="settings-section calibration-panel"><h3>{t('Consensus calibration')}</h3>
    <p>{t('Learn a score mapping from average human ratings, entirely on this device. Requires 30 training people, 15 separate validation people, and at least 3 raters per photo. Names and photos are not needed in the CSV.')}</p>
    <p className="calibration-status">{profile?t('A local calibration is active for this session.'):t('No consensus calibration loaded. The base AI estimate is in use.')}</p>
    {profile&&<dl><div><dt>{t('Validation MAE')}</dt><dd>{number(profile.maeBefore)} → {number(profile.maeAfter)}</dd></div><div><dt>{t('Validation people')}</dt><dd>{profile.validationPeople}</dd></div></dl>}
    <div className="calibration-actions"><button className="secondary-button" disabled={disabled||building} onClick={()=>downloadBlob(new Blob([calibrationTemplate],{type:'text/csv'}),'AeroFace-consensus-template.csv')}>{t('CSV template')}</button><button className="secondary-button" disabled={disabled||building} onClick={()=>input.current?.click()}>{t(building?'Preparing…':'Import ratings CSV')}</button>{profile&&<button className="text-button" disabled={disabled||building} onClick={()=>{onChange(null);setError('');}}>{t('Remove calibration')}</button>}</div>
    <input ref={input} className="sr-only" tabIndex={-1} type="file" accept=".csv,text/csv" aria-label={t('Import ratings CSV')} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void load(file);}}/>
    {error&&<p className="calibration-error" role="alert">{t(error)}</p>}
    <p>{t('A file is accepted only when its separate validation error improves. This does not establish population accuracy. Outside the reference range, the base estimate is used. Nothing is saved after this tab closes.')}</p>
    <a className="external-link" href="https://github.com/YogurtGen/AeroFace/blob/main/docs/calibration.md" target="_blank" rel="noreferrer">{t('How to collect consensus ratings')}</a>
  </div>;
}
